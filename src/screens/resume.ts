import { specialties, specialty as findSpecialty } from '../content.ts';
import type { Field, FormBlock, FormSpec, GameState, ResumeData, ResumeValue } from '../types.ts';
import type { UI } from '../ui.ts';
import { escapeHtml as escape_ } from './shared.ts';

/**
 * Конструктор резюме. Слева форма из сценария, справа живой документ —
 * тот самый, который уходит на печать и в PDF.
 *
 * Выбор специальности здесь не косметика: он попадает в профиль игрока
 * и дальше решает, какие вакансии вообще откликнутся.
 */
export async function runResume(ui: UI, state: GameState, form: FormSpec): Promise<void> {
  await ui.screen(
    host =>
      new Promise<void>(resolve => {
        host.innerHTML = layout(form, state);

        const root = host.querySelector<HTMLFormElement>('.resume__form');
        const preview = host.querySelector<HTMLElement>('.cv');
        const meterBar = host.querySelector<HTMLElement>('.meter__fill');
        const meterText = host.querySelector<HTMLElement>('.meter__value');
        const error = host.querySelector<HTMLElement>('.resume__error');
        if (!root || !preview || !meterBar || !meterText || !error) {
          throw new Error('Экран резюме не собрался');
        }

        const school = root.querySelector<HTMLTextAreaElement>('[data-field="school"]');
        const fitSchool = (): void => {
          if (school && school.scrollHeight > school.clientHeight + 1) school.style.height = `${school.scrollHeight + 2}px`;
        };
        const educationSize = new ResizeObserver(fitSchool);
        if (school?.parentElement) educationSize.observe(school.parentElement);

        const refresh = (): void => {
          const data = collect(root, form);
          const percent = progress(form, root, data);
          state.resume = data;
          state.resumePercent = percent;
          meterBar.style.setProperty('--value', `${percent}%`);
          meterText.textContent = `${percent}%`;
          preview.innerHTML = document_(data, state);
          fitSchool();
        };

        root.addEventListener('input', refresh);
        root.addEventListener('change', event => {
          const target = event.target as HTMLElement;
          if (target instanceof HTMLSelectElement && target.dataset['field'] === 'specialty') {
            state.specialty = target.value || null;
            redrawSkills(root, state);
          }
          if (target instanceof HTMLInputElement && target.dataset['toggle']) {
            applyToggle(root, target);
          }
          refresh();
        });

        root.addEventListener('submit', event => {
          event.preventDefault();
          const action = (event.submitter as HTMLButtonElement | null)?.dataset['action'];
          if (action === 'print') {
            window.print();
            return;
          }
          if (!state.specialty) {
            error.hidden = false;
            root.querySelector<HTMLSelectElement>('[data-field="specialty"]')?.focus();
            return;
          }
          refresh();
          educationSize.disconnect();
          resolve();
        });

        redrawSkills(root, state);
        refresh();
        root.querySelector<HTMLInputElement>('input, select, textarea')?.focus();
      })
  );
}

/* ---------------------------------------------------------------- разметка */

function layout(form: FormSpec, state: GameState): string {
  return `
    <div class="resume">
      <form class="resume__form" novalidate>
        <header class="resume__head">
          <span class="screen__eyebrow">Глава 2</span>
          <h2 class="screen__title">Резюме</h2>
          <p class="screen__lede">Честно и аккуратно. Обязательное поле здесь одно — специальность: по ней работодатели решают, звать вас или нет.</p>
        </header>

        <div class="meter">
          <span class="meter__label">Заполнено</span>
          <span class="meter__track"><span class="meter__fill"></span></span>
          <span class="meter__value">0%</span>
        </div>

        ${form.blocks.map(block => renderBlock(block, state)).join('')}

        <p class="resume__error" hidden>Выберите специальность — без неё непонятно, какие вакансии вам подходят.</p>

        <div class="resume__actions">
          <button class="btn btn--primary" type="submit" data-action="save">Сохранить</button>
          <button class="btn" type="submit" data-action="print">Скачать резюме</button>
        </div>
      </form>

      <aside class="resume__preview">
        <span class="resume__previewLabel">Так это увидит работодатель</span>
        <article class="cv"></article>
      </aside>
    </div>`;
}

function renderBlock(block: FormBlock, state: GameState): string {
  const toggle = block.toggle
    ? `<label class="switch">
         <input type="checkbox" data-toggle="block" data-block="${block.id}" name="${block.toggle.id}">
         <span>${escape_(block.toggle.label)}</span>
       </label>`
    : '';
  const hint = block.toggle
    ? `<p class="field__hint" data-hint="${block.id}" hidden>${escape_(block.toggle.hint)}</p>`
    : '';

  return `
    <fieldset class="block" data-block="${block.id}">
      <legend class="block__title">${escape_(block.title)}</legend>
      ${toggle}
      ${hint}
      <div class="block__fields">
        ${block.fields.map(field => renderField(field, state)).join('')}
      </div>
    </fieldset>`;
}

function renderField(field: Field, state: GameState): string {
  const wide = field.id === 'school' || field.type === 'textarea' || field.type === 'chips' || field.type === 'select';
  const toggle = field.toggle
    ? `<label class="switch switch--inline">
         <input type="checkbox" data-toggle="field" data-target="${field.id}">
         <span>${escape_(field.toggle)}</span>
       </label>`
    : '';

  return `
    <div class="field${wide ? ' field--wide' : ''}" data-wrap="${field.id}">
      <div class="field__head">
        <label class="field__label" for="f-${field.id}">${escape_(field.label)}</label>
        ${toggle}
      </div>
      ${control(field, state)}
    </div>`;
}

function control(field: Field, state: GameState): string {
  const id = `id="f-${field.id}" data-field="${field.id}"`;
  if (field.id === 'school') return `<textarea class="input input--school" ${id} rows="2">${escape_(field.default ?? '')}</textarea>`;
  switch (field.type) {
    case 'textarea':
      return `<textarea class="input" ${id} rows="3"></textarea>`;
    case 'select': {
      const options =
        field.source === 'specialties'
          ? specialties.map(s => `<option value="${s.id}">${escape_(s.title)}</option>`).join('')
          : (field.options ?? []).map(o => `<option value="${escape_(o)}">${escape_(o)}</option>`).join('');
      return `<select class="input" ${id}><option value="">— не выбрано —</option>${options}</select>`;
    }
    case 'chips':
      return field.source === 'specialty.skills'
        ? `<div class="chips" ${id}></div>`
        : `<input class="input" ${id} type="text" placeholder="Через запятую">`;
    default: {
      const value = field.default ?? (field.id === 'firstName' ? state.playerName : '');
      return `<input class="input" ${id} type="${field.type}" value="${escape_(value)}">`;
    }
  }
}

/** Навыки зависят от выбранной специальности, поэтому список перерисовывается. */
function redrawSkills(root: HTMLElement, state: GameState): void {
  const host = root.querySelector<HTMLElement>('[data-field="skills"]');
  if (!host) return;
  const skills = findSpecialty(state.specialty)?.skills ?? [];
  host.innerHTML = skills.length
    ? skills
        .map(
          skill =>
            `<label class="chip"><input type="checkbox" value="${escape_(skill)}"><span>${escape_(skill)}</span></label>`
        )
        .join('')
    : '<p class="field__hint">Сначала выберите специальность в блоке «Образование».</p>';
}

function applyToggle(root: HTMLElement, toggle: HTMLInputElement): void {
  if (toggle.dataset['toggle'] === 'block') {
    const id = toggle.dataset['block'] ?? '';
    const block = root.querySelector<HTMLElement>(`.block[data-block="${id}"] .block__fields`);
    const hint = root.querySelector<HTMLElement>(`[data-hint="${id}"]`);
    if (block) block.hidden = toggle.checked;
    if (hint) hint.hidden = !toggle.checked;
    return;
  }
  const target = toggle.dataset['target'] ?? '';
  const input = root.querySelector<HTMLInputElement>(`[data-field="${target}"]`);
  const wrap = root.querySelector<HTMLElement>(`[data-wrap="${target}"]`);
  if (input) {
    input.disabled = toggle.checked;
    if (toggle.checked) input.value = '';
  }
  wrap?.classList.toggle('is-off', toggle.checked);
}

/* ------------------------------------------------------------------ данные */

function collect(root: HTMLElement, form: FormSpec): ResumeData {
  const data: ResumeData = {};
  for (const block of form.blocks) {
    for (const field of block.fields) {
      const host = root.querySelector<HTMLElement>(`[data-field="${field.id}"]`);
      if (!host) continue;
      if (host instanceof HTMLInputElement || host instanceof HTMLSelectElement || host instanceof HTMLTextAreaElement) {
        const value = host.value.trim();
        data[field.id] = field.type === 'chips' ? splitChips(value) : value;
      } else {
        data[field.id] = [...host.querySelectorAll<HTMLInputElement>('input:checked')].map(i => i.value);
      }
    }
  }
  return data;
}

function splitChips(value: string): string[] {
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function isFilled(value: ResumeValue | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.trim() !== '';
}

/** Считаем только те поля, которые игрок реально видит. */
function progress(form: FormSpec, root: HTMLElement, data: ResumeData): number {
  let total = 0;
  let filled = 0;
  for (const block of form.blocks) {
    const blockOff = root.querySelector<HTMLInputElement>(`[data-toggle="block"][data-block="${block.id}"]`)?.checked;
    if (blockOff) continue;
    for (const field of block.fields) {
      const fieldOff = root.querySelector<HTMLInputElement>(`[data-toggle="field"][data-target="${field.id}"]`)?.checked;
      if (fieldOff) continue;
      total += 1;
      if (isFilled(data[field.id])) filled += 1;
    }
  }
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

/* ------------------------------------------------------------------ документ */

function document_(data: ResumeData, state: GameState): string {
  const text = (id: string): string => (typeof data[id] === 'string' ? (data[id] as string).trim() : '');
  const list = (id: string): string[] => (Array.isArray(data[id]) ? (data[id] as string[]) : []);

  const fullName = [text('lastName'), text('firstName'), text('middleName')].filter(Boolean).join(' ');
  const contacts = [text('age') && `${text('age')} лет`, text('email'), text('phone'), text('social')].filter(Boolean);
  const specialtyTitle = findSpecialty(state.specialty)?.title ?? '';

  const sections: string[] = [];

  if (text('goal')) sections.push(section('Профессиональная цель', `<p>${escape_(text('goal'))}</p>`));

  const experience = [text('company'), text('position'), text('period')].filter(Boolean).join(' · ');
  if (experience || text('duties')) {
    sections.push(
      section(
        'Опыт работы',
        `${experience ? `<p class="cv__row">${escape_(experience)}</p>` : ''}
         ${text('stack') ? `<p class="cv__dim">${escape_(text('stack'))}</p>` : ''}
         ${text('duties') ? `<p>${escape_(text('duties'))}</p>` : ''}`
      )
    );
  }

  const education = [text('school'), specialtyTitle, text('qualification'), text('year')].filter(Boolean);
  if (education.length) {
    sections.push(
      section(
        'Образование',
        `<p class="cv__row">${escape_(education[0] ?? '')}</p>
         ${education.slice(1).map(line => `<p class="cv__dim">${escape_(line)}</p>`).join('')}`
      )
    );
  }

  if (list('skills').length) {
    sections.push(section('Технические навыки', `<p>${list('skills').map(escape_).join(' · ')}</p>`));
  }

  if (text('projectIdea') || text('projectRole')) {
    sections.push(
      section(
        'Проекты',
        `${text('projectIdea') ? `<p>${escape_(text('projectIdea'))}</p>` : ''}
         ${text('projectStack') ? `<p class="cv__dim">${escape_(text('projectStack'))}</p>` : ''}
         ${text('projectRole') ? `<p class="cv__dim">Роль: ${escape_(text('projectRole'))}</p>` : ''}
         ${text('projectProblems') ? `<p>${escape_(text('projectProblems'))}</p>` : ''}
         ${text('projectResult') ? `<p>${escape_(text('projectResult'))}</p>` : ''}`
      )
    );
  }

  const extra = [
    text('english') && `Английский: ${text('english')}`,
    text('tools'),
    text('awards'),
    text('events'),
    text('papers'),
    text('volunteer'),
    text('hobby')
  ].filter(Boolean);
  if (extra.length) {
    sections.push(section('Дополнительно', extra.map(line => `<p>${escape_(line)}</p>`).join('')));
  }

  if (list('softSkills').length) {
    sections.push(section('Личные качества', `<p>${list('softSkills').map(escape_).join(' · ')}</p>`));
  }

  return `
    <h1 class="cv__name">${escape_(fullName || state.playerName)}</h1>
    ${specialtyTitle ? `<p class="cv__role">${escape_(specialtyTitle)}</p>` : ''}
    ${contacts.length ? `<p class="cv__contacts">${contacts.map(escape_).join(' · ')}</p>` : ''}
    ${sections.join('') || '<p class="cv__empty">Заполните форму слева — документ соберётся сам.</p>'}`;
}

function section(title: string, body: string): string {
  return `<section class="cv__section"><h2 class="cv__sectionTitle">${escape_(title)}</h2>${body}</section>`;
}

