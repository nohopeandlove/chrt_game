import cityNightImage from '../../assets/backgrounds/city-night.webp';
import kitchenImage from '../../assets/backgrounds/kitchen.webp';
import openOfficeImage from '../../assets/backgrounds/open-office.webp';
import hrOfficeImage from '../../assets/backgrounds/hr-office.webp';
import laptopImage from '../../assets/backgrounds/laptop.webp';
import heroRoomImage from '../../assets/backgrounds/hero-room.webp';
import crtCampusImage from '../../assets/backgrounds/crt-campus.webp';

/**
 * SVG-сцены со слоями и отдельная рисованная иллюстрация ЧРТ. Анимации живут в styles.css
 * и выключаются при prefers-reduced-motion.
 *
 * Локации из content/backgrounds.json. Заглушка остаётся
 * на случай, если в сцене появится новый id.
 */

const VIEW_BOX = '0 0 1600 900';

function wrap(id: string, title: string, body: string): string {
  return `<svg class="bg bg--${id}" viewBox="${VIEW_BOX}" preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">${body}</svg>`;
}

function crtCampus(): string {
  return wrap('crt-campus', 'Челябинский радиотехнический техникум — выпускной у главного входа', `
    <rect width="1600" height="900" fill="#eaf0f8"/>
    <image href="${crtCampusImage}" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <g aria-hidden="true" pointer-events="none">${Array.from({length: 18}, (_, i) =>
      `<rect class="campus-confetti scene-motion" x="${70 + i * 84}" y="-30" width="${i % 2 ? 7 : 10}" height="12" rx="2" fill="${['#e8bd65', '#639cb8', '#c27681'][i % 3]}" style="animation-delay:-${i * 1.7}s;animation-duration:${12 + i % 5}s"/>`
    ).join('')}</g>
  `);
}

function assemblyHall(): string {
  const confetti: string[] = [];
  const colors = ['#D6532F', '#2C3E50', '#E8C98A', '#F5E9D0', '#C9A55F'];
  for (let i = 0; i < 18; i++) {
    const x = 40 + ((i * 89) % 1520);
    const delay = ((i * 37) % 90) / 10;
    const dur = 7 + ((i * 13) % 40) / 10;
    const color = colors[i % colors.length];
    const w = i % 3 === 0 ? 14 : 9;
    confetti.push(
      `<rect class="confetti" x="${x}" y="-40" width="${w}" height="${w * 1.6}" rx="2" fill="${color}"
        style="animation-delay:${delay}s;animation-duration:${dur}s"/>`
    );
  }

  const chairs: string[] = [];
  for (let row = 0; row < 2; row++) {
    const y = 720 + row * 96;
    const scale = 1 + row * 0.16;
    for (let i = 0; i < 9; i++) {
      const x = -40 + i * 190 * scale;
      chairs.push(
        `<rect x="${x}" y="${y}" width="${132 * scale}" height="${118 * scale}" rx="16" fill="#2C3E50" opacity="${row ? 1 : 0.86}"/>`
      );
    }
  }

  const windows: string[] = [];
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 380;
    windows.push(`<rect x="${x}" y="120" width="220" height="300" rx="8" fill="#BFD9E8"/>
      <rect x="${x}" y="120" width="220" height="300" rx="8" fill="none" stroke="#E8C98A" stroke-width="10"/>
      <path d="M${x + 110},120 V420 M${x},270 H${x + 220}" stroke="#E8C98A" stroke-width="8"/>`);
  }

  return wrap('assembly-hall', 'Актовый зал техникума', `
    <rect width="1600" height="900" fill="#E8C98A"/>
    <rect y="0" width="1600" height="460" fill="#EBD3A0"/>
    ${windows.join('')}
    <rect y="440" width="1600" height="40" fill="#C9A55F"/>
    <rect y="480" width="1600" height="260" fill="#DFBE85"/>
    <path d="M0,480 H1600 V520 H0 Z" fill="#C9A55F" opacity=".5"/>
    <g>
      <rect x="420" y="200" width="760" height="150" rx="14" fill="#2C3E50"/>
      <text x="800" y="300" text-anchor="middle" font-family="Rubik, sans-serif" font-size="86"
        font-weight="700" fill="#F5E9D0" letter-spacing="2">Выпускной</text>
    </g>
    <g stroke="#C9A55F" stroke-width="6" fill="none">
      <path d="M0,150 Q400,230 800,150 Q1200,70 1600,150"/>
    </g>
    <g>
      <path d="M180,178 l30,0 l-15,34 Z" fill="#D6532F"/>
      <path d="M420,196 l30,0 l-15,34 Z" fill="#2C3E50"/>
      <path d="M700,166 l30,0 l-15,34 Z" fill="#F5E9D0"/>
      <path d="M980,158 l30,0 l-15,34 Z" fill="#D6532F"/>
      <path d="M1260,124 l30,0 l-15,34 Z" fill="#2C3E50"/>
    </g>
    <rect y="600" width="1600" height="26" fill="#B8935A" opacity=".55"/>
    ${chairs.join('')}
    <g class="confetti-layer">${confetti.join('')}</g>
  `);
}

function heroRoom(): string {
  const stars = Array.from({length: 14}, (_, i) => {
    const x = 650 + (i * 67 % 430);
    const y = 38 + (i * 47 % 240);
    return `<circle class="room-star scene-motion" cx="${x}" cy="${y}" r="${i % 3 ? 2.3 : 3.2}" fill="#fff0cb" style="animation-delay:-${i * .7}s"/>`;
  }).join('');
  return wrap('hero-room', 'Уютная комната с ноутбуком и ночным окном', `
    <image href="${heroRoomImage}" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <defs>
      <radialGradient id="room-screen-light"><stop stop-color="#b4dbff" stop-opacity=".22"/><stop offset="1" stop-color="#b4dbff" stop-opacity="0"/></radialGradient>
      <radialGradient id="room-lamp-light"><stop stop-color="#ffcc83" stop-opacity=".32"/><stop offset="1" stop-color="#ffcc83" stop-opacity="0"/></radialGradient>
    </defs>
    <g aria-hidden="true" pointer-events="none">
      ${stars}
      <ellipse class="room-glow scene-motion" cx="312" cy="390" rx="150" ry="112" fill="url(#room-screen-light)"/>
      <ellipse class="room-lamplight scene-motion" cx="180" cy="365" rx="155" ry="130" fill="url(#room-lamp-light)"/>
      <g class="room-steam scene-motion" fill="none" stroke="#f4dfd3" stroke-width="2" stroke-linecap="round" opacity=".24">
        <path d="M421 389 Q413 378 422 367 Q430 355 422 346"/>
        <path d="M432 391 Q440 381 432 372"/>
      </g>
      <path class="room-shooting-star scene-motion" d="M740 90 l65 22" stroke="#d2e8ff" stroke-width="2" stroke-linecap="round" opacity="0"/>
    </g>
  `);
}

function laptop(): string {
  return wrap('laptop', 'Ноутбук с вакансиями на уютном рабочем столе', `
    <image href="${laptopImage}" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <defs>
      <radialGradient id="laptop-screen-light"><stop stop-color="#c3d8ff" stop-opacity=".3"/><stop offset="1" stop-color="#c3d8ff" stop-opacity="0"/></radialGradient>
      <radialGradient id="laptop-lamp-light"><stop stop-color="#ffcb86" stop-opacity=".34"/><stop offset="1" stop-color="#ffcb86" stop-opacity="0"/></radialGradient>
    </defs>
    <g aria-hidden="true" pointer-events="none">
      <ellipse class="room-glow scene-motion" cx="795" cy="360" rx="340" ry="205" fill="url(#laptop-screen-light)"/>
      <ellipse class="room-lamplight scene-motion" cx="210" cy="260" rx="200" ry="155" fill="url(#laptop-lamp-light)"/>
      <g class="room-steam scene-motion" fill="none" stroke="#f4dfd3" stroke-width="3" stroke-linecap="round" opacity=".24">
        <path d="M1320 428 Q1308 410 1320 394 Q1332 377 1322 360"/>
        <path d="M1348 430 Q1360 410 1349 393"/>
      </g>
      <g class="laptop-status scene-motion" fill="#c7bdfa">
        <circle cx="1050" cy="188" r="2.5"/>
        <circle cx="1063" cy="188" r="2.5"/>
        <circle cx="1076" cy="188" r="2.5"/>
      </g>
    </g>
  `);
}

function hrOffice(): string {
  const motes = Array.from({length: 9}, (_, i) =>
    `<circle class="office-mote scene-motion" cx="${1040 + i * 51 % 400}" cy="${170 + i * 47 % 280}" r="${i % 3 ? 1.8 : 2.6}" fill="#fff4d2" style="animation-delay:-${i * 1.9}s;animation-duration:${13 + i % 4}s"/>`
  ).join('');
  return wrap('hr-office', 'Светлый кабинет директора с документами для оформления на работу', `
    <image href="${hrOfficeImage}" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <defs>
      <radialGradient id="office-lamp-light"><stop stop-color="#ffe2a5" stop-opacity=".3"/><stop offset="1" stop-color="#ffe2a5" stop-opacity="0"/></radialGradient>
      <linearGradient id="office-daylight" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#ffe7ae" stop-opacity=".1"/><stop offset="1" stop-color="#ffe7ae" stop-opacity="0"/></linearGradient>
      <clipPath id="office-window"><rect x="1045" y="142" width="390" height="270"/></clipPath>
    </defs>
    <g aria-hidden="true" pointer-events="none">
      <ellipse class="room-lamplight scene-motion" cx="245" cy="370" rx="170" ry="145" fill="url(#office-lamp-light)"/>
      <path class="office-daylight scene-motion" d="M1035 135 H1490 L1320 700 H760 Z" fill="url(#office-daylight)"/>
      <g clip-path="url(#office-window)">${motes}</g>
    </g>
  `);
}

function openOffice(): string {
  const motes = Array.from({length: 10}, (_, i) =>
    `<circle class="office-mote scene-motion" cx="${500 + i * 73 % 700}" cy="${65 + i * 31 % 150}" r="${i % 3 ? 1.6 : 2.2}" fill="#fff7de" style="animation-delay:-${i * 1.7}s;animation-duration:${14 + i % 4}s"/>`
  ).join('');
  return wrap('open-office', 'Светлый офис команды с рабочими местами и панорамными окнами', `
    <image href="${openOfficeImage}" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <defs>
      <radialGradient id="team-screen-light"><stop stop-color="#c3ddff" stop-opacity=".3"/><stop offset="1" stop-color="#c3ddff" stop-opacity="0"/></radialGradient>
      <linearGradient id="team-daylight" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#fff0bc" stop-opacity=".1"/><stop offset="1" stop-color="#fff0bc" stop-opacity="0"/></linearGradient>
      <clipPath id="team-windows"><rect x="480" y="42" width="775" height="170"/></clipPath>
    </defs>
    <g aria-hidden="true" pointer-events="none">
      <ellipse class="room-glow scene-motion" cx="840" cy="320" rx="165" ry="110" fill="url(#team-screen-light)"/>
      <path class="office-daylight scene-motion" d="M980 40 H1260 L1100 790 H350 Z" fill="url(#team-daylight)"/>
      <g clip-path="url(#team-windows)">${motes}</g>
      <g class="room-steam scene-motion" fill="none" stroke="#fff4db" stroke-width="2" stroke-linecap="round" opacity=".24">
        <path d="M1012 367 Q1004 355 1013 343 Q1021 330 1013 319"/>
        <path d="M1026 369 Q1034 357 1027 347"/>
      </g>
    </g>
  `);
}

function kitchen(): string {
  return wrap('kitchen', 'Уютная кухня команды с обеденным столом и зелёными шкафами', `
    <image href="${kitchenImage}" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <defs>
      <radialGradient id="kitchen-lamp-light"><stop stop-color="#ffe3a0" stop-opacity=".32"/><stop offset="1" stop-color="#ffe3a0" stop-opacity="0"/></radialGradient>
      <linearGradient id="kitchen-daylight" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#fff0bc" stop-opacity=".1"/><stop offset="1" stop-color="#fff0bc" stop-opacity="0"/></linearGradient>
    </defs>
    <g aria-hidden="true" pointer-events="none">
      <ellipse class="room-lamplight scene-motion" cx="300" cy="105" rx="175" ry="140" fill="url(#kitchen-lamp-light)"/>
      <path class="office-daylight scene-motion" d="M790 40 H1380 L1260 830 H460 Z" fill="url(#kitchen-daylight)"/>
      <g class="room-steam scene-motion" fill="none" stroke="#fff5e2" stroke-width="2.5" stroke-linecap="round" opacity=".24">
        <path d="M1030 388 Q1020 373 1030 360 Q1040 345 1031 332"/>
        <path d="M1044 391 Q1054 378 1046 365"/>
      </g>
    </g>
  `);
}

function citySunset(): string {
  // Keep the content id stable for existing scenes and saved games.
  const stars = Array.from({length: 16}, (_, i) =>
    `<circle class="room-star scene-motion" cx="${400 + i * 71 % 780}" cy="${28 + i * 37 % 170}" r="${i % 4 ? 1.3 : 2}" fill="#e5eaff" style="animation-delay:-${i * .8}s;animation-duration:${5 + i % 4}s"/>`
  ).join('');
  const reflections = Array.from({length: 7}, (_, i) =>
    `<path class="city-reflection scene-motion" d="M${410 + i * 110} ${478 + i % 3 * 8} h${20 + i % 3 * 7} m-18 7 h22" fill="none" stroke="#ffd48e" stroke-width="2" stroke-linecap="round" style="animation-delay:-${i * .8}s;animation-duration:${6 + i % 3}s"/>`
  ).join('');
  return wrap('city-sunset', 'Ночной город с огнями и тихой набережной', `
    <image href="${cityNightImage}" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <defs>
      <radialGradient id="city-lantern-light"><stop stop-color="#ffd58a" stop-opacity=".34"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient>
    </defs>
    <g aria-hidden="true" pointer-events="none">
      ${stars}
      <ellipse class="room-lamplight scene-motion" cx="1393" cy="188" rx="115" ry="125" fill="url(#city-lantern-light)"/>
      ${reflections}
    </g>
  `);
}

function placeholder(id: string, title: string): string {
  return wrap(id, title, `
    <rect width="1600" height="900" fill="#241F3E"/>
    <rect x="60" y="60" width="1480" height="780" rx="24" fill="none" stroke="#4A4174"
      stroke-width="4" stroke-dasharray="18 14"/>
    <text x="800" y="430" text-anchor="middle" font-family="Rubik, sans-serif" font-size="46"
      fill="#8C84AE">${title}</text>
    <text x="800" y="490" text-anchor="middle" font-family="Rubik, sans-serif" font-size="26"
      fill="#6B6390">локация появится на этапе 08</text>
  `);
}

const BUILT: Record<string, () => string> = {
  'crt-campus': crtCampus,
  'assembly-hall': assemblyHall,
  'hero-room': heroRoom,
  laptop,
  'hr-office': hrOffice,
  'open-office': openOffice,
  kitchen,
  'city-sunset': citySunset
};

export function renderBackground(id: string, title: string): string {
  const build = BUILT[id];
  return build ? build() : placeholder(id, title);
}

export function isBuilt(id: string): boolean {
  return id in BUILT;
}
