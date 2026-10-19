import { recordEvent } from '../reporting.ts';
import { save } from '../state.ts';
import { specialty as findSpecialty, vacancies, vacancyResponses } from '../content.ts';
import type { GameState, Vacancy } from '../types.ts';
import type { UI } from '../ui.ts';
import { escapeHtml, formatSalary } from './shared.ts';

/**
 * Доска вакансий. Экран закрывается только когда отклик прошёл гейт:
 *   ловушка → мошенники → специальность → секретное слово.
 * Порядок обязателен: ловушки и мошенники отсекаются раньше специальности,
 * иначе игрок с «неподходящей» специальностью не увидит урок про карту.
 */
export async function runJobs(ui: UI, state: GameState): Promise<void> {
  const attempts = new Map<string, number>();
  const openedScams = new Set<string>();

  await ui.screen(
    host =>
      new Promise<void>(resolve => {
        const showBoard = (): void => {
          host.innerHTML = board(state);
          host.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(button => {
            button.addEventListener('click', () => {
              const vacancy = vacancies.find(v => v.id === button.dataset['open']);
              if (vacancy) showDetail(vacancy);
            });
          });
        };

        const showDetail = (vacancy: Vacancy): void => {
          host.innerHTML = detail(vacancy, state);
          host.scrollIntoView({ block: 'start' });
          if (vacancy.kind === 'scam') openedScams.add(vacancy.id);

          host.querySelectorAll<HTMLButtonElement>('[data-back]').forEach(button => button.addEventListener('click', showBoard));
          let warned = false;
          const warn = (): void => {
            const warning = host.querySelector<HTMLElement>('[data-scam-warning]');
            if (!warning) return;
            warning.hidden = false;
            if (!warned) {
              warned = true;
              recordEvent(state, { category: 'jobs', question: vacancy.title, answer: 'Обращение к форме банковских данных', correct: false, feedback: 'Это мошенники. Не передавайте номер карты, срок действия и CVV. Выйдите со страницы.' });
              save(state);
            }
          };
          host.querySelectorAll<HTMLInputElement>('[data-scam-field]').forEach(field => {
            field.addEventListener('pointerdown', warn);
            field.addEventListener('focus', warn);
          });
          host.querySelector<HTMLFormElement>('.apply')?.addEventListener('submit', event => {
            event.preventDefault();
            const letter = host.querySelector<HTMLTextAreaElement>('[data-letter]')?.value ?? '';
            apply(vacancy, letter);
          });
        };

        const apply = (vacancy: Vacancy, letter: string): void => {
          attempts.set(vacancy.id, (attempts.get(vacancy.id) ?? 0) + 1);

          if (vacancy.kind === 'trap') {
            recordEvent(state, { category: 'jobs', question: vacancy.title, answer: 'Отклик на объявление-ловушку', correct: false, feedback: vacancy.reject ?? 'Проверяйте условия вакансии.' }); save(state);
            return showResponse(vacancy.reject ?? '', vacancy.heroComment, 'К вакансиям', showBoard);
          }
          if (vacancy.kind === 'scam') {
            // Сюда не попасть: у мошенников нет кнопки отклика. Оставлено как страховка.
            return showBoard();
          }
          if (!vacancy.specialties.includes(state.specialty ?? '')) {
            recordEvent(state, { category: 'jobs', question: vacancy.title, answer: 'Отклик не соответствует выбранной специальности', correct: false, feedback: 'Сопоставьте требования вакансии и свою специальность.' }); save(state);
            return showResponse(vacancyResponses.wrongSpecialty, heroOnMismatch(state), 'К вакансиям', showBoard);
          }
          if (!mentions(letter, vacancy.secretWord ?? '')) {
            recordEvent(state, { category: 'jobs', question: vacancy.title, answer: 'Не указано секретное слово в сопроводительном письме', correct: false, feedback: 'Перечитайте полное описание и выполните инструкцию работодателя.' }); save(state);
            return showResponse(vacancyResponses.wrongWord, undefined, 'Перечитать вакансию', () => showDetail(vacancy));
          }

          recordEvent(state, { category: 'jobs', question: vacancy.title, answer: 'Требования отклика выполнены', correct: true, feedback: 'Вакансия подходит по специальности, инструкция выполнена.' });
          state.job = { id: vacancy.id, title: vacancy.title, company: vacancy.company };
          state.flags['secretWordFoundOnFirstTry'] = attempts.get(vacancy.id) === 1;
          state.flags['openedBothScams'] = openedScams.size === vacancies.filter(v => v.kind === 'scam').length;
          state.flags['cardNotEntered'] = true;
          save(state);
          showResponse(vacancyResponses.ok, vacancyResponses.okHero, 'Дальше', resolve);
        };

        const showResponse = (message: string, hero: string | undefined, action: string, next: () => void): void => {
          host.innerHTML = response(message, hero, action);
          host.querySelector<HTMLButtonElement>('[data-next]')?.addEventListener('click', next);
          host.querySelector<HTMLButtonElement>('[data-next]')?.focus();
        };

        showBoard();
      })
  );
}

/* ---------------------------------------------------------------- логика */

/**
 * Секретное слово ищется по основе: «кабачок» найдётся и в «кабачка»,
 * «напиток» — в «напитком». Регистр не важен.
 */
export function mentions(letter: string, word: string): boolean {
  const stem = word.length > 5 ? word.slice(0, -2) : word.slice(0, -1);
  return letter.toLowerCase().includes(stem.toLowerCase());
}

function heroOnMismatch(state: GameState): string {
  const title = findSpecialty(state.specialty)?.short ?? 'моя специальность';
  return `Логично: ${title} — это не про них. Ищу дальше.`;
}

/* ---------------------------------------------------------------- разметка */

function board(state: GameState): string {
  return `
    <div class="jobs">
      <header class="jobs__head">
        <span class="screen__eyebrow">Глава 3</span>
        <h2 class="screen__title">Вакансии</h2>
        <p class="screen__lede">Выбирайте объявления, подходящие вашей специальности. Читайте внимательно: работодатели любят проверять, дочитали ли вы до конца.</p>
      </header>
      <div class="jobs__grid">
        ${vacancies.map(v => card(v, state.rejectedJobs.includes(v.id))).join('')}
      </div>
    </div>`;
}

function card(v: Vacancy, rejected: boolean): string {
  return `
    <article class="job${rejected ? ' job--rejected' : ''}">
      <div class="job__top">
        <h3 class="job__title">${escapeHtml(v.title)}</h3>
        <span class="job__salary">${formatSalary(v.salary)}</span>
      </div>
      <p class="job__company">${escapeHtml(v.company)} · ${escapeHtml(v.format)}</p>
      <p class="job__teaser">${escapeHtml(v.teaser)}</p>
      ${rejected ? '<span class="job__note">Уже был отказ. Откликнуться можно снова — так бывает и в жизни.</span>' : ''}
      <button class="btn btn--small" type="button" data-open="${v.id}">Подробнее</button>
    </article>`;
}

function detail(v: Vacancy, state: GameState): string {
  const d = v.description;
  const block = (title: string, items?: string[]): string =>
    items?.length
      ? `<section class="vac__section"><h4 class="vac__h">${title}</h4><ul class="vac__list">${items
          .map(i => `<li>${escapeHtml(i)}</li>`)
          .join('')}</ul></section>`
      : '';

  return `
    <div class="vac">
      <button class="link" type="button" data-back>← Все вакансии</button>
      <header class="vac__head">
        <h2 class="screen__title">${escapeHtml(v.title)}</h2>
        <p class="vac__meta">${escapeHtml(v.company)} · <b>${formatSalary(v.salary)}</b> · ${escapeHtml(v.format)}</p>
      </header>
      ${d.intro ? `<p class="vac__intro">${escapeHtml(d.intro)}</p>` : ''}
      ${block('Что предлагаем', d.offer)}
      ${block('Чем предстоит заниматься', d.duties)}
      ${block('Что для нас важно', d.requirements)}
      ${block('Будет плюсом', d.plus)}
      ${d.stages ? `<p class="vac__stages"><b>Этапы отбора:</b> ${escapeHtml(d.stages)}</p>` : ''}
      ${d.ps ? `<p class="vac__ps">${escapeHtml(d.ps)}</p>` : ''}
      ${v.kind === 'scam' ? scamForm(v) : applyForm(state)}
    </div>`;
}

function applyForm(state: GameState): string {
  return `
    <form class="apply" novalidate>
      <label class="field">
        <span class="field__label">Сопроводительное письмо</span>
        <textarea class="input" data-letter rows="5" placeholder="Расскажите о себе и о том, почему вам интересна эта вакансия">${escapeHtml(
          `Здравствуйте! Меня зовут ${state.playerName}. `
        )}</textarea>
      </label>
      <div class="apply__actions">
        <button class="btn btn--primary" type="submit">Откликнуться</button>
      </div>
    </form>`;
}

/** Поля видимы и фокусируемы, но не принимают платёжные данные. */
function scamForm(v: Vacancy): string {
  const form = v.cardForm;
  return `
    <div class="scam">
      <div class="scam__warning" data-scam-warning role="alert" hidden><strong>Опасно: это мошенники!</strong><p>${escapeHtml(form?.warning ?? 'Не передавайте данные банковской карты работодателю.')}</p></div>
      <fieldset class="scam__form" aria-label="Форма данных карты">
        <label class="field"><span class="field__label">Номер карты</span><input class="input" type="text" readonly data-scam-field autocomplete="off" aria-label="Номер карты" placeholder="•••• •••• •••• ••••"></label>
        <div class="scam__row">
          <label class="field"><span class="field__label">Срок действия</span><input class="input" type="text" readonly data-scam-field autocomplete="off" aria-label="Срок действия" placeholder="ММ/ГГ"></label>
          <label class="field"><span class="field__label">CVV</span><input class="input" type="text" readonly data-scam-field autocomplete="off" aria-label="CVV" placeholder="•••"></label>
        </div>
      </fieldset>

      <div class="apply__actions">
        <button class="btn btn--primary" type="button" data-back>Уйти с этой страницы</button>
      </div>
    </div>`;
}

function response(message: string, hero: string | undefined, action: string): string {
  return `
    <div class="curtain curtain--response">
      <span class="curtain__eyebrow">Ответ работодателя</span>
      <p class="curtain__title">${escapeHtml(message)}</p>
      ${hero ? `<p class="curtain__text curtain__text--hero">${escapeHtml(hero)}</p>` : ''}
      <button class="curtain__go" type="button" data-next>${escapeHtml(action)}</button>
    </div>`;
}
