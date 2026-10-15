import { syncStatus } from './sync.ts';
import { dashboard } from './dashboard.ts';
import { playSound, setSound, soundEnabled } from './sound.ts';
import { scenes } from './content.ts';
import { save } from './state.ts';
import type { GameState } from './types.ts';
import type { UI } from './ui.ts';
import { escapeHtml as esc } from './screens/shared.ts';

const baselineDiagnostic = [
  {
    question: 'Работодатель просит CVV банковской карты до собеседования. Как поступить?',
    options: ['Отправить, чтобы подтвердить личность', 'Прекратить общение и проверить работодателя', 'Отправить только срок действия'],
    correct: 1,
    explanation: 'CVV, коды из СМС и пароли нельзя передавать работодателю. Проверяйте компанию через независимые источники.'
  },
  {
    question: 'Что лучше написать в резюме выпускника без опыта работы?',
    options: ['Придумать стаж', 'Оставить только желаемую зарплату', 'Описать учебный проект, свою роль и результат'],
    correct: 2,
    explanation: 'Учебные проекты и практика показывают реальные навыки. Укажите задачу, свой вклад и проверяемый результат.'
  },
  {
    question: 'От вас требуют ежедневный рабочий график и подчинение руководителю. Что нужно уточнить перед подписанием?',
    options: ['Вид договора, обязанности, оплату и гарантии', 'Только название должности', 'Ничего: устных обещаний достаточно'],
    correct: 0,
    explanation: 'Проверяйте письменные условия и признаки трудовых отношений. Название договора само по себе не определяет характер отношений.'
  }
];

const finalDiagnostic = [
  {
    question: 'После отклика вам обещают трудоустройство, если вы сначала оплатите «страховой взнос» по ссылке из сообщения. Как действовать?',
    options: ['Не платить и проверить компанию через независимые официальные контакты', 'Сразу оплатить, чтобы сохранить место', 'Отправить реквизиты карты вместо взноса'],
    correct: 0,
    explanation: 'Предоплата за обещанное трудоустройство — признак риска. Не переходите к оплате и проверьте работодателя по независимому каналу, а не по контактам из подозрительного сообщения.'
  },
  {
    question: 'Вы сделали учебный сайт в команде. Какая запись в резюме лучше показывает ваш собственный вклад?',
    options: ['«Уверенный специалист с большим опытом»', '«В учебном проекте сверстал три страницы и проверил отображение на телефоне; готов показать результат»', '«Участвовал в чём-то интересном»'],
    correct: 1,
    explanation: 'Конкретные действия, объём работы и демонстрируемый результат помогают оценить вклад выпускника. Общие обещания и выдуманный стаж не заменяют доказательства навыка.'
  },
  {
    question: 'Вам предлагают договор ГПХ, но требуют работать каждый день с 9 до 18 и подчиняться внутреннему распорядку. Что нужно сделать?',
    options: ['Подписать: название договора гарантирует все трудовые права', 'Договориться только об оплате устно', 'Уточнить фактические обязанности, вид договора и гарантии до подписания; при необходимости обратиться за консультацией'],
    correct: 2,
    explanation: 'Регулярный график и подчинение распорядку могут указывать на трудовые отношения. Название «ГПХ» не решает вопрос само по себе: важно проверить условия и фактический характер работы.'
  }
];

export async function orientation(ui: UI, state: GameState): Promise<void> {
  const assess = await ui.screen(host => new Promise<boolean>(resolve => {
    host.innerHTML = `<article class="learning-intro">
      <span class="screen__eyebrow">Образовательная игра • карьерная грамотность</span>
      <h2 class="screen__title" tabindex="-1">Что такое «Я — специалист»?</h2>
      <p class="screen__lede">Это сюжетный тренажёр для студентов СПО и выпускников: здесь можно безопасно потренироваться искать первую работу и принимать решения.</p>
      <h3>Чему вы научитесь</h3>
      <ul><li>Описывать навыки и учебные проекты в резюме.</li><li>Сопоставлять вакансии со специальностью и замечать признаки мошенничества.</li><li>Объяснять решения на собеседовании, сравнивать договоры и обращаться за помощью в новой задаче.</li></ul>
      <h3>Как проходит игра</h3>
      <p>Восемь этапов: выпускной → портфолио → резюме → вакансии → тестовое → собеседование → договор → первый рабочий день. Читайте реплики, выбирайте действия и разбирайте обратную связь. Таймера нет: темп выбираете вы.</p>
      <p>Входная и итоговая диагностика содержат разные ситуации по трём общим темам: безопасный поиск работы, резюме и условия договора. В финале вы примените знания к новым примерам. Баллы не подтверждают профессиональную квалификацию. Диагностику можно пропустить.</p>
      <details><summary>Управление, доступность и сохранение</summary><p>Tab — переход по кнопкам; Enter — нажатие; Enter или пробел — следующая реплика; цифры — выбор ответа в диалоге. В верхней панели доступны журнал, крупный текст, контраст и отключение анимации. Можно сделать перерыв: «Продолжить» возвращает к началу текущей главы.</p><p>Используйте вымышленное имя и учебные данные в резюме. Позиция в игре хранится в браузере. Учебные результаты, код / ФИО и группа автоматически сохраняются на сервере для преподавателя. При очистке данных браузера он исчезнет; если сохранение недоступно, появится предупреждение.</p></details>
      <details><summary>Границы модели и преподавателю</summary><p>Компании, вакансии, суммы и ситуации — учебные примеры. «Секретное слово» — условность для тренировки внимательного чтения; требование 100% в тестовом — правило игры, а не норма найма. Повторная попытка после отказа разрешена. Игра не заменяет проверку работодателя и юридическую консультацию.</p><p>Для занятия: короткое обсуждение опыта → игра в своём темпе → разбор решений → итоговая диагностика и личный план. Откройте <a href="/materials/methodical/" target="_blank" rel="noopener noreferrer">методические указания</a> и <a href="/materials/criteria/" target="_blank" rel="noopener noreferrer">описание соответствия критериям</a>.</p></details>
      <div class="learning-actions"><button class="btn btn--primary" data-assess>Пройти входную диагностику</button><button class="btn" data-skip>Перейти к истории</button></div>
    </article>`;
    host.querySelector('[data-assess]')?.addEventListener('click', () => resolve(true));
    host.querySelector('[data-skip]')?.addEventListener('click', () => resolve(false));
    host.querySelector<HTMLElement>('h2')?.focus();
  }));
  if (assess) await assessment(ui, state, 'baseline');
}

export async function assessment(ui: UI, state: GameState, phase: 'baseline' | 'final'): Promise<void> {
  const diagnostic = phase === 'baseline' ? baselineDiagnostic : finalDiagnostic;
  await ui.screen(host => new Promise<void>(resolve => {
    host.innerHTML = `<form class="diagnostic"><h2 class="screen__title" tabindex="-1">${phase === 'baseline' ? 'Входная' : 'Итоговая'} диагностика</h2>
      <p>Три учебных ситуации. Выберите один ответ в каждой. Ограничения времени нет.</p>
      ${diagnostic.map((q, i) => `<fieldset class="learning-question"><legend>${i + 1}. ${esc(q.question)}</legend>${q.options.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}" required> ${esc(o)}</label>`).join('')}</fieldset>`).join('')}
      <button class="btn btn--primary" type="submit">Проверить ответы</button> <button class="btn" type="button" data-skip>Пропустить</button>
    </form>`;
    host.querySelector<HTMLElement>('h2')?.focus();
    host.querySelector('[data-skip]')?.addEventListener('click', () => resolve());
    host.querySelector('form')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const score = diagnostic.filter((q, i) => Number(data.get(`q${i}`)) === q.correct).length;
      state.learning[phase] = score;
      if (phase === 'final') state.learning.finalForm = 'transfer-v2';
      playSound(score === diagnostic.length ? 'success' : 'notice');
      save(state);
      host.innerHTML = `<h2 class="screen__title" tabindex="-1">Результат: ${score} из ${diagnostic.length}</h2>
        <p>Разберите каждую ситуацию. Входные и итоговые задания различаются. Их трудность пока не проверена на группе: разница баллов сама по себе не доказывает эффективность обучения.</p>
        <ol class="learning-review">${diagnostic.map((q, i) => `<li><b>${Number(data.get(`q${i}`)) === q.correct ? 'Верно' : 'Нужно повторить'}: ${esc(q.question)}</b><p>Ваш ответ: ${esc(q.options[Number(data.get(`q${i}`))] ?? 'Нет ответа')}</p><p>Верный ответ: ${esc(q.options[q.correct] ?? '')}. ${esc(q.explanation)}</p></li>`).join('')}</ol>
        <button class="btn btn--primary" data-done>Продолжить</button>`;
      host.querySelector('[data-done]')?.addEventListener('click', () => resolve());
      host.querySelector<HTMLElement>('h2')?.focus();
    });
  }));
}

export function recordAttempt(state: GameState, topic: string, correct: number, total: number): void {
  state.learning.attempts.push({ topic, correct, total });
  save(state);
}

export function reportHtml(state: GameState): string {
  const p = state.learning;
  const difference = p.baseline !== null && p.final !== null && p.finalForm === 'transfer-v2' ? p.final - p.baseline : null;
  return `<p>Открыто этапов: ${p.visited.length} из ${scenes.size}. Это маршрут прохождения, а не оценка освоения.</p>
    <ol>${[...scenes.values()].map(s => `<li>${esc(s.title)} — ${p.visited.includes(s.id) ? 'открыт' : 'ещё не открыт'}</li>`).join('')}</ol>
    <dl class="learning-scores"><dt>Входная диагностика</dt><dd>${p.baseline === null ? 'не пройдена' : `${p.baseline}/3`}</dd><dt>Итоговая диагностика</dt><dd>${p.final === null ? 'не пройдена' : `${p.final}/3${p.finalForm === 'transfer-v2' ? '' : ' (прежний набор)'}`}</dd><dt>Изменение результата</dt><dd>${difference === null ? 'нужны входная и новая итоговая диагностика' : `${difference > 0 ? '+' : ''}${difference} из 3`}</dd></dl>
    <h3>Учебные задания: все завершённые попытки</h3>
    ${p.attempts.length ? `<ol>${p.attempts.map(a => `<li>${esc(a.topic)}: ${a.correct}/${a.total}. ${a.correct === a.total ? 'Все ответы верны.' : 'Повторите объяснения и обсудите ошибки с преподавателем.'}</li>`).join('')}</ol>` : '<p>Завершённых попыток пока нет.</p>'}
    <p>Шкалы персонажа и достижения — игровые показатели, а не психологическая диагностика и не отметка. Результаты остаются на устройстве.</p>`;
}

export function installLearningTools(root: HTMLElement, getState: () => GameState | null): void {
  const tools = document.createElement('aside');
  tools.className = 'learning-tools';
  tools.setAttribute('aria-label', 'Прогресс и настройки доступности');
  tools.innerHTML = `<button type="button" data-journal>Кабинет и результаты</button><button type="button" data-setting="large" aria-pressed="false">Крупный текст</button><button type="button" data-setting="contrast" aria-pressed="false">Контраст</button><button type="button" data-setting="still" aria-pressed="false">Без анимации</button><button type="button" data-sound aria-pressed="${soundEnabled()}">Звук: ${soundEnabled() ? 'вкл' : 'выкл'}</button><span class="save-warning" role="status" hidden>Сохранение недоступно. Не закрывайте вкладку до завершения.</span>`;
  root.append(tools);
  const sizeTools = (): void => {
    document.documentElement.style.setProperty('--learning-tools-height', `${tools.getBoundingClientRect().height}px`);
  };
  new ResizeObserver(sizeTools).observe(tools);
  sizeTools();
  const dialog = document.createElement('dialog');
  dialog.className = 'learning-dialog';
  dialog.setAttribute('aria-labelledby', 'journal-title');
  root.append(dialog);
  document.addEventListener('server-sync-status', () => {
    root.querySelectorAll<HTMLElement>('[data-sync-status]').forEach(el => { el.textContent = syncStatus(); });
  });
  tools.querySelectorAll<HTMLButtonElement>('[data-setting]').forEach(button => {
    const setting = button.dataset['setting'] ?? '';
    let active = setting === 'still' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { const stored = localStorage.getItem(`ya-specialist/${setting}`); if (stored !== null) active = stored === 'true'; } catch { /* настройки действуют на время сессии */ }
    const apply = (): void => {
      document.documentElement.classList.toggle(`a11y-${setting}`, active);
      button.setAttribute('aria-pressed', String(active));
      document.dispatchEvent(new Event('accessibility-updated'));
    };
    apply();
    button.addEventListener('click', () => {
      active = !active; apply();
      try { localStorage.setItem(`ya-specialist/${setting}`, String(active)); } catch { /* работает без хранилища */ }
    });
  });
  tools.querySelector<HTMLButtonElement>('[data-sound]')?.addEventListener('click', event => {
    setSound(!soundEnabled());
    const button = event.currentTarget as HTMLButtonElement;
    button.textContent = `Звук: ${soundEnabled() ? 'вкл' : 'выкл'}`;
    button.setAttribute('aria-pressed', String(soundEnabled()));
  });
  document.addEventListener('click', event => {
    if (event.target instanceof HTMLElement && event.target.closest('button:not([data-sound])')) playSound('tap');
  });
  tools.querySelector('[data-journal]')?.addEventListener('click', () => {
    const state = getState();
    dashboard(dialog, state, state ? reportHtml(state) : '');
    dialog.showModal();
  });
  document.addEventListener('game-save-unavailable', () => {
    const warning = tools.querySelector<HTMLElement>('.save-warning');
    if (warning) warning.hidden = false;
  });
}
