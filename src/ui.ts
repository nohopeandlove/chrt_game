import { playSound } from './sound.ts';
import { shuffledIndices } from './shuffle.ts';
import { clearSave } from './state.ts';
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
  group: string;
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
    document.addEventListener('accessibility-updated', () => {
      if (document.documentElement.classList.contains('a11y-still')) this.stopTyping();
    });
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
          <p class="panel__line"></p><span class="sr-only panel__announcement" aria-live="polite" aria-atomic="true"></span>
          <button class="panel__hint" type="button">Далее</button>
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
    this.portrait.innerHTML = renderPortrait(who.portrait, mood, { characterId: who.id, label: `${who.name}` });
    this.portrait.classList.add('is-visible');
  }

  /** Реплика. Разрешается, когда игрок нажал «дальше». */
  say(input: SayInput): Promise<void> {
    this.hideChoices();
    this.setPortrait(input.kind === 'say' ? input.who : undefined, input.emotion);

    this.panel.hidden = false;
    this.q('.panel__announcement').textContent = `${input.name ?? input.who?.name ?? ''}${input.who ? `, ${input.who.role}` : ''}. ${input.text}`;
    this.panel.dataset['kind'] = input.kind;
    this.speaker.innerHTML = input.kind === 'say' && input.who
      ? `<span class="panel__name">${escapeHtml(input.name ?? input.who.name)}</span><span class="panel__role">${escapeHtml(input.who.role)}</span>`
      : '';
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
        if (document.querySelector('dialog[open]') || (e.target instanceof HTMLElement && e.target.closest('.learning-tools'))) return;
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
    if (REDUCED.matches || document.documentElement.classList.contains('a11y-still')) {
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
    const order = shuffledIndices(input.options.length);
    return new Promise<number>(resolve => {
      this.choices.hidden = false;
      this.choices.innerHTML = order
        .map(
          (index, position) =>
            `<button class="choice" type="button" data-index="${index}">
               <span class="choice__num">${position + 1}</span>
               <span class="choice__text">${escapeHtml(input.options[index]!)}</span>
             </button>`
        )
        .join('');

      const onKey = (e: KeyboardEvent): void => {
        if (document.querySelector('dialog[open]') || (e.target instanceof HTMLElement && e.target.closest('.learning-tools'))) return;
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= input.options.length) {
          e.preventDefault();
          pick(order[n - 1]!);
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
      const task = build(host);
      this.overlay.scrollTop = 0;
      return await task;
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
    this.overlay.scrollTop = 0;

    return new Promise<void>(resolve => {
      const done = (): void => {
        document.removeEventListener('keydown', onKey);
        this.overlay.hidden = true;
        this.overlay.innerHTML = '';
        this.panel.hidden = false;
        resolve();
      };
      const onKey = (e: KeyboardEvent): void => {
        if (document.querySelector('dialog[open]') || (e.target instanceof HTMLElement && e.target.closest('.learning-tools'))) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          done();
        }
      };
      this.overlay.querySelector<HTMLButtonElement>('.curtain__go')?.addEventListener('click', done);
      document.addEventListener('keydown', onKey);
      this.overlay.querySelector<HTMLButtonElement>('.curtain__go')?.focus({ preventScroll: true });
    });
  }

  chapter(number: number | undefined, title: string, text: string): Promise<void> {
    playSound('chapter');
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

  async finale(title: string, text: string): Promise<void> {
    this.portrait.innerHTML = '';
    playSound('finale');
    this.overlay.classList.add('overlay--finale');
    try {
      await this.curtain(
        `<section class="finale" aria-labelledby="finale-title">
          <p class="finale__eyebrow">Первый шаг сделан. Твоя история начинается.</p>
          <div class="finale__ornament" aria-hidden="true">✦</div>
          <h1 class="finale__title" id="finale-title">${escapeHtml(title)}</h1>
          <div class="finale__rule" aria-hidden="true"></div>
          <p class="finale__text">${escapeHtml(text)}</p>
        </section>`,
        'Перейти к итогам'
      );
    } finally {
      this.overlay.classList.remove('overlay--finale');
    }
  }

  banner(text: string): Promise<void> {
    return this.curtain(
      `<div class="curtain curtain--banner"><p class="curtain__title"><span class="hl">${escapeHtml(text)}</span></p></div>`
    );
  }

  card(icon: string, title: string): Promise<void> {
    return this.reward('knowledge', icon, title, '');
  }

  achievement(icon: string | undefined, title: string, description = ''): Promise<void> {
    return this.reward('achievement', icon ?? '🏆', title, description);
  }

  private async reward(kind: 'knowledge' | 'achievement', icon: string, title: string, description: string): Promise<void> {
    this.setPortrait(undefined);
    playSound(kind);
    this.overlay.classList.add('overlay--reward');
    try {
      await this.curtain(
        `<section class="reward reward--${kind}" aria-labelledby="reward-title">
          <div class="reward__sparkles" aria-hidden="true">${Array.from({length:8},(_,i)=>`<span style="--spark:${i};--spark-row:${i%3}">✦</span>`).join('')}</div>
          <div class="reward__medal" aria-hidden="true"><span>${escapeHtml(icon)}</span></div>
          <p class="reward__eyebrow">${kind === 'achievement' ? 'Новое достижение' : 'Получено знание'}</p>
          <h2 id="reward-title">${escapeHtml(title)}</h2>
          ${description ? `<p class="reward__description">${escapeHtml(description)}</p>` : ''}
          <div class="reward__rule" aria-hidden="true"></div>
        </section>`,
        kind === 'achievement' ? 'Здорово! Продолжить' : 'Продолжить'
      );
    } finally {
      this.overlay.classList.remove('overlay--reward');
    }
  }

  /** Таблица итогов сцены. */
  async sceneSummary(title: string, text: string, metrics: {label: string; before: number; after: number; delta: number}[]): Promise<void> {
    const number = (value: number): string => String(value).replace('-', '−');
    this.setPortrait(undefined);
    this.overlay.classList.add('overlay--summary');
    try {
      await this.curtain(
        `<section class="scene-recap" aria-labelledby="recap-title">
          <header class="scene-recap__head">
            <span class="scene-recap__eyebrow">Этап завершён</span>
            <h2 id="recap-title">${escapeHtml(title)}</h2>
            <p>${escapeHtml(text)}</p>
          </header>
          <div class="scene-recap__metrics">${metrics.length ? metrics.map(metric => `
            <section class="scene-metric" aria-label="${escapeHtml(metric.label)}">
              <h3>${escapeHtml(metric.label)}</h3>
              <p class="scene-metric__change"><strong>${metric.delta > 0 ? '+' : ''}${number(metric.delta)}</strong><span>за эту сцену</span></p>
              <p class="scene-metric__total"><span>Было <b>${number(metric.before)}</b></span><span aria-hidden="true">→</span><span>Стало <b>${number(metric.after)}</b></span></p>
            </section>`).join('') : '<p class="scene-recap__empty">Игровые показатели остались без изменений.</p>'}</div>
        </section>`,
        'Продолжить историю'
      );
    } finally {
      this.overlay.classList.remove('overlay--summary');
    }
  }

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


  menu(hasSave: boolean, canResume = hasSave, savedTitle = ''): Promise<MenuResult | 'continue'> {
    this.setBackground('assembly-hall');
    this.panel.hidden = true;
    this.hideChoices();
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <form class="menu" novalidate>
        <div class="menu__campus" role="img" aria-label="Иллюстрация Челябинского радиотехнического техникума"></div>
        <section class="menu__intro" aria-labelledby="menu-title">
          <span class="menu__eyebrow">ГБПОУ «Челябинский радиотехнический техникум»</span>
          <p class="menu__genre">Визуальная новелла</p>
          <h1 class="menu__title" id="menu-title">Я —<br><span>специалист!</span></h1>
          <p class="menu__lede">Вчера — выпускной.<br>Сегодня начинается твоя история.</p>
        </section>
        <section class="menu__setup" aria-labelledby="menu-setup-title">
          <h2 class="menu__setup-head" id="menu-setup-title">Новая игра</h2>
        <fieldset class="menu__field menu__cast">
          <legend>Кем играем</legend>
          <div class="heroes">
            <label class="hero">
              <input type="radio" name="gender" value="f" checked>
              <span class="hero__art">${renderPortrait(
                requireCharacter('hero-f'),
                'smile',
                { characterId: 'hero-f', crop: true, plate: false, label: 'Женский персонаж' }
              )}</span>
              <span class="hero__label">Героиня</span><span class="hero__check" aria-hidden="true">✓</span>
            </label>
            <label class="hero">
              <input type="radio" name="gender" value="m">
              <span class="hero__art">${renderPortrait(
                requireCharacter('hero-m'),
                'joy',
                { characterId: 'hero-m', crop: true, plate: false, label: 'Мужской персонаж' }
              )}</span>
              <span class="hero__label">Герой</span><span class="hero__check" aria-hidden="true">✓</span>
            </label>
          </div>
        </fieldset>

        <div class="menu__entry">
        ${hasSave ? `<section class="menu__saved" data-saved aria-label="Сохранённая игра">
          <p>${canResume ? `Сохранённое прохождение: ${escapeHtml(savedTitle)}. Продолжение начнётся с начала этой главы.` : 'Есть начальные данные, но прохождение ещё не началось.'}</p>
          <p>Прогресс хранится отдельно от кэша браузера. Чтобы начать с чистого листа, удалите сохранение здесь.</p>
          <div class="menu__actions">${canResume ? '<button class="btn" type="button" data-action="continue">Продолжить</button>' : ''}<button class="btn" type="button" data-action="delete-save">Удалить сохранение</button></div>
          <p data-delete-status role="status"></p>
        </section>` : ''}
        <div class="menu__identity"><label class="menu__field">
          <span>Имя или псевдоним</span>
          <input class="menu__input" name="playerName" type="text" maxlength="24"
            placeholder="Псевдоним" autocomplete="off" required>
        </label>

<label class="menu__field"><span>Группа (если есть)</span><input class="menu__input" name="group" maxlength="40" autocomplete="off" placeholder="Например, ИС-21"></label></div>
        <div class="menu__actions">
          <button class="btn btn--primary menu__start" type="submit">Начать <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></button>
        </div>
        <p class="menu__privacy">Начав игру, вы передаёте преподавателю на этот сервер учебный код / псевдоним, группу, ответы и баллы. Для учебного резюме используйте вымышленные контакты: они не отправляются.</p>
        <p class="menu__error" role="alert" hidden>Введите имя — оно будет звучать в репликах.</p>
        </div>
        </section>
        <footer class="menu__footer"><span>Я — специалист · Учебная игра</span><a href="/about/" target="_blank" rel="noopener noreferrer">Об электронном образовательном ресурсе <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></a></footer>
      </form>`;
    this.overlay.scrollTop = 0;

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
          error.textContent = 'Введите псевдоним — он будет звучать в репликах.';
          form.querySelector<HTMLInputElement>('.menu__input')?.focus();
          return;
        }
        this.overlay.hidden = true;
        this.overlay.innerHTML = '';
        resolve({ name, group: String(data.get('group') ?? '').trim().slice(0,40), gender: data.get('gender') === 'm' ? 'm' : 'f' });
      });

      form.querySelector<HTMLButtonElement>('[data-action="delete-save"]')?.addEventListener('click', () => {
        if (clearSave()) {
          form.querySelector('[data-saved]')?.remove();
          error.hidden = false;
          error.textContent = 'Сохранение удалено. Введите псевдоним и начните новую игру.';
          form.querySelector<HTMLInputElement>('.menu__input')?.focus();
        } else {
          const status = form.querySelector<HTMLElement>('[data-delete-status]');
          if (status) status.textContent = 'Браузер не разрешил удалить сохранение. Проверьте настройки данных сайта.';
        }
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
