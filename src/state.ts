import { newAnalytics, restoreAnalytics } from './reporting.ts';
import type { GameState, Option, Scale } from './types.ts';
import { FIRST_SCENE, scenes } from './content.ts';

const SAVE_KEY = 'ya-specialist/save/v1';

export function newGame(playerName: string, gender: 'm' | 'f'): GameState {
  return {
    analytics: newAnalytics(),
    learning: { visited: [], attempts: [], baseline: null, final: null },
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
    // Игра остаётся доступной, но предупреждаем о потере прогресса.
    document.dispatchEvent(new Event('game-save-unavailable'));
  }
}

export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (typeof parsed.playerName !== 'string' || typeof parsed.scene !== 'string' || !scenes.has(parsed.scene)) return null;
    if (!Array.isArray(parsed.achievements) || !Array.isArray(parsed.rejectedJobs) ||
        !parsed.scales || !parsed.flags || !parsed.interview || !parsed.resume) return null;
    // Старое сохранение может не знать новых полей — дополняем значениями по умолчанию.
    const state = { ...newGame(parsed.playerName, parsed.gender ?? 'f'), ...parsed } as GameState;
    state.analytics = restoreAnalytics(parsed.analytics);
    state.learning = {
      ...(parsed.learning?.finalForm === 'transfer-v2' ? { finalForm: 'transfer-v2' as const } : {}),
      visited: Array.isArray(parsed.learning?.visited) ? [...new Set(parsed.learning.visited.filter(x => typeof x === 'string' && scenes.has(x)))] : [],
      attempts: Array.isArray(parsed.learning?.attempts) ? parsed.learning.attempts.filter(x =>
        typeof x?.topic === 'string' && Number.isInteger(x.correct) && Number.isInteger(x.total) &&
        x.total > 0 && x.correct >= 0 && x.correct <= x.total) : [],
      baseline: Number.isInteger(parsed.learning?.baseline) && Number(parsed.learning?.baseline) >= 0 && Number(parsed.learning?.baseline) <= 3 ? parsed.learning!.baseline : null,
      final: Number.isInteger(parsed.learning?.final) && Number(parsed.learning?.final) >= 0 && Number(parsed.learning?.final) <= 3 ? parsed.learning!.final : null
    };
    return state;
  } catch {
    return null;
  }
}

/** A name-only autosave is not a played session. */
export function canContinue(state: GameState | null): boolean {
  return state !== null && (state.scene !== FIRST_SCENE || state.nodeIndex > 0 ||
    state.learning.baseline !== null || state.learning.attempts.length > 0 ||
    state.analytics.events.length > 0 || state.analytics.outcomes.length > 0);
}

export function clearSave(): boolean {
  try {
    localStorage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
