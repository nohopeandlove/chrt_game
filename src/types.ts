export type Emotion = 'neutral' | 'smile' | 'joy' | 'worry' | 'stern';

export type Scale =
  | 'energy' | 'mood' | 'confidence' | 'reputation'
  | 'law' | 'responsibility' | 'awareness' | 'risk';

export type HairStyle = 'buns' | 'spiky' | 'bob' | 'wavy' | 'long' | 'ponytail' | 'braid';
export type Fringe = 'part' | 'bangs' | 'short';
export type Collar = 'tee' | 'shirt' | 'blazer' | 'hoodie';

export interface Portrait {
  style: HairStyle;
  fringe: Fringe;
  hair: string;
  hairDark: string;
  hairLight: string;
  brow: string;
  eye: string;
  lip: string;
  lips: boolean;
  lashes: boolean;
  cloth: string;
  clothDark: string;
  clothInner?: string;
  collar: Collar;
  bg: string;
  glasses?: string;
  glassesRound?: boolean;
  glassesTint?: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  playable?: boolean;
  defaultEmotion?: Emotion;
  portrait: Portrait;
}

export interface Specialty {
  id: string;
  title: string;
  short: string;
  skills: string[];
}

export interface Line {
  who?: string;
  emotion?: Emotion;
  text: string;
}

export interface Option {
  text: string;
  score?: 1 | 0 | -1;
  effects?: Partial<Record<Scale, number>>;
  set?: Record<string, string | boolean>;
  award?: string;
  reply?: Line;
  outcome?: string;
  note?: string;
}

export type FieldType = 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'chips';

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Подпись галочки, которая отключает поле, например «нет отчества». */
  toggle?: string;
  /** Откуда брать варианты: specialties или specialty.skills. */
  source?: string;
  options?: string[];
  default?: string;
  note?: string;
}

export interface FormBlock {
  id: string;
  title: string;
  note?: string;
  /** Галочка, сворачивающая весь блок, например «опыта работы пока нет». */
  toggle?: { id: string; label: string; hint: string };
  fields: Field[];
}

export interface FormSpec {
  blocks: FormBlock[];
  actions: string[];
}

export type VacancyKind = 'real' | 'trap' | 'scam';

export interface Vacancy {
  id: string;
  kind: VacancyKind;
  title: string;
  company: string;
  salary: number;
  format: string;
  teaser: string;
  secretWord?: string;
  specialties: string[];
  description: {
    intro?: string;
    offer?: string[];
    duties?: string[];
    requirements?: string[];
    plus?: string[];
    stages?: string;
    ps?: string;
  };
  reject?: string;
  heroComment?: string;
  cardForm?: { interactive: boolean; warning: string; note?: string };
}

export interface VacancyResponses {
  ok: string;
  okHero: string;
  wrongWord: string;
  wrongSpecialty: string;
}

export interface JobRef {
  id: string;
  title: string;
  company: string;
}

export interface TestQuestion {
  explanation?: string;
  text: string;
  options: string[];
  correct: number;
  heroComment?: string;
}

export interface TestSet {
  id: string;
  specialty: string;
  title: string;
  questions: TestQuestion[];
  pass: { text: string; hero: string };
  fail: { text: string; hero: string };
}

export type ResumeValue = string | string[];
export type ResumeData = Record<string, ResumeValue>;

export interface QuizResult {
  /** «3/3», «1-2», «0» — по числу верных ответов. */
  when: string;
  say?: Line;
  effects?: Partial<Record<Scale, number>>;
  award?: string;
  hint?: string;
}

export interface CompareColumn {
  icon: string;
  title: string;
  law: string;
  points: string[];
}

export interface MinigameVariant {
  specialty: string;
  intro: Line;
  task: string;
  hint: string;
}

export interface ResultRow {
  label: string;
  value: string;
}

export interface Node {
  id: string;
  type:
    | 'say' | 'think' | 'narrate' | 'chapter' | 'choice' | 'branch'
    | 'screen' | 'card' | 'quiz' | 'minigame' | 'results' | 'award' | 'goto';
  who?: string;
  emotion?: Emotion;
  text?: string;
  title?: string;
  number?: number;
  background?: string;
  icon?: string;
  prompt?: Line;
  options?: Option[];
  scene?: string;
  screen?: string;
  form?: FormSpec;
  columns?: CompareColumn[];
  summary?: string;
  questions?: TestQuestion[];
  results?: QuizResult[];
  variants?: MinigameVariant[];
  rows?: ResultRow[];
  showAchievements?: boolean;
  actions?: string[];
  achievement?: string;
  when?: string;
  then?: { type: 'goto'; scene: string };
  on?: string;
  cases?: Record<string, { say?: Line; banner?: string; goto?: string }>;
  note?: string;
}

export interface Scene {
  id: string;
  title: string;
  background?: string;
  nodes: Node[];
}

export interface LearningAttempt {
  topic: string;
  correct: number;
  total: number;
}

export interface LearningProgress {
  finalForm?: 'transfer-v2';
  visited: string[];
  attempts: LearningAttempt[];
  baseline: number | null;
  final: number | null;
}

export type TaskCategory = 'portfolio' | 'resume' | 'test' | 'interview' | 'law';

export interface ActivityEvent {
  at: string;
  category: TaskCategory | 'jobs' | 'story';
  question: string;
  answer: string;
  correct: boolean | null;
  feedback: string;
}

export interface TaskOutcome {
  at: string;
  category: TaskCategory;
  earned: number;
  possible: number;
}

export interface Analytics {
  sessionId: string;
  startedAt: string;
  finishedAt: string | null;
  fullName: string;
  group: string;
  events: ActivityEvent[];
  outcomes: TaskOutcome[];
}

export interface GameState {
  analytics: Analytics;
  learning: LearningProgress;
  playerName: string;
  gender: 'm' | 'f';
  specialty: string | null;
  resume: ResumeData;
  resumePercent: number;
  /** Вакансия, на которую откликнулись и прошли гейт. */
  job: JobRef | null;
  /** Вакансии, где уже получили отказ — после теста или собеседования. */
  rejectedJobs: string[];
  interview: { good: number; neutral: number; bad: number };
  scales: Record<Scale, number>;
  flags: Record<string, string | boolean>;
  achievements: string[];
  scene: string;
  nodeIndex: number;
}
