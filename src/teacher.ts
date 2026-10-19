import { installEnvironmentBadge } from './environment.ts';
import './styles.css';
import { analyticsHtml, latest, percentage, taskNames } from './reporting.ts';
import type { StudentReport } from './reporting.ts';
import type { TaskCategory, TaskOutcome } from './types.ts';
import { escapeHtml as esc } from './screens/shared.ts';

const root=document.getElementById('teacher-app')!;
const environmentHost=document.createElement('aside');
root.before(environmentHost);void installEnvironmentBadge(environmentHost);
type Row={id:string;updatedAt:string;fullName:string;group:string;startedAt:string;finishedAt:string|null;outcomes:TaskOutcome[];diagnostics:StudentReport['diagnostics']};
let filter={group:'',q:'',offset:0};
let page=0;
let refresh:ReturnType<typeof setInterval>|undefined;
const expanded=new Set<string>();
let pendingDelete:string|null=null;
let deleting=false;
let tableSignature='';
async function request<T>(url:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers},cache:'no-store'});
  const data=await response.json() as T & {error?:string};
  if(response.status===401 && !url.endsWith('/login')){void start();throw new Error('Сессия завершена. Войдите снова.');}
  if(!response.ok)throw new Error(data.error || 'Ошибка запроса.');return data;
}
function showError(host:HTMLElement,error:unknown):void{host.textContent=error instanceof Error?error.message:'Не удалось связаться с сервером.';}
async function start():Promise<void>{
  clearInterval(refresh);page++;const current=page;
  try{
    const status=await request<{configured:boolean;authenticated:boolean}>('/api/teacher/status');if(current!==page)return;
    if(status.configured && location.hash==='#reset-password'){history.replaceState(null,'',location.pathname+location.search);passwordReset();return;}
    if(status.authenticated){await cabinet();return;}
    const setup=!status.configured;
    root.innerHTML=`<section class="teacher-login"><span class="screen__eyebrow">Я — специалист</span><h1>${setup?'Настройка преподавателя':'Вход преподавателя'}</h1><p>Отдельная страница с автоматически сохранёнными результатами студентов.</p>
      ${setup?'<p>Введите одноразовый код, полученный от администратора приложения. После создания учётной записи код больше не действует.</p>':''}
      <form data-login>${setup?'<label class="field"><span>Одноразовый код настройки</span><input class="input" name="code" autocomplete="off" required></label>':''}<label class="field"><span>Логин</span><input class="input" name="username" autocomplete="username" minlength="3" maxlength="40" pattern="[a-zA-Z0-9_.-]+" required></label><label class="field"><span>Пароль${setup?' (не менее 12 символов)':''}</span><input class="input" name="password" type="password" autocomplete="${setup?'new-password':'current-password'}" ${setup?'minlength="12"':''} maxlength="128" required></label><button class="btn btn--primary" type="submit">${setup?'Создать учётную запись':'Войти'}</button><p role="alert" data-error></p></form><a href="/">Открыть игру</a></section>`;
    root.querySelector('form')?.addEventListener('submit',async event=>{
      event.preventDefault();const form=event.currentTarget as HTMLFormElement;if(!form.reportValidity())return;
      const button=form.querySelector<HTMLButtonElement>('button')!;button.disabled=true;
      const data=Object.fromEntries(new FormData(form));
      try{if(setup)await request('/api/teacher/setup',{method:'POST',body:JSON.stringify(data)});
        await request('/api/teacher/login',{method:'POST',body:JSON.stringify({username:data.username,password:data.password})});await start();
      }catch(error){showError(form.querySelector('[data-error]')!,error);button.disabled=false;}
    });
  }catch(error){if(current===page){root.innerHTML='<section class="teacher-login"><h1>Кабинет временно недоступен</h1><p role="alert" data-error></p><button class="btn" data-retry>Повторить</button></section>';showError(root.querySelector('[data-error]')!,error);root.querySelector('[data-retry]')?.addEventListener('click',()=>void start());}}
}
function passwordReset():void {
 clearInterval(refresh);page++;
 root.innerHTML=`<section class="teacher-login"><h1>Сброс пароля преподавателя</h1><p>Введите одноразовый код от администратора и новый пароль. Логин и результаты студентов сохранятся. После сброса потребуется войти заново на всех устройствах.</p><form data-password-reset><label class="field"><span>Одноразовый код сброса</span><input class="input" name="code" type="password" autocomplete="off" maxlength="256" required></label><label class="field"><span>Новый пароль (не менее 12 символов)</span><input class="input" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><label class="field"><span>Повторите новый пароль</span><input class="input" name="confirmation" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><button class="btn btn--primary" type="submit">Установить новый пароль</button><p role="alert" data-error></p></form><button class="btn" type="button" data-back>Назад</button></section>`;
 root.querySelector('[data-back]')?.addEventListener('click',()=>void start());
 root.querySelector('form')!.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget as HTMLFormElement;if(!form.reportValidity())return;
  const data=new FormData(form);const error=form.querySelector<HTMLElement>('[data-error]')!;
  if(data.get('password')!==data.get('confirmation')){error.textContent='Пароли не совпадают.';return;}
  const button=form.querySelector<HTMLButtonElement>('button')!;button.disabled=true;
  try {
   await request('/api/teacher/reset-password',{method:'POST',body:JSON.stringify({code:data.get('code'),password:data.get('password')})});
   root.innerHTML='<section class="teacher-login"><h1>Пароль изменён</h1><p>Войдите с прежним логином и новым паролем. Результаты студентов сохранены.</p><button class="btn btn--primary" data-login-again>Перейти ко входу</button></section>';
   root.querySelector('[data-login-again]')!.addEventListener('click',()=>void start());
  } catch(e){showError(error,e);button.disabled=false;}
 });
}
async function cabinet():Promise<void>{
  const current=page;expanded.clear();pendingDelete=null;tableSignature='';
  root.innerHTML=`<header class="teacher-head"><div><span class="screen__eyebrow">Я — специалист</span><h1>Результаты студентов</h1><p>Результаты поступают автоматически. Обновление каждые 10 секунд.</p></div><div class="learning-actions"><a class="btn" href="/">Открыть игру</a><a class="btn" href="/about/">Об электронном образовательном ресурсе</a><a class="btn" href="/materials/analytics/">Описание аналитики</a><button class="btn" data-logout>Выйти</button></div></header>
    <form class="teacher-filters"><label class="field"><span>Группа (точное название)</span><input class="input" name="group" maxlength="40" value="${esc(filter.group)}"></label><label class="field"><span>ФИО / учебный код</span><input class="input" name="q" maxlength="100" value="${esc(filter.q)}"></label><button class="btn" type="submit">Найти</button><button class="btn" type="button" data-reset>Сбросить фильтр</button></form>
    <div class="learning-actions"><button class="btn" data-refresh>Обновить сейчас</button><a class="btn" data-csv href="/api/teacher/export.csv">Скачать CSV для Excel</a></div><p role="status" data-status></p><div data-table></div><div class="learning-actions"><button class="btn" data-prev>Назад</button><button class="btn" data-next>Далее</button></div>`;
  root.querySelector('[data-logout]')?.addEventListener('click',async()=>{try{await request('/api/teacher/logout',{method:'POST',body:'{}'});await start();}catch(error){showError(root.querySelector('[data-status]')!,error);}});
  root.querySelector('form')?.addEventListener('submit',event=>{event.preventDefault();const d=new FormData(event.currentTarget as HTMLFormElement);filter={group:String(d.get('group')||'').trim(),q:String(d.get('q')||'').trim(),offset:0};void load();});
  root.querySelector('[data-reset]')?.addEventListener('click',()=>{filter={group:'',q:'',offset:0};root.querySelector<HTMLFormElement>('form')!.reset();root.querySelector<HTMLInputElement>('[name=group]')!.value='';root.querySelector<HTMLInputElement>('[name=q]')!.value='';void load();});
  root.querySelector('[data-prev]')?.addEventListener('click',()=>{filter.offset=Math.max(0,filter.offset-50);void load();});
  root.querySelector('[data-next]')?.addEventListener('click',()=>{filter.offset+=50;void load();});
  root.querySelector('[data-refresh]')?.addEventListener('click',()=>void load());
  await load();if(current!==page)return;refresh=setInterval(()=>{if(document.visibilityState==='visible')void load();},10000);
}
let loading=false;
async function load():Promise<void>{
  if(loading || deleting)return;loading=true;const current=page;
  try{
    const params=new URLSearchParams({group:filter.group,q:filter.q,offset:String(filter.offset)});
    let data=await request<{total:number;offset:number;items:Row[]}>(`/api/teacher/reports?${params}`);if(current!==page)return;
    if(!data.items.length && filter.offset>0){
      filter.offset=Math.floor(Math.max(0,data.total-1)/50)*50;params.set('offset',String(filter.offset));
      data=await request<typeof data>(`/api/teacher/reports?${params}`);if(current!==page)return;
    }
    root.querySelector('[data-status]')!.textContent=`Найдено прохождений: ${data.total}. Обновлено: ${new Date().toLocaleTimeString('ru-RU')}.`;
    root.querySelector<HTMLAnchorElement>('[data-csv]')!.href=`/api/teacher/export.csv?${params}`;
    root.querySelector<HTMLButtonElement>('[data-prev]')!.disabled=filter.offset===0;root.querySelector<HTMLButtonElement>('[data-next]')!.disabled=filter.offset+data.items.length>=data.total;
    const signature=JSON.stringify(data.items);
    if(signature!==tableSignature){renderRows(data.items);tableSignature=signature;}

  }catch(error){if(current===page && root.querySelector('[data-status]'))showError(root.querySelector('[data-status]')!,error);}finally{loading=false;}
}
function renderRows(rows:Row[]):void {
  root.querySelector('[data-table]')!.innerHTML=`<div class="report-table-wrap"><table class="report-table"><caption>Учебные результаты · последняя завершённая попытка каждого задания</caption><thead><tr><th>Студент / код</th><th>Группа</th><th>Дата</th><th>Статус</th>${Object.values(taskNames).map(n=>`<th>${n}</th>`).join('')}<th>Действия</th></tr></thead><tbody>${rows.length?rows.map(row=>{
    const open=expanded.has(row.id);
    return `<tr><th scope="row">${esc(row.fullName||'Не указано')}</th><td>${esc(row.group||'—')}</td><td>${esc(new Date(row.finishedAt||row.startedAt).toLocaleString('ru-RU'))}</td><td>${row.finishedAt?'Завершено':'В процессе'}</td>${(Object.keys(taskNames) as TaskCategory[]).map(c=>{const p=percentage(latest({outcomes:row.outcomes},c));return `<td>${p===null?'Нет данных':`${p}%`}</td>`;}).join('')}<td><div class="report-row-actions"><button class="btn btn--small" data-report="${esc(row.id)}" aria-expanded="${open}" aria-controls="report-${esc(row.id)}">${open?'Свернуть':'Открыть'}</button><button class="btn btn--small report-delete" data-delete="${esc(row.id)}" aria-expanded="${pendingDelete===row.id}" aria-controls="delete-${esc(row.id)}" aria-label="Удалить прохождение: ${esc(row.fullName||'Не указано')}">Удалить</button></div><div class="report-delete-confirm" id="delete-${esc(row.id)}" ${pendingDelete===row.id?'':'hidden'}><p>Удалить это прохождение без возможности восстановления?</p><button class="btn btn--small report-delete" data-confirm-delete="${esc(row.id)}">Да, удалить</button><button class="btn btn--small" data-cancel-delete="${esc(row.id)}">Отмена</button></div></td></tr><tr class="report-expanded" id="report-${esc(row.id)}" ${open?'':'hidden'}><td colspan="${Object.keys(taskNames).length+5}"><div data-report-body>Загрузка отчёта…</div><button class="btn btn--small" data-collapse="${esc(row.id)}">Свернуть отчёт</button></td></tr>`;
  }).join(''):`<tr><td colspan="${Object.keys(taskNames).length+5}">Результатов пока нет. Они появятся, когда студенты начнут игру на этом сервере.</td></tr>`}</tbody></table></div>`;
  rows.forEach(row=>{
    const button=root.querySelector<HTMLButtonElement>(`[data-report="${row.id}"]`)!;
    const area=document.getElementById(`report-${row.id}`)!;
    const collapse=()=>{expanded.delete(row.id);area.hidden=true;button.setAttribute('aria-expanded','false');button.textContent='Открыть';};
    button.addEventListener('click',()=>{
      if(expanded.has(row.id)){collapse();return;}
      expanded.add(row.id);area.hidden=false;button.setAttribute('aria-expanded','true');button.textContent='Свернуть';void fillReport(row.id,area);
    });
    area.querySelector('[data-collapse]')!.addEventListener('click',()=>{collapse();button.focus({preventScroll:true});});
    if(expanded.has(row.id))void fillReport(row.id,area);
    const deleteButton=root.querySelector<HTMLButtonElement>(`[data-delete="${row.id}"]`)!;
    const confirmation=document.getElementById(`delete-${row.id}`)!;
    deleteButton.addEventListener('click',()=>{
      root.querySelectorAll<HTMLElement>('.report-delete-confirm').forEach(el=>el.hidden=true);
      root.querySelectorAll('[data-delete]').forEach(el=>el.setAttribute('aria-expanded','false'));
      pendingDelete=row.id;confirmation.hidden=false;deleteButton.setAttribute('aria-expanded','true');
    });
    confirmation.querySelector('[data-cancel-delete]')!.addEventListener('click',()=>{pendingDelete=null;confirmation.hidden=true;deleteButton.setAttribute('aria-expanded','false');deleteButton.focus({preventScroll:true});});
    confirmation.querySelector('[data-confirm-delete]')!.addEventListener('click',()=>void deleteReport(row.id,confirmation));
  });
}
async function fillReport(id:string,area:HTMLElement):Promise<void>{
  const host=area.querySelector<HTMLElement>('[data-report-body]')!;
  try{
    const report=await request<StudentReport>(`/api/teacher/reports/${encodeURIComponent(id)}`);
    if(!area.isConnected)return;
    host.innerHTML=`<article class="teacher-report"><h2>${esc(report.analytics.fullName||'Отчёт студента')} · ${esc(report.analytics.group||'Без группы')}</h2><p>Входная диагностика: ${report.diagnostics.baseline===null?'нет данных':`${report.diagnostics.baseline}/3`}; итоговая: ${report.diagnostics.final===null?'нет данных':`${report.diagnostics.final}/3${report.diagnostics.finalForm==='transfer-v2'?'':' (прежний набор)'}`}.</p>${analyticsHtml(report.analytics)}</article>`;
  }catch(error){if(area.isConnected)showError(host,error);}
}
async function deleteReport(id:string,confirmation:HTMLElement):Promise<void>{
  if(deleting)return;deleting=true;const current=page;
  confirmation.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=true);
  try{
    await request(`/api/teacher/reports/${encodeURIComponent(id)}`,{method:'DELETE'});
    if(current!==page)return;
    expanded.delete(id);pendingDelete=null;tableSignature='';
    deleting=false;
    // Let any refresh that was already in flight finish before reloading the list.
    while(loading)await new Promise(resolve=>setTimeout(resolve,25));
    if(current!==page)return;
    await load();
    root.querySelector<HTMLElement>('[data-refresh]')?.focus({preventScroll:true});
    root.querySelector('[data-status]')!.textContent='Прохождение удалено.';
  }catch(error){if(current===page){showError(root.querySelector('[data-status]')!,error);confirmation.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=false);}}
  finally{deleting=false;}
}
window.addEventListener('hashchange',()=>{if(location.hash==='#reset-password')void start();});
void start();
