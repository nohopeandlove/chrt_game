import charactersJson from '../content/characters.json';
import specialtiesJson from '../content/specialties.json';
import achievementsJson from '../content/achievements.json';
import backgroundsJson from '../content/backgrounds.json';

import prologue from '../content/scenes/00-prologue.json';
import portfolio from '../content/scenes/01-portfolio.json';
import resume from '../content/scenes/02-resume.json';
import jobs from '../content/scenes/03-jobs.json';
import test from '../content/scenes/04-test.json';
import interview from '../content/scenes/05-interview.json';
import labor from '../content/scenes/06-labor.json';
import firstDay from '../content/scenes/07-first-day.json';

import vacanciesJson from '../content/vacancies.json';
import testsJson from '../content/tests.json';

import type { Character, Scene, Specialty, TestSet, Vacancy, VacancyResponses } from './types.ts';

export const vacancies = vacanciesJson.items as Vacancy[];
export const vacancyResponses = vacanciesJson.responses as VacancyResponses;

export const tests = {
  letter: testsJson.letter,
  outro: testsJson.outro,
  sets: testsJson.sets as TestSet[]
};

export const characters = new Map<string, Character>(
  (charactersJson.items as unknown as Character[]).map(c => [c.id, c])
);

export const specialties = specialtiesJson.items as Specialty[];

export const achievements = achievementsJson as { id: string; title: string; icon?: string; how: string }[];

export const backgroundTitles = new Map<string, string>(
  backgroundsJson.items.map(b => [b.id, b.title])
);

const sceneList = [
  prologue, portfolio, resume, jobs, test, interview, labor, firstDay
] as unknown as Scene[];

export const scenes = new Map<string, Scene>(sceneList.map(s => [s.id, s]));

export const FIRST_SCENE = 'prologue';

export function character(id: string, gender: 'm' | 'f'): Character {
  const resolved = id === 'player' ? (gender === 'm' ? 'hero-m' : 'hero-f') : id;
  const found = characters.get(resolved);
  if (!found) throw new Error(`Неизвестный персонаж: ${id}`);
  return found;
}

export function specialty(id: string | null): Specialty | null {
  return specialties.find(s => s.id === id) ?? null;
}
