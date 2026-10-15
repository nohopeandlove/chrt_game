import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { testServer } from './server-smoke.mjs';
const code = randomBytes(24).toString('base64url');
const server = await testServer({ TEACHER_SETUP_CODE: code });
try {
 const file = join(server.data,'setup-code');
 assert.equal(await readFile(file,'utf8'), code);
 // Existing deployments already have an inaccessible generated bootstrap file.
 await writeFile(file,'previous-generated-code');
 await server.restart();
 assert.equal(await readFile(file,'utf8'),code);
 const post = (path,body) => fetch(server.base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const credentials={username:'hosting-teacher',password:'Temporary-test-password-2026'};
 assert.equal((await post('/api/teacher/setup',{code:'previous-generated-code',...credentials})).status,403);
 assert.equal((await post('/api/teacher/setup',{code,...credentials})).status,201);
 await assert.rejects(readFile(file));
 // Keeping the secret configured must never reopen setup or reset credentials.
 await server.restart();
 await assert.rejects(readFile(file));
 assert.equal((await post('/api/teacher/setup',{code,...credentials})).status,409);
 assert.equal((await post('/api/teacher/login',credentials)).status,200);
 for (const path of ['/', '/teacher/', '/api/teacher/status','/api/health']) {
  assert.ok(!(await (await fetch(server.base+path)).text()).includes(code));
 }
 console.log('PASS: secret runtime setup replaces old code, rejects old code, works once, remains closed across restart and is not in public responses');
} finally { await server.close(); }
