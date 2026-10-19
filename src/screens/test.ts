import { playSound } from '../sound.ts';
import { shuffledIndices } from '../shuffle.ts';
import { recordEvent, recordOutcome } from '../reporting.ts';
import { recordAttempt } from '../learning.ts';
import { tests } from '../content.ts';
import { fill } from '../text.ts';
import type { GameState, TestSet } from '../types.ts';
import type { UI } from '../ui.ts';
import { escapeHtml } from './shared.ts';

/** Письмо от работодателя с приглашением на тестовое. */
export async function runLetter(ui: UI, state: GameState): Promise<void> {
  playSound('mail');
  await ui.screen(
    host =>
      new Promise<void>(resolve => {
        const company = state.job?.company ?? 'Работодатель';
        const vacancy = state.job?.title ?? 'Вакансия';
        host.innerHTML = `
          <article class="letter" aria-labelledby="letter-title">
            <div class="letter__toolbar">
              <span class="letter__inbox"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></svg>Входящие</span>
              <span class="letter__new">Новое письмо</span>
            </div>
            <header class="letter__header">
              <p class="letter__kicker">Ответ на ваш отклик</p>
              <h2 id="letter-title">Приглашение на следующий этап</h2>
              <p class="letter__vacancy">${escapeHtml(vacancy)}</p>
            </header>
            <div class="letter__sender">
              <span class="letter__avatar" aria-hidden="true">${escapeHtml(company.slice(0, 1).toLocaleUpperCase('ru'))}</span>
              <div class="letter__sender-details"><p class="letter__from">${escapeHtml(company)}<span>Команда подбора персонала</span></p>
              <p class="letter__to">Кому: ${escapeHtml(state.playerName)}</p></div>
            </div>
            <div class="letter__paper">
              <p class="letter__body">${escapeHtml(fill(tests.letter, state))}</p>
              <div class="letter__next-step">
                <span class="letter__step-number" aria-hidden="true">01</span>
                <div><h3>Короткое тестовое задание</h3><p>Следующий шаг перед собеседованием</p><span class="letter__deadline">Срок выполнения — в течение суток</span></div>
              </div>
              <p class="letter__signature">С уважением,<br><strong>команда ${escapeHtml(company)}</strong></p>
            </div>
            <footer class="letter__footer"><button class="btn btn--primary" type="button" data-go>Перейти к заданию <span aria-hidden="true">→</span></button></footer>
          </article>`;
        const go = host.querySelector<HTMLButtonElement>('[data-go]');
        go?.addEventListener('click', () => resolve());
        go?.focus({ preventScroll: true });
      })
  );
}

/**
 * Тестовое задание. Набор выбирается по специальности из резюме.
 * После каждого ответа — правильность и объяснение; изменить ответ нельзя.
 * Итоговый балл учитывает первоначальные ответы. Для прохождения нужны все верные.
 */
export async function runTest(ui: UI, state: GameState): Promise<void> {
  const set = tests.sets.find(s => s.specialty === state.specialty) ?? tests.sets[0];
  if (!set) throw new Error('Нет ни одного набора тестовых заданий');

  const answers: number[] = [];
  const orders = set.questions.map(q => shuffledIndices(q.options.length));

  await ui.screen(
    host =>
      new Promise<void>(resolve => {
        const showQuestion = (index: number): void => {
          const q = set.questions[index];
          if (!q) return showResult();
          host.innerHTML = question(set, index, orders[index]!);
          host.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(button => {
            button.addEventListener('click', () => {
              answers[index] = Number(button.dataset['answer']);
              showComment(index);
            });
          });
          host.querySelector<HTMLButtonElement>('[data-answer]')?.focus();
        };

        const showComment = (index: number): void => {
          const q = set.questions[index];
          if (!q) return;
          const last = index === set.questions.length - 1;
          host.innerHTML = question(set, index, orders[index]!, answers[index]);
          const hero = host.querySelector<HTMLElement>('.quiz__hero');
          if (hero) hero.hidden = false;
          const next = host.querySelector<HTMLButtonElement>('[data-next]');
          if (next) {
            next.hidden = false;
            next.textContent = last ? 'Завершить тест' : 'Следующий вопрос';
            next.addEventListener('click', () => (last ? showResult() : showQuestion(index + 1)));
            next.focus();
          }
        };

        const showResult = (): void => {
          const correct = set.questions.filter((q, i) => answers[i] === q.correct).length;
          const passed = correct === set.questions.length;
          state.flags['testPassed'] = passed;
          recordOutcome(state, 'test', correct, set.questions.length);
          for (const [i, q] of set.questions.entries()) recordEvent(state, { category: 'test', question: q.text, answer: q.options[answers[i] ?? -1] ?? 'Нет ответа', correct: answers[i] === q.correct, feedback: `Верный ответ: ${q.options[q.correct] ?? ''}. ${q.explanation ?? ''}` });
          recordAttempt(state, set.title, correct, set.questions.length);
          playSound(passed ? 'success' : 'notice');
          const verdict = passed ? set.pass : set.fail;
          host.innerHTML = `
            <div class="curtain curtain--response">
              <span class="curtain__eyebrow">Ответ работодателя</span>
              <p class="curtain__title">${escapeHtml(verdict.text)}</p>
              <p class="curtain__text">Верных ответов: ${correct} из ${set.questions.length}</p>
              <p class="curtain__text curtain__text--hero">${escapeHtml(verdict.hero)}</p>
              <details class="learning-review"><summary>Разбор ответов и что повторить</summary><ol>${set.questions.map((q, i) => `<li><b>${escapeHtml(q.text)}</b><p>Ваш ответ: ${escapeHtml(q.options[answers[i] ?? -1] ?? 'Нет ответа')}</p><p>${answers[i] === q.correct ? 'Верно.' : 'Нужно повторить.'} Правильный ответ: ${escapeHtml(q.options[q.correct] ?? '')}</p><p>${escapeHtml(q.explanation ?? '')}</p></li>`).join('')}</ol></details>
              <button class="curtain__go" type="button" data-next>${passed ? 'Дальше' : 'Понятно'}</button>
            </div>`;
          const next = host.querySelector<HTMLButtonElement>('[data-next]');
          next?.addEventListener('click', () => resolve());
          next?.focus();
        };

        showQuestion(0);
      })
  );
}

function question(set: TestSet, index: number, order: number[], picked?: number): string {
  const q = set.questions[index];
  if (!q) return '';
  const answered = picked !== undefined;
  return `
    <div class="quiz">
      <header class="quiz__head">
        <span class="screen__eyebrow">${escapeHtml(set.title)}</span>
        <span class="quiz__progress">Вопрос ${index + 1} из ${set.questions.length}</span>
      </header>
      <p class="quiz__text">${escapeHtml(q.text)}</p>
      <div class="quiz__options">
        ${order
          .map(
            (i, position) => `
          <button class="choice${answered ? (i === q.correct ? ' is-right' : i === picked ? ' is-wrong' : '') : ''}" type="button"
            data-answer="${i}" ${answered ? 'disabled' : ''}>
            <span class="choice__num">${position + 1}</span>
            <span class="choice__text">${escapeHtml(q.options[i]!)}</span>
          </button>`
          )
          .join('')}
      </div>
      ${answered ? `<div class="quiz__verdict${picked === q.correct ? '' : ' is-wrong'}" role="status"><b>${picked === q.correct ? 'Верно.' : 'Неверно.'}</b><p>Правильный ответ: ${escapeHtml(q.options[q.correct] ?? '')}</p><p>${escapeHtml(q.explanation ?? '')}</p></div>` : ''}
      <p class="quiz__hero" hidden>${escapeHtml(q.heroComment ?? '')}</p>
      <div class="quiz__actions"><button class="btn btn--primary" type="button" data-next hidden>Дальше</button></div>
    </div>`;
}
