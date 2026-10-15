import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, timingSafeEqual, scryptSync } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync, statSync, createReadStream } from 'node:fs';
import { resolve, join, extname, sep, posix } from 'node:path';
import { parseReport, reportsCsv } from '../src/reporting.ts';

const dataDir = resolve(process.env.DATA_DIR || './data');
const webRoot = resolve(process.env.DIST_DIR || './dist');
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(join(dataDir, 'results.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS teacher_sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, report TEXT, updated_at TEXT, revision INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS students_updated ON students(updated_at);`);
if (!db.prepare('PRAGMA table_info(students)').all().some(c=>c.name==='name_search')) db.exec("ALTER TABLE students ADD COLUMN name_search TEXT NOT NULL DEFAULT ''");
for(const row of db.prepare("SELECT id,report FROM students WHERE report IS NOT NULL AND name_search=''").all()) db.prepare('UPDATE students SET name_search=? WHERE id=?').run(JSON.parse(row.report).analytics.fullName.toLowerCase(),row.id);
const setupFile = join(dataDir, 'setup-code');
// Managed hosting can supply the private bootstrap code at runtime, without a shell.
// It can replace an inaccessible generated code, but never an existing account.
if (!db.prepare('SELECT id FROM admin').get()) {
 const suppliedCode = process.env.TEACHER_SETUP_CODE;
 if (suppliedCode !== undefined) {
  if (!/^[A-Za-z0-9_-]{24,256}$/.test(suppliedCode)) throw new Error('TEACHER_SETUP_CODE must contain 24–256 letters, digits, underscores or hyphens.');
  writeFileSync(setupFile, suppliedCode, { mode: 0o600 });
 } else if (!existsSync(setupFile)) writeFileSync(setupFile, randomBytes(24).toString('base64url'), { mode: 0o600 });
}
delete process.env.TEACHER_SETUP_CODE;
const hash = value => createHash('sha256').update(value).digest('hex');
const equal = (a,b) => timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
const token = () => randomBytes(32).toString('base64url');
const sessions = db.prepare('SELECT expires FROM teacher_sessions WHERE hash=?');
const secureCookie = process.env.COOKIE_SECURE === 'true';
const cookie = (value,age) => `teacher_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secureCookie ? '; Secure' : ''}`;
const legacyCookie = 'teacher_session=; Path=/api/teacher; HttpOnly; SameSite=Strict; Max-Age=0';
const attempts = new Map();
function limited(req, scope, max, duration) {
 const key = scope + ':' + req.socket.remoteAddress; const current = attempts.get(key);
 if (!current || current.until < Date.now()) { attempts.set(key,{count:1,until:Date.now()+duration}); return; }
 if (++current.count > max) throw new Failure(429,'Слишком много запросов. Попробуйте позже.');
 if (attempts.size > 10000) for (const [key,value] of attempts) if(value.until < Date.now()) attempts.delete(key);
}
class Failure extends Error { constructor(status,message) { super(message); this.status=status; } }
function json(res,status,value,headers={}) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value)); }
function body(req) {
 if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new Failure(415,'Ожидается JSON.');
 return new Promise((resolve,reject)=>{
  let size=0;const chunks=[];let failed=false;
  req.on('data',chunk=>{size+=chunk.length;if(size>2_000_000){if(!failed){failed=true;reject(new Failure(413,'Слишком большой отчёт.'));}return;}if(!failed)chunks.push(chunk);});
  req.on('end',()=>{if(failed)return;try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(new Failure(400,'Неверный JSON.'));}});
  req.on('error',()=>reject(new Failure(400,'Ошибка чтения запроса.')));
 });
}
function teacher(req) {
 const raw = (req.headers.cookie || '').split(';').map(v=>v.trim()).find(v=>v.startsWith('teacher_session='))?.split('=')[1] || '';
 const session=sessions.get(hash(raw));
 if(!session || session.expires < Date.now()) throw new Failure(401,'Войдите как преподаватель.');
 return hash(raw);
}
function queryFilter(url) {
 const group=(url.searchParams.get('group') || '').slice(0,40);
 const q=(url.searchParams.get('q') || '').slice(0,100);
 return { sql:"report IS NOT NULL AND (?='' OR json_extract(report,'$.analytics.group')=?) AND (?='' OR instr(name_search,?)>0)",args:[group,group,q,q.toLowerCase()] };
}
async function api(req,res,url) {
 if(!['GET','HEAD'].includes(req.method)) {
  const origin=req.headers.origin;
  if(origin) {let host;try{host=new URL(origin).host;}catch{throw new Failure(403,'Недопустимый источник запроса.');}if(host!==req.headers.host)throw new Failure(403,'Недопустимый источник запроса.');}
 }
 if(url.pathname==='/api/health' && req.method==='GET') return json(res,200,{ok:true});
 if(url.pathname==='/api/teacher/status' && req.method==='GET') {
  let authenticated=false;try{teacher(req);authenticated=true;}catch{}
  return json(res,200,{configured:!!db.prepare('SELECT id FROM admin').get(),authenticated});
 }
 if(url.pathname==='/api/teacher/setup' && req.method==='POST') {
  limited(req,'setup',10,15*60_000);
  if(db.prepare('SELECT id FROM admin').get())throw new Failure(409,'Учётная запись уже настроена.');
  const input=await body(req);
  if(typeof input?.code!=='string' || !existsSync(setupFile) || !equal(input.code,readFileSync(setupFile,'utf8').trim()))throw new Failure(403,'Неверный код первоначальной настройки.');
  if(typeof input.username!=='string'||!/^[a-zA-Z0-9_.-]{3,40}$/.test(input.username)||typeof input.password!=='string'||input.password.length<12||input.password.length>128)throw new Failure(400,'Логин: 3–40 латинских символов. Пароль: 12–128 символов.');
  const salt=randomBytes(16).toString('hex');
  db.prepare('INSERT INTO admin VALUES (1,?,?,?)').run(input.username,salt,scryptSync(input.password,salt,64).toString('hex'));
  unlinkSync(setupFile);return json(res,201,{ok:true});
 }
 if(url.pathname==='/api/teacher/login' && req.method==='POST') {
  limited(req,'login',10,15*60_000);const input=await body(req);const admin=db.prepare('SELECT * FROM admin WHERE id=1').get();
  if(typeof input?.password!=='string' || input.password.length>128)throw new Failure(401,'Неверный логин или пароль.');
  const password=input.password;
  const supplied=scryptSync(password,admin?.salt || 'unconfigured',64).toString('hex');
  if(!admin || input?.username!==admin.username || !equal(supplied,admin.password_hash))throw new Failure(401,'Неверный логин или пароль.');
  const value=token();db.prepare('DELETE FROM teacher_sessions WHERE expires < ?').run(Date.now());
  db.prepare('INSERT INTO teacher_sessions VALUES (?,?)').run(hash(value),Date.now()+8*60*60_000);
  return json(res,200,{ok:true},{'Set-Cookie':[cookie(value,8*60*60),legacyCookie]});
 }
 if(url.pathname==='/api/teacher/logout' && req.method==='POST') {const session=teacher(req);db.prepare('DELETE FROM teacher_sessions WHERE hash=?').run(session);return json(res,200,{ok:true},{'Set-Cookie':[cookie('',0),legacyCookie]});}
 if(url.pathname==='/api/student/session' && req.method==='POST') {
  limited(req,'student-session',300,10*60_000);await body(req);
  const id=crypto.randomUUID(),value=token();db.prepare('INSERT INTO students (id,token_hash) VALUES (?,?)').run(id,hash(value));
  return json(res,201,{id,token:value});
 }
 const studentMatch=/^\/api\/student\/reports\/([a-zA-Z0-9-]{1,80})$/.exec(url.pathname);
 if(studentMatch && req.method==='PUT') {
  const row=db.prepare('SELECT token_hash,revision FROM students WHERE id=?').get(studentMatch[1]);
  const bearer=req.headers.authorization?.replace(/^Bearer /,'') || '';
  if(!row || !equal(hash(bearer),row.token_hash))throw new Failure(401,'Недействительная сессия студента.');
  const input=await body(req);
  if(!Number.isSafeInteger(input?.revision)||input.revision<1)throw new Failure(400,'Неверная версия отчёта.');
  let report;try{report=parseReport(JSON.stringify(input.report));}catch{throw new Failure(400,'Некорректные результаты.');}
  report.analytics.sessionId=studentMatch[1];
  const current=db.prepare('SELECT revision FROM students WHERE id=?').get(studentMatch[1]);
  if(input.revision<=current.revision)return json(res,409,{error:'Версия устарела.',revision:current.revision});
  if(input.revision>row.revision)db.prepare('UPDATE students SET report=?, updated_at=?, revision=?, name_search=? WHERE id=?').run(JSON.stringify(report),new Date().toISOString(),input.revision,report.analytics.fullName.toLowerCase(),studentMatch[1]);
  return json(res,200,{ok:true,revision:input.revision});
 }
 if(url.pathname.startsWith('/api/teacher/')) {
  teacher(req);
  if(url.pathname==='/api/teacher/reports' && req.method==='GET') {
   const offset=Math.max(0,Math.min(1_000_000,Number(url.searchParams.get('offset'))||0));const filter=queryFilter(url);
   const rows=db.prepare(`SELECT id,updated_at,report FROM students WHERE ${filter.sql} ORDER BY updated_at DESC LIMIT 50 OFFSET ?`).all(...filter.args,offset);
   const count=db.prepare(`SELECT count(*) AS count FROM students WHERE ${filter.sql}`).get(...filter.args).count;
   return json(res,200,{total:count,offset,items:rows.map(row=>{const r=JSON.parse(row.report);return {id:row.id,updatedAt:row.updated_at,fullName:r.analytics.fullName,group:r.analytics.group,startedAt:r.analytics.startedAt,finishedAt:r.analytics.finishedAt,outcomes:r.analytics.outcomes,diagnostics:r.diagnostics};})});
  }
  if(url.pathname==='/api/teacher/export.csv' && req.method==='GET') {
   const filter=queryFilter(url);res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="ya-specialist-group.csv"','Cache-Control':'no-store'});
   res.write(reportsCsv([])+'\r\n');
   for(const row of db.prepare(`SELECT report FROM students WHERE ${filter.sql} ORDER BY updated_at DESC`).iterate(...filter.args)) {
    const csv=reportsCsv([JSON.parse(row.report)]);const line=csv.slice(csv.indexOf('\r\n')+2)+'\r\n';
    if(res.destroyed)break;
    if(!res.write(line))await new Promise(resolve=>{
      const done=()=>{res.off('drain',done);res.off('close',done);res.off('error',done);resolve();};
      res.once('drain',done);res.once('close',done);res.once('error',done);
    });
    if(res.destroyed)break;
   }
   return res.end();
  }
  const match=/^\/api\/teacher\/reports\/([a-zA-Z0-9-]{1,80})$/.exec(url.pathname);
  if(match && req.method==='GET') {const row=db.prepare('SELECT report FROM students WHERE id=?').get(match[1]);if(!row?.report)throw new Failure(404,'Отчёт не найден.');return json(res,200,JSON.parse(row.report));}
 }
 throw new Failure(404,'Не найдено.');
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/'))return await api(req,res,url);
  if(!['GET','HEAD'].includes(req.method))throw new Failure(405,'Метод не поддерживается.');
  if(url.pathname==='/about'){res.writeHead(302,{Location:'/about/'});return res.end();}
  if(url.pathname==='/teacher'){res.writeHead(302,{Location:'/teacher/'});return res.end();}
  const path=posix.normalize(decodeURIComponent(url.pathname));
  if(path === '/materials' || path.startsWith('/materials/')) {
   if(!/^\/materials\/(methodical|criteria|analytics)\/(index\.html)?$/.test(path)) throw new Failure(404,'Страница не найдена.');
   try { teacher(req); } catch { res.writeHead(302,{Location:'/teacher/','Cache-Control':'no-store'});return res.end(); }
  }
  const file=resolve(webRoot,'.'+(path.endsWith('/')?path+'index.html':path));
  if(!file.startsWith(webRoot+sep)||!existsSync(file)||!statSync(file).isFile())throw new Failure(404,'Страница не найдена.');
  res.writeHead(200,{'Content-Type':mime[extname(file)] || 'application/octet-stream','Cache-Control':path.startsWith('/materials/')?'no-store':extname(file)==='.html'?'no-cache':'public, max-age=3600'});
  if(req.method==='HEAD')return res.end();createReadStream(file).pipe(res);
 } catch(error){if(!res.headersSent)json(res,error instanceof Failure?error.status:500,{error:error instanceof Failure?error.message:'Ошибка сервера.'});else res.end();}
});
server.requestTimeout=30_000;server.headersTimeout=15_000;
server.listen(Number(process.env.PORT || 3000),process.env.HOST || '0.0.0.0',()=>console.log('Game server ready. Teacher page: /teacher/. Setup: node server/manage.mjs setup-code'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0)}));
