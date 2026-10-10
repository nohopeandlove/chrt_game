import { renderBackground } from './render/backgrounds.ts';
import { renderPortrait } from './render/portrait.ts';
import { backgroundTitles, characters } from './content.ts';
import type { Character, Emotion } from './types.ts';

export type LineKind = 'say' | 'think' | 'narrate';

export interface SayInput {
  kind: LineKind;
  text: string;
  who?: Character;
  /** Имя для таблички: у играбельных персонажей оно подставляется из профиля. */
  name?: string;
  emotion?: Emotion;
}

export interface ChoiceInput {
  prompt?: string;
  options: string[];
}

export interface MenuResult {
  name: string;
  gender: 'm' | 'f';
}

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

export class UI {
  private root: HTMLElement;
  private bg!: HTMLElement;
  private portrait!: HTMLElement;
  private panel!: HTMLElement;
  private speaker!: HTMLElement;
  private line!: HTMLElement;
  private hint!: HTMLElement;
  private choices!: HTMLElement;
  private overlay!: HTMLElement;
  private currentBackground = '';
  private typing: number | null = null;
  private fullText = '';

  constructor(root: HTMLElement) {
    this.root = root;
    this.build();
  }

  private build(): void {
    this.root.innerHTML = `
      <div class="stage">
        <div class="stage__bg" aria-hidden="true"></div>
        <div class="stage__portrait" aria-hidden="true"></div>
      </div>
      <div class="dock">
        <div class="panel" hidden>
          <span class="panel__speaker"></span>
          <p class="panel__line" aria-live="polite"></p>
          <span class="panel__hint" aria-hidden="true">дальше</span>
        </div>
        <div class="choices" hidden></div>
      </div>
      <div class="overlay" hidden></div>`;

    this.bg = this.q('.stage__bg');
    this.portrait = this.q('.stage__portrait');
    this.panel = this.q('.panel');
    this.speaker = this.q('.panel__speaker');
    this.line = this.q('.panel__line');
    this.hint = this.q('.panel__hint');
    this.choices = this.q('.choices');
    this.overlay = this.q('.overlay');
  }

  private q<T extends HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Не найден элемент ${selector}`);
    return el;
  }

  setBackground(id: string | undefined): void {
    if (!id || id === this.currentBackground) return;
    this.currentBackground = id;
    this.bg.innerHTML = renderBackground(id, backgroundTitles.get(id) ?? id);
  }

  private setPortrait(who?: Character, emotion?: Emotion): void {
    if (!who) {
      this.portrait.innerHTML = '';
      this.portrait.classList.remove('is-visible');
      return;
    }
    const mood = emotion ?? who.defaultEmotion ?? 'neutral';
    this.portrait.innerHTML = renderPortrait(who.portrait, mood, { label: `${who.name}` });
    this.portrait.classList.add('is-visible');
  }

  /** Реплика. Разрешается, когда игрок нажал «дальше». */
  say(input: SayInput): Promise<void> {
    this.hideChoices();
    this.setPortrait(input.kind === 'say' ? input.who : undefined, input.emotion);

    this.panel.hidden = false;
    this.panel.dataset['kind'] = input.kind;
    this.speaker.textContent =
      input.kind === 'say' && input.who ? (input.name ?? input.who.name) : '';
    this.speaker.hidden = !this.speaker.textContent;

    return new Promise<void>(resolve => {
      const finish = (): void => {
        document.removeEventListener('keydown', onKey);
        this.panel.removeEventListener('click', onClick);
        this.hint.classList.remove('is-ready');
        resolve();
      };
      const advance = (): void => {
        if (this.typing !== null) {
          this.stopTyping();
          return;
        }
        finish();
      };
      const onClick = (): void => advance();
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          advance();
        }
      };
      this.panel.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
      this.type(input.text);
    });
  }

  private type(text: string): void {
    this.stopTyping();
    this.fullText = text;
    if (REDUCED.matches) {
      this.line.textContent = text;
      this.hint.classList.add('is-ready');
      return;
    }
    this.line.textContent = '';
    let i = 0;
    this.typing = window.setInterval(() => {
      i += 2;
      this.line.textContent = text.slice(0, i);
      if (i >= text.length) this.stopTyping();
    }, 16);
  }

  private stopTyping(): void {
    if (this.typing !== null) {
      clearInterval(this.typing);
      this.typing = null;
    }
    this.line.textContent = this.fullText;
    this.hint.classList.add('is-ready');
  }

  /** Выбор варианта. Разрешается индексом выбранного варианта. */
  choice(input: ChoiceInput): Promise<number> {
    return new Promise<number>(resolve => {
      this.choices.hidden = false;
      this.choices.innerHTML = input.options
        .map(
          (text, i) =>
            `<button class="choice" type="button" data-index="${i}">
               <span class="choice__num">${i + 1}</span>
               <span class="choice__text">${escapeHtml(text)}</span>
             </button>`
        )
        .join('');

      const onKey = (e: KeyboardEvent): void => {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= input.options.length) {
          e.preventDefault();
          pick(n - 1);
        }
      };
      const onClick = (e: MouseEvent): void => {
        const button = (e.target as HTMLElement).closest<HTMLElement>('.choice');
        if (button) pick(Number(button.dataset['index']));
      };
      const pick = (index: number): void => {
        document.removeEventListener('keydown', onKey);
        this.choices.removeEventListener('click', onClick);
        this.hideChoices();
        resolve(index);
      };

      this.choices.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
      this.choices.querySelector<HTMLButtonElement>('.choice')?.focus();
    });
  }

  private hideChoices(): void {
    this.choices.hidden = true;
    this.choices.innerHTML = '';
  }

  /**
   * Полноэкранный интерактивный экран: резюме, доска вакансий, тест.
   * Модуль экрана получает пустой контейнер и сам решает, когда закончить.
   */
  async screen<T>(build: (host: HTMLElement) => Promise<T>): Promise<T> {
    this.panel.hidden = true;
    this.hideChoices();
    this.overlay.hidden = false;
    this.overlay.classList.add('overlay--screen');
    this.overlay.innerHTML = '<div class="sheet"></div>';
    const host = this.overlay.querySelector<HTMLElement>('.sheet');
    if (!host) throw new Error('Экран не смонтировался');
    try {
      return await build(host);
    } finally {
      this.overlay.hidden = true;
      this.overlay.classList.remove('overlay--screen');
      this.overlay.innerHTML = '';
      this.panel.hidden = false;
    }
  }

  /** Полноэкранная заставка: глава, баннер, карточка знания, заглушка. */
  private curtain(html: string, action = 'Дальше'): Promise<void> {
    this.panel.hidden = true;
    this.hideChoices();
    this.overlay.hidden = false;
    this.overlay.innerHTML = `${html}<button class="curtain__go" type="button">${action}</button>`;

    return new Promise<void>(resolve => {
      const done = (): void => {
        document.removeEventListener('keydown', onKey);
        this.overlay.hidden = true;
        this.overlay.innerHTML = '';
        this.panel.hidden = false;
        resolve();
      };
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          done();
        }
      };
      this.overlay.querySelector<HTMLButtonElement>('.curtain__go')?.addEventListener('click', done);
      document.addEventListener('keydown', onKey);
      this.overlay.querySelector<HTMLButtonElement>('.curtain__go')?.focus();
    });
  }

  chapter(number: number | undefined, title: string, text: string): Promise<void> {
    const eyebrow = number ? `Глава ${number}` : 'Дальше';
    return this.curtain(
      `<div class="curtain curtain--chapter">
         <span class="curtain__eyebrow">${escapeHtml(eyebrow)}</span>
         <h2 class="curtain__title"><span class="hl">${escapeHtml(title)}</span></h2>
         <p class="curtain__text">${escapeHtml(text)}</p>
       </div>`,
      'Продолжить'
    );
  }

  banner(text: string): Promise<void> {
    return this.curtain(
      `<div class="curtain curtain--banner"><p class="curtain__title"><span class="hl">${escapeHtml(text)}</span></p></div>`
    );
  }

  card(icon: string, title: string): Promise<void> {
    return this.curtain(
      `<div class="curtain curtain--card">
         <span class="curtain__icon">${escapeHtml(icon)}</span>
         <span class="curtain__eyebrow">Получено знание</span>
         <h2 class="curtain__title"><span class="hl">${escapeHtml(title)}</span></h2>
       </div>`,
      'Забрать'
    );
  }

  achievement(icon: string | undefined, title: string): Promise<void> {
    return this.curtain(
      `<div class="curtain curtain--card">
         <span class="curtain__icon">${escapeHtml(icon ?? '🏆')}</span>
         <span class="curtain__eyebrow">Достижение</span>
         <h2 class="curtain__title"><span class="hl">${escapeHtml(title)}</span></h2>
       </div>`,
      'Отлично'
    );
  }

  /** Таблица итогов сцены. */
  table(title: string, rows: { label: string; value: string }[]): Promise<void> {
    return this.curtain(
      `<div class="curtain curtain--table">
         <span class="curtain__eyebrow">${escapeHtml(title)}</span>
         <table class="results">
           <tbody>${rows
             .map(r => `<tr><th scope="row">${escapeHtml(r.label)}</th><td>${escapeHtml(r.value)}</td></tr>`)
             .join('')}</tbody>
         </table>
       </div>`
    );
  }


  menu(hasSave: boolean): Promise<MenuResult | 'continue'> {
    this.setBackground('assembly-hall');
    this.panel.hidden = true;
    this.hideChoices();
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <form class="menu" novalidate>
        <span class="menu__eyebrow">ГБПОУ «Челябинский радиотехнический техникум»</span>
        <h1 class="menu__title">Я — специалист</h1>
        <p class="menu__lede">От выпускного до первого рабочего дня. Резюме, вакансии, собеседование и первые задачи — как в жизни, только без последствий.</p>

        <fieldset class="menu__field">
          <legend>Кем играем</legend>
          <div class="heroes">
            <label class="hero">
              <input type="radio" name="gender" value="f" checked>
              <span class="hero__art">${renderPortrait(
                requireCharacter('hero-f'),
                'smile',
                { crop: true, plate: true, label: 'Женский персонаж' }
              )}</span>
              <span class="hero__label">Героиня</span>
            </label>
            <label class="hero">
              <input type="radio" name="gender" value="m">
              <span class="hero__art">${renderPortrait(
                requireCharacter('hero-m'),
                'joy',
                { crop: true, plate: true, label: 'Мужской персонаж' }
              )}</span>
              <span class="hero__label">Герой</span>
            </label>
          </div>
        </fieldset>

        <label class="menu__field">
          <span>Как вас зовут</span>
          <input class="menu__input" name="playerName" type="text" maxlength="24"
            placeholder="Имя" autocomplete="off" required>
        </label>

        <div class="menu__actions">
          <button class="btn btn--primary" type="submit">Начать</button>
          ${hasSave ? '<button class="btn" type="button" data-action="continue">Продолжить</button>' : ''}
        </div>
        <p class="menu__error" hidden>Введите имя — оно будет звучать в репликах.</p>
      </form>`;

    return new Promise<MenuResult | 'continue'>(resolve => {
      const form = this.overlay.querySelector<HTMLFormElement>('.menu');
      const error = this.overlay.querySelector<HTMLElement>('.menu__error');
      if (!form || !error) throw new Error('Меню не собралось');

      form.addEventListener('submit', e => {
        e.preventDefault();
        const data = new FormData(form);
        const name = String(data.get('playerName') ?? '').trim();
        if (!name) {
          error.hidden = false;
          form.querySelector<HTMLInputElement>('.menu__input')?.focus();
          return;
        }
        this.overlay.hidden = true;
        this.overlay.innerHTML = '';
        resolve({ name, gender: data.get('gender') === 'm' ? 'm' : 'f' });
      });

      form.querySelector<HTMLButtonElement>('[data-action="continue"]')?.addEventListener('click', () => {
        this.overlay.hidden = true;
        this.overlay.innerHTML = '';
        resolve('continue');
      });
    });
  }
}

function requireCharacter(id: string): Character['portrait'] {
  const found = characters.get(id);
  if (!found) throw new Error(`Нет персонажа ${id}`);
  return found.portrait;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, ch =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;'
  );
}
