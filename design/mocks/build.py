# Собирает четыре направления интерфейса как артборды .dc.html и canvas.json.
# Один и тот же экран (пролог, реплика куратора, три выбора) — четыре разных стиля.
import json, pathlib

HERE = pathlib.Path(__file__).parent
PORTRAIT = (HERE / 'portrait.svg').read_text(encoding='utf-8').strip()
HALL = (HERE / 'hall.svg').read_text(encoding='utf-8').strip()

CHAPTER = 'Пролог · Выпускной'
NAME = 'Ирина Петровна'
LINE = ('Дорогие выпускники! Поздравляю вас с окончанием обучения! Пусть каждый из вас '
        'найдёт свой путь — тот, где сможет применить всё, чему мы вас учили.')
CHOICES = [
    'Я полон энтузиазма — вперёд к работе!',
    'Не знаю, с чего начать, всё кажется сложным…',
    'Отдохну пару недель, потом подумаю.',
]

MENU_ICON = ('<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" '
             'stroke-width="2" stroke-linecap="round"><path d="M3 5h14M3 10h14M3 15h14"/></svg>')
CHEVRON = ('<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
           'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>')
TRI = ('<svg width="12" height="14" viewBox="0 0 12 14"><path d="M1 1l10 6-10 6z" fill="currentColor"/></svg>')
CHECK_BOX = ('<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#1F3A93" stroke-width="2" '
             'stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 3.2c5-.6 10-.4 15 .1.4 5 .5 10-.2 15.2-5 .4-10 .3-15-.1C2.9 13.4 3 8.3 3.5 3.2z"/></svg>')


def shell(fonts: str, css: str, body: str) -> str:
    return f'''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?{fonts}&display=swap">
  <style>
    body {{ margin: 0; }}
    {css}
  </style>
</helmet>
{body}
</x-dc>
</body>
</html>
'''


def stage(extra_style: str = '') -> str:
    return (f'<div style="position:absolute;inset:0;{extra_style}">'
            f'<div style="position:absolute;inset:0;">{HALL.replace("<svg ", "<svg style=\'width:100%;height:100%;display:block\' ", 1)}</div></div>')


def portrait(left: int, height: int, extra: str = '') -> str:
    return (f'<div style="position:absolute;left:{left}px;bottom:0;height:{height}px;width:{int(height*300/360)}px;{extra}">'
            f'{PORTRAIT.replace("<svg ", "<svg style=\'width:100%;height:100%;display:block\' ", 1)}</div>')


# ---------------------------------------------------------------- A · Светлый кабинет
def bright() -> str:
    body = f'''
<div style="position:relative;width:1200px;height:720px;overflow:hidden;background:#F4F5F8;font-family:'Golos Text',system-ui,sans-serif;color:#1C2233;">
  {stage('filter:saturate(.92)')}
  <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(244,245,248,1) 0%, rgba(244,245,248,.9) 30%, rgba(244,245,248,0) 62%);"></div>

  <div style="position:absolute;left:32px;top:24px;display:flex;align-items:center;gap:10px;">
    <span style="display:inline-flex;align-items:center;height:32px;padding:0 14px;background:#FFFFFF;border-radius:999px;box-shadow:0 4px 14px -6px rgba(20,30,60,.35);font-family:Manrope,system-ui,sans-serif;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#2B5BE0;">{CHAPTER}</span>
  </div>
  <button style="position:absolute;right:32px;top:20px;width:40px;height:40px;border-radius:999px;border:none;background:#FFFFFF;box-shadow:0 4px 14px -6px rgba(20,30,60,.35);display:flex;align-items:center;justify-content:center;color:#1C2233;cursor:pointer;">{MENU_ICON}</button>

  {portrait(48, 440, 'filter:drop-shadow(0 20px 30px rgba(20,30,60,.25))')}

  <div style="position:absolute;left:400px;right:48px;bottom:232px;background:#FFFFFF;border-radius:16px;padding:22px 26px 24px;box-shadow:0 16px 40px -18px rgba(20,30,60,.4);display:flex;flex-direction:column;gap:8px;">
    <span style="font-family:Manrope,system-ui,sans-serif;font-weight:800;font-size:14px;color:#2B5BE0;">{NAME}</span>
    <p style="margin:0;font-size:18px;line-height:1.55;color:#1C2233;">{LINE}</p>
    <span style="align-self:flex-end;display:inline-flex;align-items:center;gap:4px;font-family:Manrope,system-ui,sans-serif;font-weight:700;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8A90A6;">дальше {CHEVRON}</span>
  </div>

  <div style="position:absolute;left:400px;right:48px;bottom:40px;display:flex;flex-direction:column;gap:10px;">
    {''.join(f"""<div style="display:flex;align-items:center;gap:14px;background:#FFFFFF;border:1px solid #E1E4EC;border-radius:12px;padding:13px 18px;font-size:16px;color:#1C2233;{'box-shadow:0 0 0 2px #2B5BE0;border-color:#2B5BE0;' if i == 0 else ''}">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:#2B5BE0;color:#FFFFFF;font-family:Manrope,system-ui,sans-serif;font-weight:800;font-size:12px;">{i + 1}</span>
      <span>{t}</span>
    </div>""" for i, t in enumerate(CHOICES))}
  </div>
</div>'''
    return shell('family=Manrope:wght@700;800&family=Golos+Text:wght@400;500',
                 'a { color: #2B5BE0; } a:hover { color: #1E44B5; }', body)


# ---------------------------------------------------------------- B · Пиксельная новелла
def pixel() -> str:
    body = f'''
<div style="position:relative;width:1200px;height:720px;overflow:hidden;background:#14162B;font-family:'PT Mono',monospace;color:#F4F1E8;">
  {stage('filter:contrast(1.15) saturate(1.25)')}
  <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 2px, transparent 2px 4px);"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(20,22,43,.95) 0%, rgba(20,22,43,.55) 32%, rgba(20,22,43,0) 60%);"></div>

  <div style="position:absolute;left:32px;top:24px;display:inline-flex;align-items:center;height:34px;padding:0 14px;background:#14162B;border:3px solid #F4F1E8;box-shadow:4px 4px 0 #000;font-family:'Press Start 2P',monospace;font-size:10px;color:#F4F1E8;">ПРОЛОГ</div>
  <div style="position:absolute;right:32px;top:24px;display:inline-flex;align-items:center;height:34px;padding:0 14px;background:#14162B;border:3px solid #F4F1E8;box-shadow:4px 4px 0 #000;font-family:'Press Start 2P',monospace;font-size:10px;color:#FFD23F;">МЕНЮ</div>

  {portrait(40, 440, 'filter:drop-shadow(6px 6px 0 rgba(0,0,0,.55))')}

  <div style="position:absolute;left:390px;right:40px;bottom:238px;background:#1B1F3A;border:4px solid #F4F1E8;box-shadow:6px 6px 0 #000;padding:28px 24px 22px;">
    <span style="position:absolute;top:-19px;left:16px;padding:8px 10px;background:#F4F1E8;border:3px solid #14162B;font-family:'Press Start 2P',monospace;font-size:9px;color:#14162B;">{NAME.upper()}</span>
    <p style="margin:0;font-size:17px;line-height:1.6;color:#F4F1E8;">{LINE}</p>
    <span style="position:absolute;right:14px;bottom:10px;color:#FFD23F;transform:rotate(90deg);display:inline-flex;">{TRI}</span>
  </div>

  <div style="position:absolute;left:390px;right:40px;bottom:40px;display:flex;flex-direction:column;gap:12px;">
    {''.join(f"""<div style="display:flex;align-items:center;gap:14px;background:{'#232848' if i == 0 else '#14162B'};border:3px solid #F4F1E8;box-shadow:4px 4px 0 #000;padding:12px 16px;font-size:16px;color:#F4F1E8;">
      <span style="display:inline-flex;width:14px;color:#FFD23F;{'' if i == 0 else 'visibility:hidden;'}">{TRI}</span>
      <span style="font-family:'Press Start 2P',monospace;font-size:9px;color:#8C92C4;">{i + 1}</span>
      <span>{t}</span>
    </div>""" for i, t in enumerate(CHOICES))}
  </div>
</div>'''
    return shell('family=Press+Start+2P&family=PT+Mono',
                 'a { color: #FFD23F; } a:hover { color: #FFE58A; }', body)


# ---------------------------------------------------------------- C · Комикс
def comic() -> str:
    body = f'''
<div style="position:relative;width:1200px;height:720px;overflow:hidden;background:#FFF8E7;font-family:Rubik,system-ui,sans-serif;color:#111111;">
  <div style="position:absolute;inset:18px;border:6px solid #111111;background:#FFFFFF;overflow:hidden;">
    {stage('filter:contrast(1.08)')}
    <div style="position:absolute;inset:0;background-image:radial-gradient(circle, rgba(17,17,17,.22) 1.1px, transparent 1.6px);background-size:8px 8px;opacity:.55;"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(255,248,231,.92) 0%, rgba(255,248,231,.5) 28%, rgba(255,248,231,0) 55%);"></div>
  </div>

  <div style="position:absolute;left:36px;top:34px;padding:8px 14px;background:#FFD23F;border:3px solid #111111;box-shadow:4px 4px 0 #111111;font-weight:900;font-size:12px;letter-spacing:.06em;text-transform:uppercase;transform:rotate(-2deg);">{CHAPTER}</div>
  <div style="position:absolute;right:36px;top:34px;width:42px;height:42px;background:#FFFFFF;border:3px solid #111111;box-shadow:4px 4px 0 #111111;display:flex;align-items:center;justify-content:center;color:#111111;">{MENU_ICON}</div>

  {portrait(56, 430, 'filter:drop-shadow(5px 5px 0 #111111)')}

  <div style="position:absolute;left:400px;right:56px;bottom:238px;background:#FFFFFF;border:3px solid #111111;border-radius:22px;box-shadow:6px 6px 0 #111111;padding:26px 26px 22px;">
    <span style="position:absolute;top:-22px;left:22px;padding:8px 14px;background:#E63946;color:#FFFFFF;border:3px solid #111111;font-weight:900;font-size:13px;letter-spacing:.06em;text-transform:uppercase;transform:rotate(-3deg);">{NAME}</span>
    <div style="position:absolute;left:-16px;bottom:34px;width:26px;height:26px;background:#FFFFFF;border-left:3px solid #111111;border-bottom:3px solid #111111;transform:rotate(45deg);"></div>
    <p style="margin:0;font-weight:500;font-size:18px;line-height:1.5;color:#111111;">{LINE}</p>
  </div>

  <div style="position:absolute;left:400px;right:56px;bottom:44px;display:flex;flex-direction:column;gap:12px;">
    {''.join(f"""<div style="display:flex;align-items:center;gap:14px;background:{'#FFD23F' if i == 0 else '#FFFFFF'};border:3px solid #111111;box-shadow:4px 4px 0 #111111;padding:10px 16px;font-weight:500;font-size:16px;color:#111111;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:#FFFFFF;border:3px solid #111111;font-weight:900;font-size:15px;">{i + 1}</span>
      <span>{t}</span>
    </div>""" for i, t in enumerate(CHOICES))}
  </div>
</div>'''
    return shell('family=Rubik:wght@400;500;900',
                 'a { color: #E63946; } a:hover { color: #B3202C; }', body)


# ---------------------------------------------------------------- D · Тетрадь
def notebook() -> str:
    lines_bg = 'repeating-linear-gradient(0deg, transparent 0 27px, #C9D6EA 27px 28px)'
    body = f'''
<div style="position:relative;width:1200px;height:720px;overflow:hidden;background-color:#FBFAF4;background-image:linear-gradient(#E3E7F0 1px, transparent 1px), linear-gradient(90deg, #E3E7F0 1px, transparent 1px);background-size:24px 24px;font-family:'PT Serif',Georgia,serif;color:#26292E;">
  <div style="position:absolute;left:72px;top:0;bottom:0;width:2px;background:#E8A0A0;"></div>

  <span style="position:absolute;left:100px;top:22px;font-family:Caveat,cursive;font-weight:700;font-size:28px;color:#C4453B;transform:rotate(-2deg);border-bottom:2px solid #C4453B;line-height:1;padding-bottom:2px;">{CHAPTER}</span>
  <span style="position:absolute;right:40px;top:26px;font-family:Caveat,cursive;font-weight:700;font-size:22px;color:#1F3A93;display:inline-flex;align-items:center;gap:8px;">меню {MENU_ICON}</span>

  <div style="position:absolute;left:104px;top:78px;width:520px;height:340px;background:#FFFFFF;padding:12px 12px 40px;box-shadow:0 10px 24px -12px rgba(30,30,60,.45);transform:rotate(-2deg);">
    <div style="position:relative;width:100%;height:100%;overflow:hidden;">{stage()}</div>
    <span style="position:absolute;left:0;right:0;bottom:8px;text-align:center;font-family:Caveat,cursive;font-size:22px;color:#26292E;">актовый зал, июнь</span>
  </div>

  {portrait(96, 380, 'filter:drop-shadow(0 8px 12px rgba(30,30,60,.3))')}

  <div style="position:absolute;left:660px;top:70px;width:500px;background:#FFFFFF;background-image:{lines_bg};padding:20px 24px 22px;box-shadow:0 10px 24px -12px rgba(30,30,60,.45);">
    <div style="position:absolute;left:50%;top:-12px;width:110px;height:24px;background:rgba(255,226,140,.75);transform:translateX(-50%) rotate(-3deg);"></div>
    <span style="display:block;font-family:Caveat,cursive;font-weight:700;font-size:30px;line-height:28px;color:#1F3A93;">{NAME}</span>
    <p style="margin:0;font-size:17px;line-height:28px;color:#26292E;">{LINE}</p>
  </div>

  <div style="position:absolute;left:660px;top:322px;width:500px;display:flex;flex-direction:column;">
    <span style="font-family:Caveat,cursive;font-weight:700;font-size:26px;color:#C4453B;margin-bottom:6px;">что ответить?</span>
    {''.join(f"""<div style="display:flex;align-items:center;gap:14px;padding:12px 4px;border-bottom:1px dotted #9AA3B8;font-size:16px;color:#26292E;">
      <span style="display:inline-flex;flex-shrink:0;">{CHECK_BOX}</span>
      <span style="font-family:Caveat,cursive;font-weight:700;font-size:24px;line-height:1;color:#1F3A93;width:18px;">{i + 1}</span>
      <span>{t}</span>
    </div>""" for i, t in enumerate(CHOICES))}
  </div>
</div>'''
    return shell('family=Caveat:wght@700&family=PT+Serif:wght@400;700',
                 'a { color: #1F3A93; } a:hover { color: #C4453B; }', body)


ARTBOARDS = [
    ('Main.dc.html', 'Комикс — выбранное направление', comic, 'page-1'),
    ('Bright.dc.html', 'A · Светлый кабинет', bright, 'page-2'),
    ('Pixel.dc.html', 'B · Пиксельная новелла', pixel, 'page-2'),
    ('Notebook.dc.html', 'D · Тетрадь', notebook, 'page-2'),
]

for file, _, build, _ in ARTBOARDS:
    (HERE / file).write_text(build(), encoding='utf-8')

W, H, GAP_X = 1200, 720, 120
others = [a for a in ARTBOARDS if a[3] == 'page-2']
canvas = {
    'pages': [
        {'id': 'page-1', 'name': 'Выбрано: комикс'},
        {'id': 'page-2', 'name': 'Другие направления'},
        {'id': 'page-3', 'name': 'Модели персонажей'},
    ],
    'artboards': [
        {'file': 'Main.dc.html', 'title': ARTBOARDS[0][1], 'x': 0, 'y': 0, 'w': W, 'h': H, 'page': 'page-1'},
    ] + [
        {'file': a[0], 'title': a[1], 'x': i * (W + GAP_X), 'y': 0, 'w': W, 'h': H, 'page': 'page-2'}
        for i, a in enumerate(others)
    ] + [
        {'file': 'Characters.dc.html', 'title': 'Семь персонажей в четырёх манерах', 'x': 0, 'y': 0, 'w': 1240, 'h': 980, 'page': 'page-3'},
    ],
    'annotations': [
        {'id': 'note-chosen', 'x': W + 80, 'y': 0, 'w': 420, 'page': 'page-1',
         'text': 'Направление C · Комикс — выбрано.\nПеренесено на все экраны игры: пузыри с хвостом к персонажу, контуры 3px, жёсткие тени, растр, жёлтый и красный, одна гарнитура Rubik.\nОстальные три наброска — на странице «Другие направления».'},
        {'id': 'note-looks', 'x': 1240 + 80, 'y': 0, 'w': 400, 'page': 'page-3',
         'text': 'Четыре манеры отрисовки одних и тех же персонажей. Лист собран из кода игры (design/mocks/characters.mjs): выбранная манера включается одной константой и действует на все сцены и эмоции.\nB и C сделаны под выбранный комиксный интерфейс.'},
        {'id': 'note-others', 'x': 0, 'y': -140, 'w': 620, 'page': 'page-2',
         'text': 'Наброски, которые не выбраны. Хранятся на случай, если захочется что-то из них позаимствовать: светлые карточки из A, рамки из B, рукописные подписи из D.'},
    ],
    'launch': {'view': 'canvas', 'page': 'page-3'},
}
(HERE / 'canvas.json').write_text(json.dumps(canvas, ensure_ascii=False, indent=2), encoding='utf-8')
print('built', [a[0] for a in ARTBOARDS])
