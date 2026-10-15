import './styles.css';
import { installLearningTools, orientation } from './learning.ts';
import { Engine } from './engine.ts';
import { UI } from './ui.ts';
import { clearSave, load, newGame, save } from './state.ts';
import type { GameState } from './types.ts';

const root = document.getElementById('app');
if (!root) throw new Error('Нет контейнера #app');

const ui = new UI(root);
let activeState: GameState | null = null;
installLearningTools(root, () => activeState);

async function start(): Promise<void> {
  const saved = load();
  const choice = await ui.menu(saved !== null);

  let state: GameState;
  if (choice === 'continue' && saved) {
    state = saved;
  } else if (choice === 'continue') {
    state = newGame('Друг', 'f');
  } else {
    clearSave();
    state = newGame(choice.name, choice.gender);
  }
  activeState = state;
  save(state);
  if (choice !== 'continue') await orientation(ui, state);

  await new Engine(ui, state).run();

  // Финальный экран закрыт кнопкой «Пройти заново» — возвращаемся в меню.
  clearSave();
  activeState = null;
  await start();
}

void start();
