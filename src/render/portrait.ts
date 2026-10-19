import { illustratedPortrait } from './illustrated-portraits.ts';
import type { Emotion, Portrait } from '../types.ts';

/**
 * Параметрический портрет. Один SVG собирается из параметров персонажа:
 * силуэт причёски, палитра, крой одежды, аксессуары и эмоция.
 * Для одобренных персонажей используется рисованный портрет; SVG остаётся запасным вариантом.
 *
 * `look` — манера отрисовки, общая для всех персонажей:
 *   flat    — плоский вектор без контура (исходная);
 *   ink     — чернильный контур 3px, как в комиксе;
 *   chibi   — контур + большая голова, крупные глаза, румянец;
 *   minimal — две-три заливки, глаза-точки, без носа и бликов.
 */
export type Look = 'flat' | 'ink' | 'chibi' | 'minimal';

export const DEFAULT_LOOK: Look = 'ink';

const SKIN = '#F7D2BC';
const SKIN_SHADE = '#E9B99F';
const SKIN_LINE = '#C68F71';
const LINE = '#3B2C43';
const INK = '#26364D';

interface Ctx {
  p: Portrait;
  emotion: Emotion;
  look: Look;
  /** Атрибуты контура для силуэтных фигур. */
  o: string;
  outlined: boolean;
  chibi: boolean;
  minimal: boolean;
}

function ctx(p: Portrait, emotion: Emotion, look: Look): Ctx {
  const outlined = look === 'ink' || look === 'chibi';
  return {
    p,
    emotion,
    look,
    o: outlined ? ` stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"` : '',
    outlined,
    chibi: look === 'chibi',
    minimal: look === 'minimal'
  };
}

function hairBack(c: Ctx): string {
  const { p, o } = c;
  const h = p.hair;
  const d = p.hairDark;
  const detail = c.minimal ? 0 : 1;
  switch (p.style) {
    case 'buns':
      return `<rect x="72" y="60" width="156" height="140" rx="78" fill="${h}"${o}/>
        <circle cx="76" cy="78" r="37" fill="${h}"${o}/><circle cx="224" cy="78" r="37" fill="${h}"${o}/>
        ${detail ? `<circle cx="76" cy="78" r="22" fill="${d}" opacity=".35"/><circle cx="224" cy="78" r="22" fill="${d}" opacity=".35"/>` : ''}`;
    case 'spiky':
      return `<path d="M78,116 C72,78 98,49 129,51 C145,37 176,44 188,57 C211,62 226,85 222,120 L211,107 C190,78 116,78 89,112 Z" fill="${h}"${o}/>
        <rect x="76" y="62" width="148" height="120" rx="74" fill="${h}"${o}/>`;
    case 'bob':
      return `<rect x="62" y="58" width="176" height="200" rx="88" fill="${h}"${o}/>
        ${detail ? `<path d="M74,150 C 70,196 74,232 80,252" stroke="${d}" stroke-width="4" fill="none" opacity=".45"/>
        <path d="M226,150 C 230,196 226,232 220,252" stroke="${d}" stroke-width="4" fill="none" opacity=".45"/>` : ''}`;
    case 'wavy':
      return `<rect x="46" y="54" width="208" height="252" rx="100" fill="${h}"${o}/>
        <circle cx="56" cy="150" r="30" fill="${h}"${o}/><circle cx="244" cy="150" r="30" fill="${h}"${o}/>
        <circle cx="62" cy="228" r="32" fill="${h}"${o}/><circle cx="238" cy="228" r="32" fill="${h}"${o}/>
        ${c.outlined ? `<rect x="46" y="54" width="208" height="252" rx="100" fill="${h}"/>` : ''}
        ${detail ? `<path d="M66,120 C 52,168 56,224 70,268" stroke="${d}" stroke-width="5" fill="none" opacity=".4"/>
        <path d="M234,120 C 248,168 244,224 230,268" stroke="${d}" stroke-width="5" fill="none" opacity=".4"/>` : ''}`;
    case 'long':
      return `<rect x="58" y="56" width="184" height="278" rx="92" fill="${h}"${o}/>
        ${detail ? `<path d="M72,130 C 62,190 64,268 72,320" stroke="${d}" stroke-width="5" fill="none" opacity=".38"/>
        <path d="M228,130 C 238,190 236,268 228,320" stroke="${d}" stroke-width="5" fill="none" opacity=".38"/>` : ''}`;
    case 'ponytail':
      return `<path d="M88,150 C 52,192 46,258 60,308 C 68,332 96,330 100,306 C 84,256 90,196 110,166 Z" fill="${h}"${o}/>
        ${detail ? `<path d="M84,190 C 68,232 68,278 78,306" stroke="${d}" stroke-width="4" fill="none" opacity=".4"/>` : ''}
        <rect x="74" y="58" width="152" height="146" rx="76" fill="${h}"${o}/>`;
    case 'braid':
      return `<rect x="74" y="56" width="152" height="176" rx="76" fill="${h}"${o}/>
        <ellipse cx="96" cy="244" rx="24" ry="20" fill="${h}"${o}/>
        <ellipse cx="92" cy="278" rx="22" ry="19" fill="${h}"${o}/>
        <ellipse cx="95" cy="310" rx="19" ry="17" fill="${h}"${o}/>
        ${detail ? `<path d="M76,244 h40 M72,278 h40 M78,310 h34" stroke="${d}" stroke-width="3" opacity=".45"/>` : ''}`;
  }
}

const FRINGES: Record<Portrait['fringe'], string> = {
  part: 'M72,132 C 76,84 108,56 150,56 C 194,56 224,82 230,132 C 216,96 190,86 154,94 C 120,102 92,116 72,132 Z',
  bangs: 'M74,128 C 76,80 110,56 150,56 C 190,56 224,80 226,128 C 212,104 184,94 150,94 C 116,94 88,104 74,128 Z',
  short: 'M78,118 C 82,76 112,54 150,54 C 188,54 218,76 222,118 C 210,90 186,82 150,82 C 114,82 90,90 78,118 Z'
};

function hairFront(c: Ctx): string {
  const { p, o } = c;
  const shine = c.minimal
    ? ''
    : p.fringe === 'short'
      ? `<path d="M112,80 C 128,68 148,66 166,72" stroke="${p.hairLight}" stroke-width="4" fill="none" opacity=".5" stroke-linecap="round"/>`
      : `<path d="M104,98 C 122,80 148,72 172,76" stroke="${p.hairLight}" stroke-width="5" fill="none" opacity=".45" stroke-linecap="round"/>`;
  return `<path d="${FRINGES[p.fringe]}" fill="${p.hair}"${o}/>${shine}`;
}

function clothes(c: Ctx): string {
  const { p, o } = c;
  const inner = p.clothInner ?? '#FBF8FF';
  const base = `<path d="M12,360 C 18,304 58,274 106,262 C 118,284 128,292 150,292 C 172,292 182,284 194,262 C 242,274 282,304 288,360 Z" fill="${p.cloth}"${o}/>`;
  let extra = '';
  switch (p.collar) {
    case 'shirt':
      extra = `<path d="M106,262 L150,296 L124,306 L100,272 Z" fill="${p.clothDark}"${o}/>
               <path d="M194,262 L150,296 L176,306 L200,272 Z" fill="${p.clothDark}"${o}/>`;
      break;
    case 'blazer':
      extra = `<path d="M104,262 C 118,290 132,308 150,318 L150,360 L92,360 C 92,318 96,286 104,262 Z" fill="${inner}"/>
               <path d="M196,262 C 182,290 168,308 150,318 L150,360 L208,360 C 208,318 204,286 196,262 Z" fill="${inner}"/>
               <path d="M106,262 C 122,292 138,312 150,320 L122,332 L96,286 Z" fill="${p.clothDark}"${o}/>
               <path d="M194,262 C 178,292 162,312 150,320 L178,332 L204,286 Z" fill="${p.clothDark}"${o}/>`;
      break;
    case 'hoodie':
      extra = `<path d="M100,264 C 122,294 178,294 200,264 C 214,270 218,280 210,288 C 184,314 116,314 90,288 C 82,280 86,270 100,264 Z" fill="${p.clothDark}"${o}/>
               <path d="M134,300 L130,342" stroke="${inner}" stroke-width="5" stroke-linecap="round"/>
               <path d="M166,300 L170,342" stroke="${inner}" stroke-width="5" stroke-linecap="round"/>`;
      break;
    case 'tee':
      extra = c.minimal
        ? ''
        : `<path d="M106,262 C 120,288 180,288 194,262 C 186,278 168,288 150,288 C 132,288 120,278 106,262 Z" fill="${p.clothDark}" opacity=".55"/>`;
      break;
  }
  return base + extra;
}

const BROWS: Record<Emotion, string> = {
  neutral: 'M158,120 Q176,111 194,117',
  smile: 'M158,116 Q176,106 194,113',
  joy: 'M157,111 Q176,100 195,108',
  worry: 'M158,113 Q176,116 194,126',
  stern: 'M158,127 Q176,118 194,110'
};

function sideFeatures(c: Ctx): string {
  const { p, emotion } = c;
  const browWidth = c.minimal ? 4 : 5;
  const brow = `<path d="${BROWS[emotion]}" fill="none" stroke="${c.outlined ? INK : p.brow}" stroke-width="${browWidth}" stroke-linecap="round"/>`;

  if (c.minimal) {
    const eye =
      emotion === 'joy'
        ? `<path d="M164,154 Q176,142 188,154" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
        : `<circle cx="176" cy="152" r="${emotion === 'worry' ? 7 : 6}" fill="${INK}"/><circle cx="178.5" cy="149.5" r="2" fill="#fff"/>`;
    return brow + eye;
  }

  let eye: string;
  if (emotion === 'joy') {
    eye = `<path d="M160,155 Q176,140 192,155" fill="none" stroke="${LINE}" stroke-width="4.2" stroke-linecap="round"/>`;
  } else {
    const k = c.chibi ? 1.12 : .88;
    const ry = (emotion === 'worry' ? 14.5 : 13.5) * k;
    const rx = 17 * k;
    eye = `<ellipse cx="176" cy="152" rx="${rx}" ry="${ry}" fill="#FDFBFF"${c.outlined ? ` stroke="${INK}" stroke-width="2"` : ''}/>
      <circle cx="177" cy="152.5" r="${9.6 * k}" fill="${p.eye}"/>
      <circle cx="177" cy="152.5" r="${4.4 * k}" fill="#231B2E"/>
      <circle cx="${181.5 + (k - 1) * 4}" cy="${148 - (k - 1) * 4}" r="${3.1 * k}" fill="#fff" opacity=".92"/>
      ${c.chibi ? `<circle cx="172" cy="157" r="2" fill="#fff" opacity=".8"/>` : ''}
      <path d="M158,147 Q176,135 194,146" fill="none" stroke="${c.outlined ? INK : LINE}" stroke-width="3.4" stroke-linecap="round"/>`;
    if (p.lashes) {
      eye += `<path d="M194,144 l6,-4 M189,138 l4,-6" stroke="${c.outlined ? INK : LINE}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
    }
  }
  const blush = c.chibi ? `<ellipse cx="196" cy="180" rx="12" ry="7" fill="#F08A8A" opacity=".45"/>` : '';
  return brow + eye + blush;
}

function nose(c: Ctx): string {
  if (c.minimal) return '';
  if (c.chibi) {
    return `<path d="M147,180 q3,4 6,0" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  return `<path d="M150,160 Q144,178 147,185 Q151,188 156,183" fill="none" stroke="${c.outlined ? INK : SKIN_LINE}" stroke-width="${c.outlined ? 2.5 : 3}" stroke-linecap="round"/>`;
}

function mouth(c: Ctx): string {
  const { p, emotion } = c;
  const dark = '#7A2E33';
  const stroke = c.outlined ? INK : p.lip;

  if (c.minimal) {
    const d =
      emotion === 'joy' ? 'M130,202 Q150,226 170,202'
        : emotion === 'smile' ? 'M134,204 Q150,216 166,204'
          : emotion === 'worry' ? 'M134,212 Q150,202 166,212'
            : emotion === 'stern' ? 'M134,207 L166,207'
              : 'M138,206 Q150,210 162,206';
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  }

  const y = c.chibi ? 6 : 0; // у чиби рот чуть ниже: голова крупнее
  switch (emotion) {
    case 'joy':
      return `<g transform="translate(0 ${y})">
        <path d="M126,200 Q150,195 174,200 Q170,230 150,232 Q130,230 126,200 Z" fill="${dark}"${c.outlined ? ` stroke="${INK}" stroke-width="2.5"` : ''}/>
        <path d="M130,201 Q150,197 170,201 Q168,210 150,211 Q132,210 130,201 Z" fill="#fff"/>
        <path d="M126,200 Q150,195 174,200" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round"/></g>`;
    case 'smile':
      return `<path transform="translate(0 ${y})" d="M128,202 Q150,222 172,202 Q150,212 128,202 Z" fill="${p.lip}"${c.outlined ? ` stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"` : ''}/>`;
    case 'worry':
      return `<path transform="translate(0 ${y})" d="M133,212 Q150,201 167,212" fill="none" stroke="${stroke}" stroke-width="4.5" stroke-linecap="round"/>`;
    case 'stern':
      return `<path transform="translate(0 ${y})" d="M132,207 L168,207" stroke="${stroke}" stroke-width="4.5" stroke-linecap="round"/>`;
    case 'neutral':
      return p.lips
        ? `<path transform="translate(0 ${y})" d="M130,204 Q140,197 150,201 Q160,197 170,204 Q160,214 150,214 Q140,214 130,204 Z" fill="${p.lip}"${c.outlined ? ` stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"` : ''}/>`
        : `<path transform="translate(0 ${y})" d="M134,204 Q150,212 166,204" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round"/>`;
  }
}

function glasses(c: Ctx): string {
  const { p } = c;
  const radius = p.glassesRound ? 16 : 7;
  const col = c.outlined ? INK : p.glasses;
  const w = c.minimal ? 3 : 4.5;
  return `<g fill="${c.minimal ? 'none' : (p.glassesTint ?? 'none')}" stroke="${col}" stroke-width="${w}" fill-opacity="${p.glassesTint ? .22 : 1}" opacity=".95">
      <rect x="96" y="130" width="52" height="40" rx="${radius}"/>
      <rect x="152" y="130" width="52" height="40" rx="${radius}"/>
    </g>
    <g stroke="${col}" stroke-width="${w}" fill="none">
      <path d="M148,146 h4"/><path d="M96,142 l-14,-5"/><path d="M204,142 l14,-5"/>
    </g>`;
}

export interface PortraitOptions {
  characterId?: string;
  /** Компактное превью с теми же пропорциями и полным силуэтом. */
  crop?: boolean;
  /** Нарисовать подложку цвета персонажа. По умолчанию фон прозрачный. */
  plate?: boolean;
  label?: string;
  look?: Look;
}

export function renderPortrait(p: Portrait, emotion: Emotion, opts: PortraitOptions = {}): string {
  const illustration = opts.characterId && illustratedPortrait(opts.characterId, emotion, opts.label ?? '', opts.plate ? p.bg : undefined);
  if (illustration) return illustration;
  const c = ctx(p, emotion, opts.look ?? DEFAULT_LOOK);
  const viewBox = '0 0 300 360';
  const features = sideFeatures(c);
  const plate = opts.plate ? `<rect x="0" y="0" width="300" height="360" rx="24" fill="${p.bg}"/><circle cx="150" cy="146" r="112" fill="#FFFFFF" opacity=".55"/>` : '';

  // Голова с причёской у чиби крупнее, тело остаётся прежним.
  const headScale = c.chibi ? 'transform="translate(150 150) scale(1.22) translate(-150 -150)"' : '';

  const head = `
    <ellipse cx="84" cy="160" rx="11" ry="16" fill="${SKIN}"${c.o}/>
    <ellipse cx="216" cy="160" rx="11" ry="16" fill="${SKIN}"${c.o}/>
    <path d="M150,64 C 106,64 82,98 82,148 C 82,198 112,234 150,234 C 188,234 218,198 218,148 C 218,98 194,64 150,64 Z" fill="${SKIN}"${c.o}/>
    ${c.minimal ? '' : `<path d="M150,64 C 106,64 82,98 82,148 C 88,116 112,96 150,96 C 188,96 212,116 218,148 C 218,98 194,64 150,64 Z" fill="${SKIN_SHADE}" opacity=".35"/>`}
    <g>${features}</g>
    <g transform="translate(300,0) scale(-1,1)">${features}</g>
    ${nose(c)}
    ${mouth(c)}
    ${hairFront(c)}
    ${p.glasses ? glasses(c) : ''}`;

  return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${opts.label ?? ''}">
    ${plate}
    <g ${headScale}>${hairBack(c)}</g>
    <path d="M126,204 L126,292 C 126,302 174,302 174,292 L174,204 Z" fill="${SKIN}"${c.o}/>
    ${c.minimal ? '' : `<path d="M126,204 C 134,228 166,228 174,204 L174,214 C 166,236 134,236 126,214 Z" fill="${SKIN_SHADE}"/>`}
    ${clothes(c)}
    <g ${headScale}>${head}</g>
  </svg>`;
}
