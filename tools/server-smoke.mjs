import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import net from 'node:net';
import { once } from 'node:events';

export async function testServer(extraEnv = {}) {
 const data=await mkdtemp(join(tmpdir(),'chrt-server-test-'));
 const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const base=`http://127.0.0.1:${port}`;let processHandle;
 async function start(){
  processHandle=spawn(process.execPath,['server/app.mjs'],{cwd:resolve('.'),env:{...process.env,APP_ENV:'prod',TEACHER_SETUP_CODE:undefined,TEACHER_RESET_CODE:undefined,...extraEnv,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:data},stdio:['ignore','pipe','pipe']});
  let diagnostic='';processHandle.stderr.on('data',chunk=>{diagnostic+=chunk});
  for(let i=0;i<100;i++){try{const r=await fetch(base+'/api/health');if(r.ok)return;}catch{}if(processHandle.exitCode!==null)throw Error('Server failed: '+diagnostic);await new Promise(r=>setTimeout(r,50));}
  throw Error('Server startup timed out.');
 }
 async function stop(){if(processHandle && processHandle.exitCode===null){processHandle.kill('SIGTERM');await once(processHandle,'exit');}}
 await start();return {base,data,restart:async()=>{await stop();await start()},close:async()=>{await stop();await rm(data,{recursive:true,force:true})}};
}

if(process.argv[1]===resolve('tools/server-smoke.mjs')) {
 const server=await testServer();
 try {
  const {base,data}=server;
  const call=async(path,{method='GET',body,cookie,token,origin}={})=>fetch(base+path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:`Bearer ${token}`} : {}),...(origin?{Origin:origin}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  assert.equal((await call('/teacher/')).status,200);assert.equal((await call('/data/results.sqlite')).status,404);
  for(const path of ['/api/teacher/reports','/api/teacher/export.csv','/api/teacher/reports/unknown'])assert.equal((await call(path)).status,401);
  const code=(await readFile(join(data,'setup-code'),'utf8')).trim();
  assert.equal((await call('/api/teacher/setup',{method:'POST',body:{code:'wrong'}})).status,403);
  const credentials={username:'test-teacher',password:'Test-only-password-2026'};
  assert.equal((await call('/api/teacher/setup',{method:'POST',body:{code,...credentials}})).status,201);
  assert.equal((await call('/api/teacher/setup',{method:'POST',body:{code,...credentials}})).status,409);
  await assert.rejects(readFile(join(data,'setup-code')));
  assert.equal((await call('/api/teacher/login',{method:'POST',body:{...credentials,password:'wrong'}})).status,401);
  assert.equal((await call('/api/teacher/login',{method:'POST',body:credentials,origin:'https://wrong.example'})).status,403);
  const login=await call('/api/teacher/login',{method:'POST',body:credentials});assert.equal(login.status,200);const setCookie=login.headers.get('set-cookie');assert.ok(setCookie.includes('HttpOnly'));assert.ok(setCookie.includes('SameSite=Strict'));const cookie=setCookie.split(';')[0];
  const student=await(await call('/api/student/session',{method:'POST',body:{}})).json();const other=await(await call('/api/student/session',{method:'POST',body:{}})).json();
  const report={format:'ya-specialist-report-v2',generatedAt:new Date().toISOString(),diagnostics:{baseline:1,final:null,finalForm:'transfer-v2'},analytics:{sessionId:'client-id',startedAt:new Date().toISOString(),finishedAt:null,fullName:'Студент А',group:'ИС-21',events:[{at:new Date().toISOString(),category:'jobs',question:'Вакансия',answer:'Не указано секретное слово',correct:false,feedback:'Перечитайте требования'}],outcomes:[{at:new Date().toISOString(),category:'test',earned:2,possible:4}]},resume:{private:'Never send'}};
  const path=`/api/student/reports/${student.id}`;
  assert.equal((await call(path,{method:'PUT',token:other.token,body:{report,revision:1}})).status,401);
  assert.equal((await call(path,{method:'PUT',token:student.token,body:{report,revision:1}})).status,200);
  assert.equal((await call('/api/teacher/reports',{token:student.token})).status,401);
  assert.equal((await call(path,{method:'GET',token:student.token})).status,404);
  const bad=structuredClone(report);bad.analytics.outcomes[0].earned=99;
  assert.equal((await call(path,{method:'PUT',token:student.token,body:{report:bad,revision:2}})).status,400);
  assert.equal((await call(path,{method:'PUT',token:student.token,body:{report,revision:1}})).status,409);
  const list=await(await call('/api/teacher/reports?group='+encodeURIComponent('ИС-21'),{cookie})).json();assert.equal(list.total,1);assert.equal(list.items[0].fullName,'Студент А');
  assert.equal((await(await call('/api/teacher/reports?group=other',{cookie})).json()).total,0);
  const stored=await(await call(`/api/teacher/reports/${student.id}`,{cookie})).json();assert.equal(stored.analytics.sessionId,student.id);assert.ok(!stored.resume);
  const csv=await(await call('/api/teacher/export.csv',{cookie})).text();assert.ok(csv.includes('Студент А'));assert.ok(csv.includes('Не указано секретное слово'));
  await server.restart();assert.equal((await(await call('/api/teacher/reports',{cookie})).json()).total,1);
  assert.equal((await call('/api/teacher/logout',{method:'POST',body:{},cookie})).status,200);assert.equal((await call('/api/teacher/reports',{cookie})).status,401);
  console.log('PASS: teacher setup/auth/logout, protected reports and CSV, student ownership, validation, revision guards, private-field stripping, filtering and SQLite persistence across restart');
 }finally{await server.close()}
}
