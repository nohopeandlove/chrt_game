import { shuffledIndices } from '../shuffle.ts';
import type { UI } from '../ui.ts';
import type { GameState } from '../types.ts';
import { applyOption, save } from '../state.ts';
import { recordEvent, recordOutcome } from '../reporting.ts';
import { escapeHtml as esc } from './shared.ts';

export const portfolioWorks = [
  { id: 'case', title: 'Учебный проект', kind: 'Кейс', text: 'Задача заказчика, мой вклад, этапы работы и фотографии результата. Есть разрешение на публикацию.', good: true, feedback: 'Сильный пример: понятны задача, ваш вклад и результат; права на публикацию учтены.' },
  { id: 'diploma', title: 'Диплом на фоне стола', kind: 'Фото', text: 'Одна фотография обложки диплома. Описание работы и сам результат не приложены.', good: false, feedback: 'Обложка не показывает навыки. Добавьте сам проект, описание решений и результата.' },
  { id: 'team', title: 'Командная работа', kind: 'Проект', text: 'Демонстрация результата и отзыв наставника. Отдельно указано, что именно я сделал в команде. Материалы разрешены к публикации.', good: true, feedback: 'Командная работа подходит, если честно описан ваш личный вклад.' },
  { id: 'borrowed', title: 'Красивый чужой проект', kind: 'Подборка', text: 'Скачанная из интернета работа. Имя автора удалено: пусть выглядит как моя.', good: false, feedback: 'Выдавать чужую работу за свою нельзя. Для своего кейса создайте собственный результат.' },
  { id: 'practice', title: 'Практическое задание', kind: 'До / после', text: 'Моя работа: исходная проблема, исправления и измеримый результат. Личные данные клиентов скрыты, публикация согласована.', good: true, feedback: 'Хороший кейс: видны ход решения и результат, конфиденциальность соблюдена.' },
  { id: 'claims', title: 'Я умею всё', kind: 'Список', text: 'Длинный перечень навыков без примеров: «опытный специалист, делаю всё идеально».', good: false, feedback: 'Общие обещания не подтверждают умения. Замените их конкретными собственными работами.' }
];

export async function runPortfolio(ui: UI, state: GameState): Promise<void> {
  await ui.screen(host => new Promise<void>(resolve => {
    const selected = new Set<string>();
    const displayWorks = shuffledIndices(portfolioWorks.length).map(i => portfolioWorks[i]!);
    let checked = false;
    let message = '';
    const render = (): void => {
      const card = (w: typeof portfolioWorks[number]): string => `<article class="work-card" draggable="${!checked}" data-work="${w.id}"><span class="screen__eyebrow">${w.kind}</span><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p>${checked ? `<p class="work-feedback">${w.good ? '✓ Подходит' : '△ Требует замены'}: ${esc(w.feedback)}</p>` : `<button type="button" class="btn btn--small" data-toggle="${w.id}">${selected.has(w.id) ? 'Убрать' : 'Добавить'}</button>`}</article>`;
      host.innerHTML = `<section class="portfolio"><span class="screen__eyebrow">Практикум · Портфолио</span><h2 class="screen__title">Покажите, что вы умеете</h2><p>Соберите три работы для работодателя. Оценивайте доказательства навыков, авторство и описание результата. Перетаскивайте карточки или используйте кнопки «Добавить» и «Убрать».</p><div class="portfolio-board"><section class="portfolio-zone" data-zone="bank" aria-label="Доступные работы"><h3>Материалы на выбор</h3>${displayWorks.filter(w => !selected.has(w.id)).map(card).join('')}</section><section class="portfolio-zone portfolio-zone--selected" data-zone="selected" aria-label="Моё портфолио"><h3>Моё портфолио · ${selected.size} из 3</h3>${selected.size ? displayWorks.filter(w => selected.has(w.id)).map(card).join('') : '<p>Перенесите сюда три работы</p>'}</section></div><p role="status" aria-live="polite" data-verdict>${esc(message)}</p><button type="button" class="btn btn--primary" data-submit>${checked ? 'Продолжить' : 'Проверить портфолио'}</button></section>`;
      const toggle = (id: string, add: boolean): void => {
        if (checked || !portfolioWorks.some(w => w.id === id)) return;
        if (add && !selected.has(id) && selected.size >= 3) { host.querySelector('[data-verdict]')!.textContent = 'Можно выбрать только три работы. Сначала уберите одну.'; return; }
        if (add) selected.add(id); else selected.delete(id);
        render();
        host.querySelector<HTMLButtonElement>(`[data-toggle="${id}"]`)?.focus();
      };
      host.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach(b => b.onclick = () => toggle(b.dataset['toggle']!, !selected.has(b.dataset['toggle']!)));
      host.querySelectorAll<HTMLElement>('[data-work]').forEach(c => c.ondragstart = e => { if (checked) { e.preventDefault(); return; } e.dataTransfer?.setData('text/plain', c.dataset['work']!); });
      host.querySelectorAll<HTMLElement>('[data-zone]').forEach(zone => {
        zone.ondragover = e => { if (!checked) e.preventDefault(); };
        zone.ondrop = e => { e.preventDefault(); toggle(e.dataTransfer?.getData('text/plain') ?? '', zone.dataset['zone'] === 'selected'); };
      });
      host.querySelector<HTMLButtonElement>('[data-submit]')!.onclick = () => {
        if (checked) { resolve(); return; }
        if (selected.size !== 3) { host.querySelector('[data-verdict]')!.textContent = 'Выберите ровно три работы, чтобы проверить подбор.'; return; }
        checked = true;
        const good = portfolioWorks.filter(w => selected.has(w.id) && w.good).length;
        for (const w of portfolioWorks.filter(w => selected.has(w.id))) recordEvent(state, { category: 'portfolio', question: 'Отбор работ в портфолио', answer: w.title, correct: w.good, feedback: w.feedback });
        recordOutcome(state, 'portfolio', good, 3);
        applyOption(state, { text: '', effects: good === 3 ? { confidence: 1, mood: 1, responsibility: 1 } : { confidence: -1, awareness: 1 }, set: { portfolio: good === 3 ? 'high' : good === 2 ? 'medium' : 'low', approach: good === 3 ? 'responsible' : good === 2 ? 'balanced' : 'shallow' } });
        message = `Подходящих работ: ${good} из 3 (${Math.round(good / 3 * 100)}%). ${good === 3 ? 'Все работы подтверждают навыки.' : 'Сравните свой выбор с оставшимися работами. Разбор показан на каждой карточке.'} Итог сохранён в личном кабинете.`;
        save(state); render(); host.querySelector<HTMLButtonElement>('[data-submit]')?.focus();
      };
    };
    render();
  }));
}
