import { recordEvent, recordOutcome } from './reporting.ts';
import { recordAttempt } from './learning.ts';
import { character, scenes, achievements as allAchievements } from './content.ts';
import { applyOption, award, save } from './state.ts';
import { fill } from './text.ts';
import { UI } from './ui.ts';
import { runPortfolio } from './screens/portfolio.ts';
import { summarizeScene } from './screens/scene-summary.ts';
import { runResume } from './screens/resume.ts';
import { runJobs } from './screens/jobs.ts';
import { runLetter, runTest } from './screens/test.ts';
import { runCompare, runQuiz, traitsOf } from './screens/labor.ts';
import { runFinal } from './screens/final.ts';
import type { GameState, Line, MinigameVariant, Node, Option, Scene } from './types.ts';

export class Engine {
  constructor(private ui: UI, private state: GameState) {}

  async run(): Promise<void> {
    let sceneId: string | null = this.state.scene;
    while (sceneId) {
      const scene = scenes.get(sceneId);
      if (!scene) throw new Error(`Неизвестная сцена: ${sceneId}`);
      sceneId = await this.playScene(scene);
    }
  }

  private async playScene(scene: Scene): Promise<string | null> {
    this.ui.setBackground(scene.background);
    if (!this.state.learning.visited.includes(scene.id)) this.state.learning.visited.push(scene.id);
    // Сцену всегда начинаем сначала: узлы короткие, а сохранение хранит сцену.
    if (scene.id === 'interview') this.state.interview = { good: 0, neutral: 0, bad: 0 };
    this.state.scene = scene.id;
    this.state.nodeIndex = 0;
    save(this.state);

    const start = { ...this.state.scales };
    let summarized = false;
    const summary = async (): Promise<void> => {
      if (summarized) return;
      summarized = true;
      await summarizeScene(this.ui, this.state, scene, start);
    };
    let index = 0;
    while (index < scene.nodes.length) {
      const node = scene.nodes[index];
      if (!node) break;

      this.state.nodeIndex = index;
      save(this.state);

      if (node.type === 'chapter' && index > 0) await summary();
      if (node.type === 'results') {
        await summary();
        if (node.screen !== 'final') { index += 1; continue; }
      }
      const jump = await this.playNode(node, scene);
      if (jump?.kind === 'scene') {
        await summary();
        return jump.id;
      }
      if (jump?.kind === 'node') {
        const target = scene.nodes.findIndex(n => n.id === jump.id);
        if (target < 0) throw new Error(`Узел ${jump.id} не найден в сцене ${scene.id}`);
        index = target;
        continue;
      }
      index += 1;
    }
    return null;
  }

  private async playNode(node: Node, scene: Scene): Promise<Jump | null> {
    if (node.background) this.ui.setBackground(node.background);

    switch (node.type) {
      case 'say':
      case 'think':
      case 'narrate':
        await this.speak(node.type, node);
        return null;

      case 'finale':
        await this.ui.finale(this.t(node.title ?? ''), this.t(node.text ?? ''));
        return null;

      case 'chapter': {
        await this.ui.chapter(node.number, this.t(node.title ?? ''), this.t(node.text ?? ''));
        if (node.then?.scene) return { kind: 'scene', id: node.then.scene };
        return null;
      }

      case 'choice': {
        if (node.prompt) await this.speak('say', node.prompt);
        const options = node.options ?? [];
        const picked = await this.ui.choice({ options: options.map(o => this.t(o.text)) });
        const option = options[picked];
        if (!option) return null;
        recordEvent(this.state, { category: scene.id === 'interview' ? 'interview' : 'story', question: node.prompt?.text ?? node.id, answer: option.text, correct: option.score === undefined ? null : option.score === 1, feedback: option.reply?.text ?? option.note ?? 'Обсудите последствия выбранного действия.' });
        applyOption(this.state, option);
        save(this.state);
        if (option.reply) await this.speak('say', option.reply);
        if (option.award) await this.showAchievement(option.award);
        return null;
      }

      case 'branch': {
        const key = this.resolveBranch(node);
        const chosen = node.cases?.[key];
        if (!chosen) return null;
        if (chosen.say) await this.speak(chosen.say.who ? 'say' : 'think', chosen.say);
        if (chosen.banner) await this.ui.banner(this.t(chosen.banner));
        return chosen.goto ? { kind: 'node', id: chosen.goto } : null;
      }

      case 'card':
        await this.ui.card(node.icon ?? '📘', this.t(node.title ?? ''));
        return null;

      case 'award': {
        if (node.achievement && this.holds(node.when)) {
          await this.showAchievement(node.achievement);
        }
        return null;
      }

      case 'goto':
        return node.scene ? { kind: 'scene', id: node.scene } : null;

      case 'screen':
      case 'quiz':
      case 'minigame':
      case 'results': {
        const screen = node.screen ?? '';
        if (screen === 'portfolio') {
          await runPortfolio(this.ui, this.state);
          return null;
        }
        if (screen === 'resume' && node.form) {
          await runResume(this.ui, this.state, node.form);
          recordOutcome(this.state, 'resume', this.state.resumePercent, 100);
          save(this.state);
          return null;
        }
        if (screen === 'jobs') {
          await runJobs(this.ui, this.state);
          save(this.state);
          return null;
        }
        if (screen === 'letter') {
          await runLetter(this.ui, this.state);
          return null;
        }
        if (screen === 'test') {
          await runTest(this.ui, this.state);
          save(this.state);
          return null;
        }
        if (screen === 'compare' && node.columns) {
          await runCompare(this.ui, node.columns, node.summary ?? '');
          await this.showAchievement('informed-choice');
          return null;
        }
        if (node.type === 'quiz' && node.questions && node.results) {
          if (node.prompt) await this.speak('say', node.prompt);
          const result = await runQuiz(this.ui, node.questions, node.results, (correct, total) => {
            recordOutcome(this.state, 'law', correct, total);
            recordAttempt(this.state, 'Трудовые отношения', correct, total);
          }, (q, picked) => recordEvent(this.state, { category: 'law', question: q.text, answer: q.options[picked] ?? '', correct: picked === q.correct, feedback: `Верный ответ: ${q.options[q.correct] ?? ''}` }));
          if (result) {
            applyOption(this.state, { text: '', ...(result.effects ? { effects: result.effects } : {}) });
            save(this.state);
            if (result.say) await this.speak('say', result.say);
            if (result.hint) await this.ui.banner(result.hint);
            if (result.award) await this.showAchievement(result.award);
          }
          return null;
        }
        if (node.type === 'minigame' && node.variants && node.options) {
          await this.minigame(node.variants, node.options);
          return null;
        }
        if (node.type === 'results' && node.rows) {
          const rows = node.rows.map(r => ({ label: this.t(r.label), value: this.t(r.value) }));
          if (screen === 'final') {
            await runFinal(this.ui, this.state, this.t(node.title ?? 'Итоги'), rows, node.actions?.[0] ?? 'Пройти заново');
          } else {
            await this.ui.table(this.t(node.title ?? 'Итоги'), rows);
          }
          return null;
        }
        throw new Error(`Сцена ${scene.id}: узел «${node.id}» типа ${node.type} не поддерживается`);
      }
    }
  }

  /** Первое задание на работе: вариант по специальности, три способа действовать. */
  private async minigame(variants: MinigameVariant[], options: Option[]): Promise<void> {
    const variant = variants.find(v => v.specialty === this.state.specialty) ?? variants[0];
    if (!variant) return;
    await this.speak('say', variant.intro);
    await this.ui.say({ kind: 'narrate', text: `${this.t(variant.task)}\nПодсказка: ${this.t(variant.hint)}` });
    const picked = await this.ui.choice({ options: options.map(o => this.t(o.text)) });
    const option = options[picked];
    if (!option) return;
    recordEvent(this.state, { category: 'story', question: variant.task, answer: option.text, correct: null, feedback: option.reply?.text ?? option.outcome ?? '' });
    applyOption(this.state, option);
    save(this.state);
    if (option.reply) await this.speak('say', option.reply);
  }

  private async speak(kind: 'say' | 'think' | 'narrate', line: Line | Node): Promise<void> {
    const who = kind === 'say' && line.who ? character(line.who, this.state.gender) : undefined;
    await this.ui.say({
      kind,
      text: this.t(line.text ?? ''),
      ...(who ? { who, name: this.t(who.name) } : {}),
      ...(line.emotion ? { emotion: line.emotion } : {})
    });
  }

  private async showAchievement(id: string): Promise<void> {
    if (!award(this.state, id)) return;
    save(this.state);
    const found = allAchievements.find(a => a.id === id);
    if (found) await this.ui.achievement(found.icon, found.title, found.how);
  }

  /**
   * Условие выдачи достижения из поля `when`.
   * Понимает «флаг» и «флаг == значение», объединённые через &&.
   * Неизвестный флаг считается ложным: лучше не выдать достижение,
   * чем выдать его тому, кто его не заработал.
   */
  private holds(condition: string | undefined): boolean {
    if (!condition) return true;
    return condition.split('&&').every(part => {
      const [left = '', right] = part.split('==').map(s => s.trim());
      const value = this.value(left);
      if (right === undefined) return value === true || (typeof value === 'string' && value !== '');
      return String(value) === right.replace(/^['"]|['"]$/g, '');
    });
  }

  /** Вычисляемые поля состояния читаются наравне с флагами сцен. */
  private value(name: string): string | number | boolean | undefined {
    if (name === 'resumePercent') return this.state.resumePercent;
    return this.state.flags[name];
  }

  private resolveBranch(node: Node): string {
    if (node.on === 'testOutcome') return this.state.flags['testPassed'] === true ? 'pass' : 'fail';
    if (node.on === 'testPassed') {
      const passed = this.state.flags['testPassed'] === true;
      if (!passed) this.rejectCurrentJob();
      return passed ? 'pass' : 'fail';
    }
    if (node.on === 'interviewScore') {
      const { good, neutral, bad } = this.state.interview;
      if (good + neutral + bad > 0) recordOutcome(this.state, 'interview', good * 2 + neutral, (good + neutral + bad) * 2);
      // Решает большинство. При равенстве — осторожная сторона.
      const outcome = good > bad && good >= neutral ? 'good' : bad > good && bad >= neutral ? 'bad' : 'neutral';
      if (outcome !== 'good') this.rejectCurrentJob();
      return outcome;
    }
    return Object.keys(node.cases ?? {})[0] ?? '';
  }

  /** После отказа вакансия остаётся на доске, но откликнуться на неё снова нельзя. */
  private rejectCurrentJob(): void {
    const job = this.state.job;
    if (job && !this.state.rejectedJobs.includes(job.id)) this.state.rejectedJobs.push(job.id);
    this.state.job = null;
    this.state.flags['testPassed'] = false;
    this.state.interview = { good: 0, neutral: 0, bad: 0 };
    save(this.state);
  }

  private t(text: string): string {
    return fill(text, this.state, {
      position: this.state.job?.title ?? 'Специалист',
      company: this.state.job?.company ?? '—',
      topTraits: traitsOf(this.state)
    });
  }
}

type Jump = { kind: 'scene'; id: string } | { kind: 'node'; id: string };

