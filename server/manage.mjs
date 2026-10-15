import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const dir=resolve(process.env.DATA_DIR || './data');
const file=join(dir,'setup-code');
if(process.argv[2]==='setup-code') {
 if(!existsSync(file)){console.error('Первоначальная настройка уже завершена либо сервер ещё не запускался.');process.exitCode=1;}
 else console.log(readFileSync(file,'utf8').trim());
} else if(process.argv[2]==='reset-login' && process.argv[3]==='--confirm') {
 const db=new DatabaseSync(join(dir,'results.sqlite'));db.exec('PRAGMA busy_timeout=5000; BEGIN; DELETE FROM teacher_sessions; DELETE FROM admin; COMMIT;');db.close();
 writeFileSync(file,randomBytes(24).toString('base64url'),{mode:0o600});
 console.log('Вход преподавателя сброшен; результаты сохранены. Получите новый код командой setup-code.');
} else {
 console.error('Usage: node server/manage.mjs setup-code | reset-login --confirm');process.exitCode=1;
}
