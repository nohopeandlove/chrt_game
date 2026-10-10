// Лист «Модели персонажей»: все семь персонажей в четырёх манерах отрисовки.
// Запуск: node design/mocks/characters.mjs  (Node ≥ 23 читает .ts без сборки)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPortrait } from '../../src/render/portrait.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const characters = JSON.parse(readFileSync(join(ROOT, 'content', 'characters.json'), 'utf8')).items;

const LOOKS = [
  ['flat', 'A · Плоский вектор', 'Как сейчас. Без контура, мягкие блики, ближе всего к картинкам из PDF.', 'Спокойно и нейтрально, но с комиксным интерфейсом персонажи выглядят «из другого мира».'],
  ['ink', 'B · Чернильный контур', 'Те же силуэты и цвета, контур 3px, чёрные брови и линии глаз.', 'Собирается с рамками и пузырями интерфейса в одну картинку; лица чуть жёстче.'],
  ['chibi', 'C · Чиби', 'Контур, голова крупнее на четверть, большие глаза с двумя бликами, румянец.', 'Самые «живые» эмоции, но директор и HR теряют в серьёзности.'],
  ['minimal', 'D · Минимализм', 'Две-три заливки на персонажа, глаза-точки, без носа, бликов и теней.', 'Читается на любом проекторе и быстро рисуется; эмоции беднее.'],
];

const NAMES = { 'hero-f': 'Героиня', 'hero-m': 'Герой' };
const W = 1240;
const CELL_H = 150;

function esc(s) {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const rows = LOOKS.map(([look, title, what, tradeoff]) => `
  <div style="display:grid;grid-template-columns:230px minmax(0,1fr);gap:18px;align-items:start;padding:18px 0;border-top:3px solid #111111;">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <span style="font-weight:900;font-size:15px;text-transform:uppercase;letter-spacing:.02em;">${esc(title)}</span>
      <span style="font-size:12.5px;line-height:1.4;color:#3D3A36;">${esc(what)}</span>
      <span style="font-size:12.5px;line-height:1.4;color:#7A746B;">${esc(tradeoff)}</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7, minmax(0, 1fr));gap:10px;">
      ${characters.map(c => `
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="width:100%;aspect-ratio:5/6;background:${c.portrait.bg};border:3px solid #111111;box-shadow:4px 4px 0 #111111;overflow:hidden;">
            ${renderPortrait(c.portrait, c.defaultEmotion ?? 'neutral', { look, label: c.name }).replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')}
          </div>
          <span style="font-size:11px;font-weight:500;color:#3D3A36;text-align:center;line-height:1.2;">${esc(NAMES[c.id] ?? c.name)}</span>
        </div>`).join('')}
    </div>
  </div>`).join('');

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;900&display=swap">
  <style>
    body { margin: 0; }
    a { color: #E63946; } a:hover { color: #B3202C; }
  </style>
</helmet>
<div style="position:relative;width:${W}px;padding:28px 32px 24px;background:#FFF8E7;font-family:Rubik,system-ui,sans-serif;color:#111111;">
  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
    <span style="align-self:flex-start;padding:6px 12px;background:#FFD23F;border:3px solid #111111;font-weight:900;font-size:11px;letter-spacing:.1em;text-transform:uppercase;transform:rotate(-2deg);">Модели персонажей</span>
    <h2 style="margin:6px 0 0;font-weight:900;font-size:30px;text-transform:uppercase;letter-spacing:-.01em;">Одни и те же семь персонажей — четыре манеры</h2>
    <p style="margin:0;max-width:70ch;font-size:14px;color:#3D3A36;">Силуэты, цвета и эмоции общие: меняется только манера отрисовки. Выбранная включается одной строкой в коде портретов и сразу действует во всех сценах и на всех пяти эмоциях.</p>
  </div>
  ${rows}
</div>
</x-dc>
</body>
</html>
`;

writeFileSync(join(HERE, 'Characters.dc.html'), html, 'utf8');
console.log('Characters.dc.html:', characters.length, 'персонажей ×', LOOKS.length, 'манеры');
