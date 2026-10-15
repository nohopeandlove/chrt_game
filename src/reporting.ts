import type { ActivityEvent, Analytics, GameState, TaskCategory, TaskOutcome } from './types.ts';
import { escapeHtml as esc } from './screens/shared.ts';

export const taskNames: Record<TaskCategory, string> = { resume: 'Резюме', test: 'Тестовое задание', interview: 'Собеседование', law: 'Трудовые отношения' };
const categories = Object.keys(taskNames) as TaskCategory[];
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 1000): string => typeof v === 'string' ? v.slice(0, max) : '';
const date = (v: unknown): string => typeof v === 'string' && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : '';
const now = (): string => new Date().toISOString();

export function newAnalytics(): Analytics {
  return { sessionId: crypto.randomUUID(), startedAt: now(), finishedAt: null, fullName: '', group: '', events: [], outcomes: [] };
}

export function restoreAnalytics(raw: unknown): Analytics {
  const base = newAnalytics();
  if (!isRecord(raw)) return base;
  const events: ActivityEvent[] = [];
  if (Array.isArray(raw.events)) for (const e of raw.events.slice(-5000)) {
    if (!isRecord(e) || ![...categories, 'jobs', 'story'].includes(String(e.category)) || !date(e.at) || ![true, false, null].includes(e.correct as boolean | null)) continue;
    events.push({ at: date(e.at), category: e.category as ActivityEvent['category'], question: text(e.question), answer: text(e.answer), correct: e.correct as boolean | null, feedback: text(e.feedback) });
  }
  const outcomes: TaskOutcome[] = [];
  if (Array.isArray(raw.outcomes)) for (const o of raw.outcomes.slice(-1000)) {
    if (!isRecord(o) || !categories.includes(o.category as TaskCategory) || !date(o.at) ||
      typeof o.earned !== 'number' || typeof o.possible !== 'number' || !Number.isFinite(o.earned) || !Number.isFinite(o.possible) || o.possible <= 0 || o.earned < 0 || o.earned > o.possible) continue;
    outcomes.push({ at: date(o.at), category: o.category as TaskCategory, earned: o.earned, possible: o.possible });
  }
  return { sessionId: text(raw.sessionId, 80) || base.sessionId, startedAt: date(raw.startedAt) || base.startedAt,
    finishedAt: date(raw.finishedAt) || null, fullName: text(raw.fullName, 100), group: text(raw.group, 40), events, outcomes };
}

// No profile substitutions: free text from resume/letters never enters the event log.
const template = (value: string): string => value.replace(/\{[^}]+\}/g, '[профиль]');
export function recordEvent(state: GameState, event: Omit<ActivityEvent, 'at'>): void {
  state.analytics.events.push({ ...event, question: template(event.question), answer: template(event.answer), feedback: template(event.feedback), at: now() });
}
export function recordOutcome(state: GameState, category: TaskCategory, earned: number, possible: number): void {
  state.analytics.outcomes.push({ category, earned, possible, at: now() });
}
export function percentage(outcome: TaskOutcome | undefined): number | null {
  return outcome ? Math.round(outcome.earned / outcome.possible * 100) : null;
}
export function latest(analytics: Pick<Analytics, 'outcomes'>, category: TaskCategory): TaskOutcome | undefined {
  return analytics.outcomes.filter(o => o.category === category).at(-1);
}
export function recommendations(a: Analytics): string[] {
  const result: string[] = [];
  for (const category of categories) {
    const score = percentage(latest(a, category));
    if (score !== null && score < 80) result.push(category === 'resume' ? 'Дополните незаполненные поля учебного резюме.' : category === 'test' ? 'Повторите задания по своей специальности и разберите неверные ответы.' : category === 'interview' ? 'Потренируйтесь отвечать по схеме: опыт, пример, результат; объясняйте мотивацию.' : 'Повторите тему «Трудовой договор и ГПХ», гарантии и обязанности работника.');
  }
  if (a.events.some(e => e.category === 'jobs' && e.correct === false)) result.push('Перечитывайте требования вакансии; проверяйте работодателя и условия отклика.');
  if (!result.length) result.push(a.outcomes.length ? 'По выполненным заданиям выраженных затруднений не выявлено. Подтвердите навыки на новом примере с преподавателем.' : 'Завершите задания, чтобы получить рекомендации по результатам.');
  return result;
}

export function analyticsHtml(a: Analytics): string {
  const errors = a.events.filter(e => e.correct === false);
  const good = categories.filter(c => (percentage(latest(a, c)) ?? -1) >= 80);
  return `<div class="metric-grid">${categories.map(c => {
    const o = latest(a, c); const p = percentage(o);
    return `<article class="metric-card"><span>${taskNames[c]}</span><strong>${p === null ? '—' : `${p}%`}</strong><small>${o ? `${o.earned} из ${o.possible}${c === 'resume' ? ' · заполненность' : ' · результат'}` : 'Ещё не оценено'}</small></article>`;
  }).join('')}</div><p class="report-note">Показана последняя завершённая попытка каждого задания. «—» означает, что данных нет. Заполненность резюме не оценивает качество текста. Собеседование: (положительные × 2 + нейтральные) / (число ответов × 2). Это учебная рубрика, а не оценка личности.</p>
  <h3>Сильные стороны</h3><p>${good.length ? good.map(c => taskNames[c]).join(' · ') : 'Пока недостаточно результатов от 80%. Продолжайте тренировку.'}</p>
  <h3>Что стоит повторить</h3><ul>${recommendations(a).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
  <details class="report-details"><summary>Ошибки и затруднения · ${errors.length}</summary>${errors.length ? `<ol>${errors.map(e => `<li><b>${esc(e.question)}</b><p>Выбрано: ${esc(e.answer)}</p><p>${esc(e.feedback)}</p></li>`).join('')}</ol>` : '<p>Ошибок в записанных ответах нет. Неоценённые задания сюда не входят.</p>'}</details>
  <details class="report-details"><summary>Выбранные действия · ${a.events.length}</summary><ol>${a.events.map(e => `<li><b>${esc(e.question)}</b>: ${esc(e.answer)} <small>${e.correct === null ? 'Выбор без оценки' : e.correct ? 'Успешно' : 'Нужно разобрать'}</small></li>`).join('')}</ol></details>
  <details class="report-details"><summary>История завершённых попыток · ${a.outcomes.length}</summary><ol>${a.outcomes.map(o => `<li>${taskNames[o.category]}: ${percentage(o)}% (${o.earned}/${o.possible}) · ${esc(new Date(o.at).toLocaleString('ru-RU'))}</li>`).join('')}</ol></details>`;
}

export interface StudentReport {
  format: 'ya-specialist-report-v2';
  generatedAt: string;
  diagnostics: { baseline: number | null; final: number | null; finalForm: 'transfer-v2' | 'original-v1' };
  analytics: Analytics;
}
export function makeReport(state: GameState, identified = false): StudentReport {
  const analytics = restoreAnalytics(state.analytics);
  if (!identified) { analytics.fullName = ''; analytics.group = ''; }
  return { format: 'ya-specialist-report-v2', generatedAt: now(), diagnostics: { baseline: state.learning.baseline, final: state.learning.final, finalForm: state.learning.finalForm ?? 'original-v1' }, analytics };
}
export function parseReport(source: string): StudentReport {
  if (source.length > 2_000_000) throw new Error('Файл больше 2 МБ.');
  const value: unknown = JSON.parse(source);
  if (!isRecord(value) || value.format !== 'ya-specialist-report-v2' || !isRecord(value.analytics)) throw new Error('Нужен JSON-отчёт версии 2, скачанный из кабинета студента.');
  const a = value.analytics;
  if (!text(a.sessionId, 80) || !date(a.startedAt) || !Array.isArray(a.events) || !Array.isArray(a.outcomes) || a.events.length > 5000 || a.outcomes.length > 1000) throw new Error('Повреждённая структура отчёта.');
  const analytics = restoreAnalytics(a);
  if (analytics.events.length !== a.events.length || analytics.outcomes.length !== a.outcomes.length) throw new Error('Некорректные события или результаты в отчёте.');
  const diagnostics = isRecord(value.diagnostics) ? value.diagnostics : {};
  const score = (v: unknown): number | null => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 3 ? v : null;
  return { format: 'ya-specialist-report-v2', generatedAt: date(value.generatedAt) || now(), diagnostics: { baseline: score(diagnostics.baseline), final: score(diagnostics.final), finalForm: diagnostics.finalForm === 'transfer-v2' ? 'transfer-v2' : 'original-v1' }, analytics };
}
export function downloadFile(contents: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type })); const a = document.createElement('a');
  a.href = url; a.download = filename; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Quote all cells and neutralize spreadsheet formula prefixes, including leading whitespace.
export function csvCell(value: string): string {
  const safe = /^[\s]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function reportsCsv(reports: StudentReport[]): string {
  const rows = [['Сессия','ФИО / код','Группа','Начало (UTC)','Завершение (UTC)','Резюме, % заполнения','Тест, %','Собеседование, %','Трудовые отношения, %','Входная диагностика, из 3','Итоговая диагностика, из 3','Набор итоговой диагностики','Выбранные действия','Ошибки','Рекомендации']];
  for (const report of reports) {
    const a = report.analytics;
    rows.push([a.sessionId,a.fullName || 'Не указано',a.group,a.startedAt,a.finishedAt || 'Не завершено',
      ...categories.map(c => { const p = percentage(latest(a,c)); return p === null ? 'Нет данных' : String(p); }),
      report.diagnostics.baseline === null ? 'Нет данных' : String(report.diagnostics.baseline), report.diagnostics.final === null ? 'Нет данных' : String(report.diagnostics.final),
      report.diagnostics.final === null ? 'Нет данных' : report.diagnostics.finalForm === 'transfer-v2' ? 'Новые ситуации' : 'Прежний набор',
      a.events.map(e => `${e.question}: ${e.answer}`).join('\n'), a.events.filter(e=>e.correct===false).map(e=>`${e.question}: ${e.feedback}`).join('\n'),recommendations(a).join('\n')]);
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
