import { tests } from '../content.ts';
import { fill } from '../text.ts';
import type { GameState, TestSet } from '../types.ts';
import type { UI } from '../ui.ts';
import { escapeHtml } from './shared.ts';

/** Письмо от работодателя с приглашением на тестовое. */
export async function runLetter(ui: UI, state: GameState): Promise<void> {
  await ui.screen(
    host =>
      new Promise<void>(resolve => {
        host.innerHTML = `
          <div class="letter">
            <span class="screen__eyebrow">Новое письмо</span>
            <div class="letter__paper">
              <p class="letter__from">От: ${escapeHtml(state.job?.company ?? 'Работодатель')}</p>
              <p class="letter__subject">Тема: ${escapeHtml(state.job?.title ?? 'Вакансия')} — тестовое задание</p>
              <p class="letter__body">${escapeHtml(fill(tests.letter, state))}</p>
            </div>
            <button class="btn btn--primary" type="button" data-go>Перейти к заданию</button>
          </div>`;
        const go = host.querySelector<HTMLButtonElement>('[data-go]');
        go?.addEventListener('click', () => resolve());
        go?.focus();
      })
  );
}

/**
 * Тестовое задание. Набор выбирается по специальности из резюме.
 * Вопросы идут по одному, после ответа — реплика героя; правильность
 * не раскрывается до конца, как в настоящем тесте. Проходной балл — 4 из 4.
 */
export async function runTest(ui: UI, state: GameState): Promise<void> {
  const set = tests.sets.find(s => s.specialty === state.specialty) ?? tests.sets[0];
  if (!set) throw new Error('Нет ни одного набора тестовых заданий');

  const answers: number[] = [];

  await ui.screen(
    host =>
      new Promise<void>(resolve => {
        const showQuestion = (index: number): void => {
          const q = set.questions[index];
          if (!q) return showResult();
          host.innerHTML = question(set, index);
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
          host.innerHTML = question(set, index, answers[index]);
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
          const verdict = passed ? set.pass : set.fail;
          host.innerHTML = `
            <div class="curtain curtain--response">
              <span class="curtain__eyebrow">Ответ работодателя</span>
              <p class="curtain__title">${escapeHtml(verdict.text)}</p>
              <p class="curtain__text">Верных ответов: ${correct} из ${set.questions.length}</p>
              <p class="curtain__text curtain__text--hero">${escapeHtml(verdict.hero)}</p>
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

function question(set: TestSet, index: number, picked?: number): string {
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
        ${q.options
          .map(
            (text, i) => `
          <button class="choice${answered && i === picked ? ' is-picked' : ''}" type="button"
            data-answer="${i}" ${answered ? 'disabled' : ''}>
            <span class="choice__num">${i + 1}</span>
            <span class="choice__text">${escapeHtml(text)}</span>
          </button>`
          )
          .join('')}
      </div>
      <p class="quiz__hero" hidden>${escapeHtml(q.heroComment ?? '')}</p>
      <div class="quiz__actions"><button class="btn btn--primary" type="button" data-next hidden>Дальше</button></div>
    </div>`;
}
