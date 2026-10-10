import type { GameState, Option, Scale } from './types.ts';
import { FIRST_SCENE } from './content.ts';

const SAVE_KEY = 'ya-specialist/save/v1';

export function newGame(playerName: string, gender: 'm' | 'f'): GameState {
  return {
    playerName,
    gender,
    specialty: null,
    resume: {},
    resumePercent: 0,
    job: null,
    rejectedJobs: [],
    interview: { good: 0, neutral: 0, bad: 0 },
    scales: {
      energy: 0, mood: 0, confidence: 0, reputation: 0,
      law: 0, responsibility: 0, awareness: 0, risk: 0
    },
    flags: {},
    achievements: [],
    scene: FIRST_SCENE,
    nodeIndex: 0
  };
}

export function applyOption(state: GameState, option: Option): void {
  for (const [scale, delta] of Object.entries(option.effects ?? {})) {
    state.scales[scale as Scale] += delta as number;
  }
  for (const [flag, value] of Object.entries(option.set ?? {})) {
    state.flags[flag] = value;
  }
  // Достижение из option.award выдаёт движок — вместе с экраном-поздравлением.
  if (option.score === 1) state.interview.good += 1;
  else if (option.score === 0) state.interview.neutral += 1;
  else if (option.score === -1) state.interview.bad += 1;
}

export function award(state: GameState, id: string): boolean {
  if (state.achievements.includes(id)) return false;
  state.achievements.push(id);
  return true;
}

export function save(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Приватный режим или запрет на хранилище — игра продолжается без сохранения.
  }
}

export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (!parsed.playerName || !parsed.scene) return null;
    // Старое сохранение может не знать новых полей — дополняем значениями по умолчанию.
    return { ...newGame(parsed.playerName, parsed.gender ?? 'f'), ...parsed } as GameState;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ничего
  }
}
