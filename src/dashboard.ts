import { save } from './state.ts';
import { analyticsHtml, downloadFile, makeReport, parseReport, reportsCsv, latest, percentage, taskNames } from './reporting.ts';
import type { StudentReport } from './reporting.ts';
import type { GameState, TaskCategory } from './types.ts';
import { escapeHtml as esc } from './screens/shared.ts';

export function dashboard(dialog: HTMLDialogElement, state: GameState | null, journal: string, downloadAnonymous: () => void, reports: Map<string, StudentReport>): void {
  dialog.innerHTML = `<header class="dashboard-head"><div><span class="screen__eyebrow">Учебный прогресс</span><h2 id="journal-title">Личный кабинет студента</h2></div><button class="icon-close" type="button" data-close aria-label="Закрыть кабинет">×</button></header>
    <nav class="dashboard-tabs" aria-label="Разделы отчёта"><button class="btn" type="button" data-student aria-pressed="true">Студент</button><button class="btn" type="button" data-teacher aria-pressed="false">Отчёт для преподавателя</button></nav><div data-dashboard-body></div><footer class="dashboard-footer"><button class="btn btn--primary" data-close>Вернуться к игре</button></footer>`;
  const body = dialog.querySelector<HTMLElement>('[data-dashboard-body]')!;
  const title = dialog.querySelector<HTMLElement>('#journal-title')!;
  dialog.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dialog.close()));
  const select = (teacher: boolean): void => {
    dialog.querySelector('[data-student]')?.setAttribute('aria-pressed', String(!teacher));
    dialog.querySelector('[data-teacher]')?.setAttribute('aria-pressed', String(teacher));
    title.textContent = teacher ? 'Отчёт для преподавателя' : 'Личный кабинет студента';
    if (teacher) renderTeacher(); else renderStudent();
  };
  const renderStudent = (): void => {
    if (!state) { body.innerHTML = '<p>Начните игру, чтобы увидеть результаты. Отчёты других студентов можно открыть в разделе преподавателя.</p>'; return; }
    const a = state.analytics;
    body.innerHTML = `<p class="report-note">Начало: ${esc(new Date(a.startedAt).toLocaleString('ru-RU'))}. ${a.finishedAt ? `Завершено: ${esc(new Date(a.finishedAt).toLocaleString('ru-RU'))}.` : 'Прохождение ещё не завершено.'}</p>
      ${analyticsHtml(a)}
      <details class="report-details"><summary>ФИО / учебный код и группа (необязательно)</summary><p>Остаются только в этом браузере. Не вводите реальные контакты в учебное резюме. Используйте код студента, если это принято на занятии.</p>
      <form data-profile><label class="field"><span>ФИО или учебный код</span><input class="input" name="fullName" maxlength="100" value="${esc(a.fullName)}" autocomplete="off"></label><label class="field"><span>Группа</span><input class="input" name="group" maxlength="40" value="${esc(a.group)}" autocomplete="off"></label><button class="btn" type="submit">Сохранить данные для отчёта</button><span role="status" data-profile-status></span></form></details>
      <section class="report-export"><h3>Передать результат преподавателю</h3><p>JSON подходит для импорта в общую таблицу. CSV открывается в Excel. Тексты резюме, контакты и сопроводительные письма не выгружаются.</p><label><input type="checkbox" data-identify> Включить сохранённые ФИО / код и группу в JSON и CSV</label><div class="learning-actions"><button class="btn" data-json>Скачать JSON-отчёт</button><button class="btn" data-csv>Скачать CSV для Excel</button><button class="btn" data-anonymous>Скачать результаты без личных данных</button></div><p class="report-note">Скачанные файлы передавайте самостоятельно по правилам учреждения. Автоматической отправки нет.</p></section>
      <details class="report-details"><summary>Маршрут и входная / итоговая диагностика</summary>${journal}</details>`;
    body.querySelector('form')?.addEventListener('submit', event => {
      event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement);
      a.fullName = String(data.get('fullName') ?? '').trim().slice(0,100); a.group = String(data.get('group') ?? '').trim().slice(0,40); save(state);
      body.querySelector('[data-profile-status]')!.textContent = ' Данные применены; экспорт доступен. При запрете сохранения они действуют до закрытия вкладки.';
    });
    const identified = (): boolean => body.querySelector<HTMLInputElement>('[data-identify]')?.checked ?? false;
    body.querySelector('[data-json]')?.addEventListener('click', () => downloadFile(JSON.stringify(makeReport(state,identified()),null,2),'ya-specialist-report.json','application/json'));
    body.querySelector('[data-csv]')?.addEventListener('click', () => downloadFile(reportsCsv([makeReport(state,identified())]),'ya-specialist-report.csv','text/csv;charset=utf-8'));
    body.querySelector('[data-anonymous]')?.addEventListener('click', downloadAnonymous);
  };
  const renderTeacher = (): void => {
    body.innerHTML = `<p class="report-note">Локальный режим: загрузите полученные от студентов JSON-отчёты. Файлы обрабатываются в браузере и не отправляются на сервер. Здесь нет входа по паролю и доступа к чужому устройству; серверный кабинет — перспектива развития.</p>
      <label class="report-upload">Добавить JSON-отчёты студентов (до 100 файлов, каждый до 2 МБ)<input type="file" data-import accept=".json,application/json" multiple></label><p role="status" data-import-status></p>
      <div class="learning-actions"><button class="btn" data-group-csv ${reports.size ? '' : 'disabled'}>Экспорт таблицы в CSV</button><button class="btn" data-clear ${reports.size ? '' : 'disabled'}>Очистить таблицу</button></div><p data-count>Отчётов: ${reports.size}. Данные таблицы хранятся только до перезагрузки страницы. Повторный импорт той же сессии заменяет её отчёт.</p>
      <div class="report-table-wrap"><table class="report-table"><caption>Результаты группы · последняя завершённая попытка</caption><thead><tr><th>Студент / код</th><th>Группа</th><th>Дата прохождения</th><th>Статус</th>${Object.values(taskNames).map(t=>`<th>${t}</th>`).join('')}<th>Подробности</th></tr></thead><tbody>${[...reports.values()].map((r,i)=>{
        const a=r.analytics;return `<tr><th scope="row">${esc(a.fullName || 'Не указано')}<small>Сессия: ${esc(a.sessionId.slice(0,8))}</small></th><td>${esc(a.group || '—')}</td><td>${esc(new Date(a.finishedAt ?? a.startedAt).toLocaleString('ru-RU'))}</td><td>${a.finishedAt ? 'Завершено' : 'В процессе'}</td>${(Object.keys(taskNames) as TaskCategory[]).map(c=>{const p=percentage(latest(a,c));return `<td>${p===null?'Нет данных':`${p}%`}</td>`;}).join('')}<td><button class="btn btn--small" data-detail="${i}">Открыть отчёт</button></td></tr>`;
      }).join('')}</tbody></table></div><section data-detail-body></section>`;
    body.querySelector('[data-group-csv]')?.addEventListener('click', () => downloadFile(reportsCsv([...reports.values()]),'ya-specialist-group.csv','text/csv;charset=utf-8'));
    body.querySelector('[data-clear]')?.addEventListener('click', () => {reports.clear();renderTeacher();});
    body.querySelectorAll<HTMLButtonElement>('[data-detail]').forEach(b=>b.addEventListener('click',()=>{
      const report=[...reports.values()][Number(b.dataset['detail'])];if(!report)return;
      const area=body.querySelector<HTMLElement>('[data-detail-body]')!;area.innerHTML=`<h3 tabindex="-1">Отчёт: ${esc(report.analytics.fullName || report.analytics.sessionId.slice(0,8))}</h3><p>Входная диагностика: ${report.diagnostics.baseline === null ? 'нет данных' : `${report.diagnostics.baseline}/3`}; итоговая: ${report.diagnostics.final === null ? 'нет данных' : `${report.diagnostics.final}/3`}.</p>${analyticsHtml(report.analytics)}`;
      area.querySelector<HTMLElement>('h3')?.focus();
    }));
    body.querySelector<HTMLInputElement>('[data-import]')?.addEventListener('change', async event => {
      const input=event.currentTarget as HTMLInputElement;const files=[...(input.files ?? [])]; const messages:string[]=[];
      if(files.length>100){body.querySelector('[data-import-status]')!.textContent='Выберите не более 100 файлов.';return;}
      input.disabled=true;let added=0;
      for(const file of files){try{
        if(file.size>2_000_000)throw new Error('Файл больше 2 МБ.');
        const report=parseReport(await file.text());
        if(!reports.has(report.analytics.sessionId)&&reports.size>=100)throw new Error('Достигнут лимит 100 сессий.');
        reports.set(report.analytics.sessionId,report);added++;
      }catch(error){messages.push(`${file.name}: ${error instanceof Error ? error.message : 'Ошибка чтения'}`);}}
      renderTeacher();body.querySelector('[data-import-status]')!.textContent=`Принято файлов: ${added}. ${messages.join(' ')}`;
    });
  };
  dialog.querySelector('[data-student]')?.addEventListener('click',()=>select(false));
  dialog.querySelector('[data-teacher]')?.addEventListener('click',()=>select(true));
  renderStudent();
}
