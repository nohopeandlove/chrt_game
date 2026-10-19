#!/usr/bin/env node
// Проверка контента игры «Я — специалист». Без зависимостей.
// Запуск: node tools/validate.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');

const errors = [];
const warnings = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

function load(relPath) {
  const full = join(CONTENT, relPath);
  try {
    return JSON.parse(readFileSync(full, 'utf8'));
  } catch (e) {
    fail(relPath, `не читается как JSON — ${e.message}`);
    return null;
  }
}

const specialties = load('specialties.json');
const endings = load('endings.json');
const characters = load('characters.json');
const vacancies = load('vacancies.json');
const tests = load('tests.json');
const achievements = load('achievements.json');
const backgrounds = load('backgrounds.json');

const sceneFiles = readdirSync(join(CONTENT, 'scenes')).filter(f => f.endsWith('.json')).sort();
const scenes = sceneFiles
  .map(f => ({ file: `scenes/${f}`, data: load(`scenes/${f}`) }))
  .filter(s => s.data);

if (errors.length) {
  report();
  process.exit(1);
}

const specialtyIds = new Set(specialties.items.map(s => s.id));
const characterIds = new Set(characters.items.map(c => c.id));
const achievementIds = new Set(achievements.map(a => a.id));
const backgroundIds = new Set(backgrounds.items.map(b => b.id));
const sceneIds = new Set(scenes.map(s => s.data.id));

const EMOTIONS = new Set(['neutral', 'smile', 'joy', 'worry', 'stern']);
const SCALES = new Set(['energy', 'mood', 'confidence', 'reputation', 'law', 'responsibility', 'awareness', 'risk']);
const NODE_TYPES = new Set(['say', 'think', 'narrate', 'chapter', 'choice', 'branch', 'screen', 'card', 'quiz', 'minigame', 'results', 'award', 'goto']);
const REQUIRED = {
  say: ['who', 'text'], think: ['text'], narrate: ['text'],
  chapter: ['title', 'text'], choice: ['options'], branch: ['on', 'cases'],
  screen: ['screen'], card: ['icon', 'title'], quiz: ['questions', 'results'],
  minigame: ['variants', 'options'], results: ['rows'], award: ['achievement'], goto: ['scene']
};

// --- специальности ------------------------------------------------------
for (const s of specialties.items) {
  if (!s.title || !s.short) fail('specialties.json', `у «${s.id}» нет title или short`);
  if (!Array.isArray(s.skills) || !s.skills.length) warn('specialties.json', `у «${s.id}» пустой список навыков`);
}

// --- персонажи ----------------------------------------------------------
const PORTRAIT_STYLES = new Set(['buns', 'spiky', 'bob', 'wavy', 'long', 'ponytail', 'braid']);
const FRINGES = new Set(['part', 'bangs', 'short']);
const COLLARS = new Set(['tee', 'shirt', 'blazer', 'hoodie']);
for (const c of characters.items) {
  const w = `characters.json/${c.id}`;
  const p = c.portrait || {};
  if (!PORTRAIT_STYLES.has(p.style)) fail(w, `неизвестный силуэт причёски «${p.style}»`);
  if (!FRINGES.has(p.fringe)) fail(w, `неизвестная линия волос «${p.fringe}»`);
  if (!COLLARS.has(p.collar)) fail(w, `неизвестный крой одежды «${p.collar}»`);
  if (c.defaultEmotion && !EMOTIONS.has(c.defaultEmotion)) fail(w, `неизвестная эмоция «${c.defaultEmotion}»`);
  for (const [key, val] of Object.entries(p)) {
    if (typeof val === 'string' && val.startsWith('#') && !/^#[0-9A-Fa-f]{6}$/.test(val)) {
      fail(w, `цвет ${key} = «${val}» не в формате #RRGGBB`);
    }
  }
}
if (characters.items.filter(c => c.playable).length !== 2) {
  fail('characters.json', 'должно быть ровно два играбельных персонажа');
}

// --- вакансии -----------------------------------------------------------
const usedWords = new Map();
for (const v of vacancies.items) {
  const w = `vacancies.json/${v.id}`;
  if (!['real', 'trap', 'scam'].includes(v.kind)) fail(w, `неизвестный тип «${v.kind}»`);
  if (typeof v.salary !== 'number') fail(w, 'оклад должен быть числом');

  for (const sp of v.specialties || []) {
    if (!specialtyIds.has(sp)) fail(w, `ссылка на несуществующую специальность «${sp}»`);
  }

  if (v.kind === 'real') {
    if (!v.secretWord) {
      fail(w, 'у настоящей вакансии нет секретного слова');
    } else {
      // слово обязано встречаться в тексте описания — иначе его невозможно найти
      const text = JSON.stringify(v.description).toLowerCase();
      if (!text.includes(v.secretWord.toLowerCase())) {
        fail(w, `секретное слово «${v.secretWord}» не встречается в описании вакансии`);
      }
      if (usedWords.has(v.secretWord)) {
        fail(w, `секретное слово «${v.secretWord}» уже занято вакансией ${usedWords.get(v.secretWord)}`);
      }
      usedWords.set(v.secretWord, v.id);
    }
    if (!v.specialties?.length) fail(w, 'не указано, каким специальностям подходит вакансия');
  }

  if (v.kind === 'trap' && !v.reject) fail(w, 'у вакансии-ловушки нет текста отказа');

  if (v.kind === 'scam') {
    if (!v.cardForm) fail(w, 'у мошеннической вакансии нет описания формы карты');
    else {
      if (v.cardForm.interactive !== true) fail(w, 'форма мошенников должна реагировать на обращение к полям');
      if (!v.cardForm.warning) fail(w, 'нет текста предупреждения о мошенниках');
    }
  }
}
for (const sp of specialtyIds) {
  const n = vacancies.items.filter(v => v.kind === 'real' && v.specialties.includes(sp)).length;
  if (n < 2) fail('vacancies.json', `для специальности «${sp}» нужны минимум две настоящие вакансии`);
}

// Each professional path must end with its own text.
for (const sp of specialtyIds) {
 if (typeof endings[sp] !== 'string' || !endings[sp].trim()) fail('endings.json', `нет концовки для «${sp}»`);
}
if (new Set(Object.values(endings)).size !== specialtyIds.size) fail('endings.json', 'концовки специальностей должны различаться');

// --- тестовые задания ---------------------------------------------------
const setBySpecialty = new Set();
for (const set of tests.sets) {
  const w = `tests.json/${set.id}`;
  if (!specialtyIds.has(set.specialty)) fail(w, `ссылка на несуществующую специальность «${set.specialty}»`);
  setBySpecialty.add(set.specialty);
  if (set.questions.length !== 4) warn(w, `${set.questions.length} вопроса вместо четырёх`);
  set.questions.forEach((q, i) => {
    if (!Array.isArray(q.options) || q.options.length < 2) fail(w, `вопрос ${i + 1}: меньше двух вариантов`);
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) {
      fail(w, `вопрос ${i + 1}: неверный индекс правильного ответа`);
    }
    if (!q.heroComment) warn(w, `вопрос ${i + 1}: нет реплики героя`);
  });
  for (const key of ['pass', 'fail']) {
    if (!set[key]?.text) fail(w, `нет текста «${key}»`);
  }
}
for (const sp of specialtyIds) {
  if (!setBySpecialty.has(sp)) fail('tests.json', `для специальности «${sp}» нет набора заданий`);
}
// правка 8: тексты итогов не должны повторяться между наборами
const passTexts = tests.sets.map(s => s.pass.text);
if (new Set(passTexts).size !== passTexts.length) {
  fail('tests.json', 'тексты успешного прохождения повторяются между наборами (правка 8)');
}
const failTexts = tests.sets.map(s => s.fail.text);
if (new Set(failTexts).size !== failTexts.length) {
  fail('tests.json', 'тексты неудачи повторяются между наборами (правка 8)');
}

// --- локации ------------------------------------------------------------
for (const b of backgrounds.items) {
  const w = `backgrounds.json/${b.id}`;
  if (!b.layers?.length) fail(w, 'не описаны слои');
  if (!b.animation?.length) warn(w, 'не описана ни одна анимация');
}

// --- сцены --------------------------------------------------------------
const GENDER_TOKEN = /\{g:([^|{}]*)\|([^|{}]*)\}/g;
const KNOWN_TOKENS = new Set(['playerName', 'specialtyTitle', 'resumePercent', 'position', 'company', 'resumeQuality', 'topTraits', 'careerEnding']);
const gotoTargets = [];

for (const { file, data } of scenes) {
  if (!data.id) { fail(file, 'нет id сцены'); continue; }
  if (data.background && !backgroundIds.has(data.background)) {
    fail(file, `неизвестная локация «${data.background}»`);
  }
  const nodeIds = new Set();

  const checkText = (where, text) => {
    if (typeof text !== 'string') return;
    for (const m of text.matchAll(/\{([^}]*)\}/g)) {
      const body = m[1];
      if (body.startsWith('g:')) {
        if (!/^g:[^|{}]*\|[^|{}]*$/.test(body)) fail(where, `сломанная форма рода: «${m[0]}»`);
      } else if (!KNOWN_TOKENS.has(body)) {
        warn(where, `неизвестная подстановка «${m[0]}»`);
      }
    }
  };

  const checkLine = (where, line) => {
    if (!line) return;
    if (line.who && line.who !== 'player' && !characterIds.has(line.who)) {
      fail(where, `неизвестный персонаж «${line.who}»`);
    }
    if (line.emotion && !EMOTIONS.has(line.emotion)) {
      fail(where, `неизвестная эмоция «${line.emotion}»`);
    }
    checkText(where, line.text);
  };

  for (const node of data.nodes || []) {
    const where = `${file}/${node.id || '?'}`;
    if (!node.id) fail(where, 'у узла нет id');
    if (nodeIds.has(node.id)) fail(where, 'повторяющийся id узла');
    nodeIds.add(node.id);

    if (!NODE_TYPES.has(node.type)) { fail(where, `неизвестный тип узла «${node.type}»`); continue; }
    for (const key of REQUIRED[node.type]) {
      if (node[key] === undefined) fail(where, `у узла типа «${node.type}» нет поля «${key}»`);
    }
    if (node.background && !backgroundIds.has(node.background)) {
      fail(where, `неизвестная локация «${node.background}»`);
    }

    checkLine(where, node);
    checkLine(where, node.prompt);
    checkLine(where, node.say);
    checkText(where, node.title);

    if (node.type === 'goto') gotoTargets.push([where, node.scene]);
    if (node.then?.scene) gotoTargets.push([where, node.then.scene]);
    if (node.achievement && !achievementIds.has(node.achievement)) {
      fail(where, `неизвестное достижение «${node.achievement}»`);
    }

    for (const opt of node.options || []) {
      checkText(where, opt.text);
      checkLine(where, opt.reply);
      if (opt.award && !achievementIds.has(opt.award)) fail(where, `неизвестное достижение «${opt.award}»`);
      for (const scale of Object.keys(opt.effects || {})) {
        if (!SCALES.has(scale)) fail(where, `неизвестная шкала «${scale}»`);
      }
      if (opt.score !== undefined && ![1, 0, -1].includes(opt.score)) {
        fail(where, `score должен быть 1, 0 или -1, а не ${opt.score}`);
      }
    }

    if (node.type === 'choice' && (node.options || []).length < 2) {
      fail(where, 'в выборе меньше двух вариантов');
    }

    if (node.type === 'branch') {
      for (const [name, br] of Object.entries(node.cases)) {
        checkLine(`${where}/${name}`, br.say);
        if (br.goto && !(data.nodes || []).some(n => n.id === br.goto)) {
          fail(`${where}/${name}`, `переход на несуществующий узел «${br.goto}»`);
        }
      }
    }

    if (node.type === 'quiz') {
      node.questions.forEach((q, i) => {
        if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) {
          fail(where, `вопрос ${i + 1}: неверный индекс правильного ответа`);
        }
      });
      for (const r of node.results) {
        checkLine(where, r.say);
        if (r.award && !achievementIds.has(r.award)) fail(where, `неизвестное достижение «${r.award}»`);
      }
    }

    if (node.type === 'minigame') {
      for (const v of node.variants) {
        if (!specialtyIds.has(v.specialty)) fail(where, `неизвестная специальность «${v.specialty}»`);
        checkLine(where, v.intro);
      }
      const covered = new Set(node.variants.map(v => v.specialty));
      for (const sp of specialtyIds) {
        if (!covered.has(sp)) fail(where, `нет варианта задания для специальности «${sp}» (правка 6)`);
      }
    }
  }
}

for (const [where, scene] of gotoTargets) {
  if (!sceneIds.has(scene)) fail(where, `переход в несуществующую сцену «${scene}»`);
}

// достижимость сцен
const reachable = new Set(['prologue']);
let grew = true;
while (grew) {
  grew = false;
  for (const { data } of scenes) {
    if (!reachable.has(data.id)) continue;
    for (const node of data.nodes || []) {
      const target = node.scene || node.then?.scene;
      if (target && !reachable.has(target)) { reachable.add(target); grew = true; }
    }
  }
}
for (const id of sceneIds) {
  if (!reachable.has(id)) fail('scenes', `сцена «${id}» недостижима из пролога`);
}

// --- вывод --------------------------------------------------------------
function report() {
  for (const w of warnings) console.log(`  предупреждение  ${w}`);
  for (const e of errors) console.log(`  ОШИБКА          ${e}`);
}

console.log('Проверка контента «Я — специалист»\n');
console.log(`  сцен: ${scenes.length}`);
console.log(`  персонажей: ${characters.items.length}`);
console.log(`  вакансий: ${vacancies.items.length} (настоящих: ${vacancies.items.filter(v => v.kind === 'real').length})`);
console.log(`  наборов тестов: ${tests.sets.length}`);
console.log(`  специальностей: ${specialties.items.length}`);
console.log(`  локаций: ${backgrounds.items.length}`);
console.log(`  достижений: ${achievements.length}\n`);
report();

if (errors.length) {
  console.log(`\nНе пройдено: ошибок ${errors.length}, предупреждений ${warnings.length}`);
  process.exit(1);
}
console.log(`Всё в порядке. Предупреждений: ${warnings.length}`);
