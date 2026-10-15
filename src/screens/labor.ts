import type { CompareColumn, GameState, QuizResult, TestQuestion } from '../types.ts';
import type { UI } from '../ui.ts';
import { escapeHtml } from './shared.ts';

/** Две папки на столе кадровика: трудовой договор и ГПХ. Открываются по клику. */
export async function runCompare(ui: UI, columns: CompareColumn[], summary: string): Promise<void> {
  await ui.screen(
    host =>
      new Promise<void>(resolve => {
        host.innerHTML = `
          <div class="compare">
            <header>
              <span class="screen__eyebrow">Отдел кадров</span>
              <h2 class="screen__title">Две папки на столе</h2>
              <p class="screen__lede">Откройте обе — подписывать, не прочитав, в этой игре считается ошибкой.</p>
            </header>
            <div class="folders">
              ${columns.map((c, i) => folder(c, i)).join('')}
            </div>
            <p class="compare__summary" hidden>${escapeHtml(summary)}</p>
            <div class="compare__actions">
              <button class="btn btn--primary" type="button" data-done disabled>Понятно</button>
              <span class="compare__hintText">Сначала откройте обе папки</span>
            </div>
          </div>`;

        const opened = new Set<number>();
        const done = host.querySelector<HTMLButtonElement>('[data-done]');
        const summaryEl = host.querySelector<HTMLElement>('.compare__summary');
        const hint = host.querySelector<HTMLElement>('.compare__hintText');

        host.querySelectorAll<HTMLButtonElement>('[data-folder]').forEach(button => {
          button.addEventListener('click', () => {
            const index = Number(button.dataset['folder']);
            const body = host.querySelector<HTMLElement>(`[data-body="${index}"]`);
            const isOpen = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', String(!isOpen));
            if (body) body.hidden = isOpen;
            opened.add(index);
            if (opened.size === columns.length && done && summaryEl && hint) {
              done.disabled = false;
              summaryEl.hidden = false;
              hint.hidden = true;
            }
          });
        });
        done?.addEventListener('click', () => resolve());
        host.querySelector<HTMLButtonElement>('[data-folder]')?.focus();
      })
  );
}

function folder(c: CompareColumn, index: number): string {
  return `
    <article class="folder">
      <button class="folder__tab" type="button" data-folder="${index}" aria-expanded="false">
        <span class="folder__icon">${escapeHtml(c.icon)}</span>
        <span class="folder__title">${escapeHtml(c.title)}</span>
        <span class="folder__law">${escapeHtml(c.law)}</span>
      </button>
      <ol class="folder__body" data-body="${index}" hidden>
        ${c.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
      </ol>
    </article>`;
}

/**
 * Мини-тест с немедленной проверкой: после ответа видно, где ошибка.
 * Возвращает подходящий результат по числу верных ответов.
 */
export async function runQuiz(ui: UI, questions: TestQuestion[], results: QuizResult[], onResult?: (correct: number, total: number) => void, onAnswer?: (question: TestQuestion, picked: number) => void): Promise<QuizResult | null> {
  let correct = 0;

  await ui.screen(
    host =>
      new Promise<void>(resolve => {
        const show = (index: number): void => {
          const q = questions[index];
          if (!q) return resolve();
          host.innerHTML = `
            <div class="quiz">
              <header class="quiz__head">
                <span class="screen__eyebrow">Проверка знаний</span>
                <span class="quiz__progress">Вопрос ${index + 1} из ${questions.length}</span>
              </header>
              <p class="quiz__text">${escapeHtml(q.text)}</p>
              <div class="quiz__options">
                ${q.options
                  .map(
                    (text, i) => `
                  <button class="choice" type="button" data-answer="${i}">
                    <span class="choice__num">${i + 1}</span>
                    <span class="choice__text">${escapeHtml(text)}</span>
                  </button>`
                  )
                  .join('')}
              </div>
              <p class="quiz__verdict" hidden></p>
              <div class="quiz__actions"><button class="btn btn--primary" type="button" data-next hidden>Дальше</button></div>
            </div>`;

          const verdict = host.querySelector<HTMLElement>('.quiz__verdict');
          const next = host.querySelector<HTMLButtonElement>('[data-next]');
          host.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(button => {
            button.addEventListener('click', () => {
              const picked = Number(button.dataset['answer']);
              const right = picked === q.correct;
              onAnswer?.(q, picked);
              if (right) correct += 1;
              host.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(b => {
                b.disabled = true;
                const i = Number(b.dataset['answer']);
                if (i === q.correct) b.classList.add('is-right');
                else if (i === picked) b.classList.add('is-wrong');
              });
              if (verdict) {
                verdict.hidden = false;
                verdict.textContent = right ? 'Верно.' : `Не совсем. Верный ответ: ${q.options[q.correct] ?? ''}`;
                verdict.classList.toggle('is-wrong', !right);
              }
              if (next) {
                next.hidden = false;
                next.textContent = index === questions.length - 1 ? 'Узнать результат' : 'Дальше';
                next.addEventListener('click', () => show(index + 1));
                next.focus();
              }
            });
          });
          host.querySelector<HTMLButtonElement>('[data-answer]')?.focus();
        };
        show(0);
      })
  );

  onResult?.(correct, questions.length);
  return pickResult(results, correct, questions.length);
}

/** «3/3» — все верно, «1-2» — диапазон, «0» — ни одного. */
export function pickResult(results: QuizResult[], correct: number, total: number): QuizResult | null {
  for (const r of results) {
    const w = r.when.trim();
    if (w === `${total}/${total}` && correct === total) return r;
    if (/^\d+-\d+$/.test(w)) {
      const [lo = 0, hi = 0] = w.split('-').map(Number);
      if (correct >= lo && correct <= hi) return r;
    }
    if (/^\d+$/.test(w) && Number(w) === correct) return r;
  }
  return null;
}

export function traitsOf(state: GameState): string {
  const labels: Record<string, string> = {
    confidence: 'уверенность',
    reputation: 'репутация',
    responsibility: 'ответственность',
    awareness: 'осознанность',
    law: 'знание закона'
  };
  const top = Object.entries(labels)
    .map(([key, label]) => ({ label, value: state.scales[key as keyof GameState['scales']] }))
    .filter(t => t.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map(t => t.label);
  return top.length ? top.join(', ') : 'настойчивость';
}
