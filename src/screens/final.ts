import { syncStatus } from '../sync.ts';
import { analyticsHtml } from '../reporting.ts';
import { save } from '../state.ts';
import { playSound } from '../sound.ts';
import { assessment, reportHtml } from '../learning.ts';
import { achievements } from '../content.ts';
import type { GameState, ResultRow } from '../types.ts';
import type { UI } from '../ui.ts';
import { escapeHtml } from './shared.ts';

/** Финальный экран: таблица итогов, достижения, «Пройти заново». */
export async function runFinal(ui: UI, state: GameState, title: string, rows: ResultRow[], action: string): Promise<void> {
  if (state.learning.final === null || state.learning.finalForm !== 'transfer-v2') await assessment(ui, state, 'final');
  state.analytics.finishedAt ??= new Date().toISOString();
  save(state);
  playSound('finale');
  await ui.screen(
    host =>
      new Promise<void>(resolve => {
        const earned = new Set(state.achievements.filter(id => achievements.some(a => a.id === id)));
        host.innerHTML = `
          <div class="final">
            <header class="final__head">
              <span class="screen__eyebrow">Твой путь — твой результат</span>
              <h2 class="screen__title">${escapeHtml(title)}</h2>
              <p class="screen__lede">${escapeHtml(state.playerName)}, вы прошли путь от выпускного до первого рабочего дня. Вот что из этого получилось.</p>
            </header>
            <div class="final__highlights" aria-label="Итоги пути">
              ${rows.map((r,i)=>`<section class="final-stat"><span class="final-stat__number" aria-hidden="true">0${i+1}</span><h3>${escapeHtml(r.label)}</h3><p>${escapeHtml(r.value)}</p></section>`).join('')}
            </div>
            <section class="final__ach">
              <div class="final__section-head"><h3>Твоя коллекция достижений</h3><span>${earned.size} из ${achievements.length}</span></div><div class="achievement-progress" role="progressbar" aria-label="Полученные достижения" aria-valuemin="0" aria-valuemax="${achievements.length}" aria-valuenow="${earned.size}"><span style="width:${earned.size/achievements.length*100}%"></span></div>
              <ul class="achievements">
                ${achievements
                  .map(
                    a => `<li class="ach${earned.has(a.id) ? ' is-earned' : ''}">
                      <span class="ach__icon" aria-hidden="true">${escapeHtml(a.icon ?? '🏆')}</span>
                      <span class="ach__body"><span class="ach__status">${earned.has(a.id) ? 'Получено' : 'Ещё впереди'}</span><b>${escapeHtml(a.title)}</b><span>${escapeHtml(a.how)}</span></span>
                    </li>`
                  )
                  .join('')}
              </ul>
            </section>
            <section class="learning-summary"><h3>Личный кабинет · результаты</h3>${analyticsHtml(state.analytics)}<details class="report-details"><summary>Маршрут и диагностика</summary>${reportHtml(state)}</details><p>Откройте «Кабинет и результаты» в верхней панели для просмотра прогресса и статуса автоматического сохранения.</p>
              <p data-sync-status role="status">${escapeHtml(syncStatus())}</p>
            </section>
            <div class="final__actions">
              <button class="btn btn--primary" type="button" data-restart>${escapeHtml(action)}</button>
            </div>
          </div>`;
        const restart = host.querySelector<HTMLButtonElement>('[data-restart]');
        restart?.addEventListener('click', () => resolve());
        restart?.focus({preventScroll:true});
      })
  );
}
