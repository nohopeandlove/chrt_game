import { save } from './state.ts';
import { analyticsHtml } from './reporting.ts';
import { syncStatus } from './sync.ts';
import type { GameState } from './types.ts';
import { escapeHtml as esc } from './screens/shared.ts';

export function dashboard(dialog: HTMLDialogElement, state: GameState | null, journal: string): void {
  dialog.innerHTML = `<header class="dashboard-head"><div><span class="screen__eyebrow">Учебный прогресс</span><h2 id="journal-title">Личный кабинет студента</h2></div><button class="icon-close" type="button" data-close aria-label="Закрыть кабинет">×</button></header><div data-dashboard-body></div><footer class="dashboard-footer"><button class="btn btn--primary" data-close>Вернуться к игре</button></footer>`;
  dialog.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
  const body=dialog.querySelector<HTMLElement>('[data-dashboard-body]')!;
  if(!state){body.innerHTML='<p>Начните игру, чтобы увидеть свой прогресс. Результаты будут сохраняться для преподавателя автоматически.</p>';return;}
  const a=state.analytics;
  body.innerHTML=`<p class="report-note">Начало: ${esc(new Date(a.startedAt).toLocaleString('ru-RU'))}. ${a.finishedAt?'Прохождение завершено.':'Прохождение продолжается.'}</p>
    <p class="sync-status" data-sync-status role="status">${esc(syncStatus())}</p>${analyticsHtml(a)}
    <details class="report-details"><summary>ФИО / учебный код и группа</summary><p>Эти данные и учебные результаты автоматически доступны вашему преподавателю на сервере игры. Используйте учебный код, если это принято на занятии. Контакты из резюме и текст письма не отправляются.</p>
    <form data-profile><label class="field"><span>ФИО или учебный код</span><input class="input" name="fullName" maxlength="100" value="${esc(a.fullName)}" autocomplete="off" required></label><label class="field"><span>Группа</span><input class="input" name="group" maxlength="40" value="${esc(a.group)}" autocomplete="off"></label><button class="btn" type="submit">Сохранить данные</button><span role="status" data-profile-status></span></form></details>
    <details class="report-details"><summary>Маршрут и входная / итоговая диагностика</summary>${journal}</details>`;
  body.querySelector('form')?.addEventListener('submit',event=>{
    event.preventDefault();const form=event.currentTarget as HTMLFormElement;if(!form.reportValidity())return;const data=new FormData(form);
    if(!String(data.get('fullName') || '').trim()){body.querySelector('[data-profile-status]')!.textContent='Введите ФИО или учебный код.';return;}
    a.fullName=String(data.get('fullName') || '').trim().slice(0,100);a.group=String(data.get('group') || '').trim().slice(0,40);save(state);
    body.querySelector('[data-profile-status]')!.textContent='Данные обновлены. Результаты сохраняются автоматически.';
  });
}
