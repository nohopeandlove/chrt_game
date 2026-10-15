import type { UI } from '../ui.ts';
import type { GameState, Scale, Scene } from '../types.ts';
import { recordEvent } from '../reporting.ts';
import { save } from '../state.ts';

const labels: Record<Scale, string> = {
  energy: 'Энергия', mood: 'Настроение', confidence: 'Уверенность', reputation: 'Репутация',
  law: 'Знание закона', responsibility: 'Ответственность', awareness: 'Осознанность', risk: 'Риск ошибок'
};
export async function summarizeScene(ui: UI, state: GameState, scene: Scene, start: Record<Scale, number>): Promise<void> {
  const changes = (Object.keys(labels) as Scale[]).filter(key => state.scales[key] !== start[key]).map(key => {
    const delta = state.scales[key] - start[key];
    return { label: labels[key], value: `${delta > 0 ? '+' : '−'}${Math.abs(delta)} · теперь ${state.scales[key]}` };
  });
  const rows = changes.length ? changes : [{ label: 'Игровые показатели', value: 'Без изменений' }];
  recordEvent(state, { category: 'story', question: `Итоги: ${scene.title}`, answer: rows.map(r => `${r.label}: ${r.value}`).join('; '), correct: null, feedback: 'Изменения игровых шкал за эту сцену. Это последствия решений героя, а не психологическая оценка студента.' });
  save(state);
  await ui.table(`Итоги · ${scene.title}`, [...rows, { label: 'Как читать итоги', value: 'Изменения за эту сцену, а не оценка вашей личности. Рост риска ошибок — повод проверить решение.' }]);
}
