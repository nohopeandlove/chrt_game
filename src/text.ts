import type { GameState } from './types.ts';
import { specialty } from './content.ts';

/**
 * Подстановки в текстах сценария.
 *   {playerName}            — имя игрока
 *   {g:мужская|женская}     — форма слова по выбранному персонажу
 *   {specialtyTitle}        — специальность из резюме
 * Неизвестный токен остаётся в тексте как есть — так его видно при вычитке.
 */
export function fill(text: string, state: GameState, extra: Record<string, string> = {}): string {
  return text.replace(/\{([^}]*)\}/g, (whole, body: string) => {
    if (body.startsWith('g:')) {
      const [male = '', female = ''] = body.slice(2).split('|');
      return state.gender === 'm' ? male : female;
    }
    switch (body) {
      case 'playerName':
        return state.playerName;
      case 'specialtyTitle':
        return specialty(state.specialty)?.title ?? 'своей специальности';
      case 'resumePercent':
        return String(state.resumePercent);
      case 'resumeQuality':
        return state.resumePercent >= 90
          ? 'Качественное'
          : state.resumePercent >= 60
            ? 'Хорошее'
            : 'Скромное';
      default:
        return extra[body] ?? whole;
    }
  });
}
