import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {testServer} from './server-smoke.mjs';
import {newAnalytics,makeReport} from '../src/reporting.ts';
const prod=await testServer({APP_ENV:'prod'});
let dev;
const exec=promisify(execFile);
try {
 dev=await testServer({APP_ENV:'dev'});
 const post=(server,path,body)=>fetch(server.base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.notEqual(prod.data,dev.data);
 for(const [server,name] of [[prod,'prod'],[dev,'dev']]) {
  assert.deepEqual(await(await fetch(server.base+'/api/environment')).json(),{environment:name});
  assert.equal(await readFile(join(server.data,'.app-environment'),'utf8'),name);
 }
 const code=await readFile(join(prod.data,'setup-code'),'utf8');
 assert.notEqual(code,await readFile(join(dev.data,'setup-code'),'utf8'));
 assert.equal((await post(prod,'/api/teacher/setup',{code,username:'prod-teacher',password:'Prod-test-password-2026'})).status,201);
 assert.equal((await(await fetch(dev.base+'/api/teacher/status')).json()).configured,false);
 const prodLogin=await post(prod,'/api/teacher/login',{username:'prod-teacher',password:'Prod-test-password-2026'});
 const prodCookie=prodLogin.headers.get('set-cookie').split(';')[0];
 assert.equal((await fetch(dev.base+'/api/teacher/reports',{headers:{Cookie:prodCookie}})).status,401);
 const student=await(await post(prod,'/api/student/session',{})).json();
 const analytics=newAnalytics();analytics.fullName='Production test fixture';
 const report=makeReport({analytics,learning:{baseline:null,final:null}},true);
 const send=(server)=>fetch(server.base+`/api/student/reports/${student.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${student.token}`},body:JSON.stringify({report,revision:1})});
 assert.equal((await send(prod)).status,200);assert.equal((await send(dev)).status,401);
 const devCode=await readFile(join(dev.data,'setup-code'),'utf8');
 assert.equal((await post(dev,'/api/teacher/setup',{code:devCode,username:'dev-teacher',password:'Dev-test-password-2026'})).status,201);
 const devLogin=await post(dev,'/api/teacher/login',{username:'dev-teacher',password:'Dev-test-password-2026'});
 const devCookie=devLogin.headers.get('set-cookie').split(';')[0];
 assert.ok(devCookie.startsWith('teacher_session_dev='));assert.ok(prodCookie.startsWith('teacher_session='));
 assert.equal((await(await fetch(dev.base+'/api/teacher/reports',{headers:{Cookie:devCookie}})).json()).total,0);
 async function refused(data,appEnv,pattern) {
  await assert.rejects(exec(process.execPath,['server/app.mjs'],{env:{...process.env,DATA_DIR:data,APP_ENV:appEnv,PORT:'0'},timeout:3000}),error=>error.code===1 && pattern.test(error.stderr));
 }
 await refused(prod.data,'dev',/another environment/);
 await refused(dev.data,'prod',/another environment/);
 const legacy=await mkdtemp(join(tmpdir(),'chrt-legacy-'));
 try {
  await writeFile(join(legacy,'results.sqlite'),'legacy fixture: do not overwrite');
  await refused(legacy,'dev',/unmarked database/);
  assert.equal(await readFile(join(legacy,'results.sqlite'),'utf8'),'legacy fixture: do not overwrite');
 }finally{await rm(legacy,{recursive:true,force:true});}
 await prod.restart();await dev.restart();
 assert.equal((await(await fetch(prod.base+'/api/teacher/reports',{headers:{Cookie:prodCookie}})).json()).total,1);
 assert.equal((await(await fetch(dev.base+'/api/teacher/reports',{headers:{Cookie:devCookie}})).json()).total,0);
 console.log('PASS: separate prod/dev databases and accounts, cross-environment cookies/tokens rejected, shared/legacy database protection, independent results survive restarts');
}finally{if(dev)await dev.close();await prod.close();}
