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
    <g aria-hidden="true" pointer-events="none">${Array.from({length: 12}, (_, i) =>
      `<rect class="campus-confetti scene-motion" x="${90 + i * 127}" y="-30" width="${i % 2 ? 5 : 7}" height="12" rx="2" fill="${['#e8bd65', '#639cb8', '#c27681'][i % 3]}" style="animation-delay:-${i * 1.7}s;animation-duration:${16 + i % 5}s"/>`
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
    return `<circle class="room-star scene-motion" cx="${x}" cy="${y}" r="${i % 3 ? 1.6 : 2.5}" fill="#fff0cb" style="animation-delay:-${i * .7}s"/>`;
  }).join('');
  return wrap('hero-room', 'Уютная комната с ноутбуком и ночным окном', `
    <image href="${heroRoomImage}" width="1600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <defs>
      <radialGradient id="room-screen-light"><stop stop-color="#b4dbff" stop-opacity=".22"/><stop offset="1" stop-color="#b4dbff" stop-opacity="0"/></radialGradient>
      <radialGradient id="room-lamp-light"><stop stop-color="#ffcc83" stop-opacity=".18"/><stop offset="1" stop-color="#ffcc83" stop-opacity="0"/></radialGradient>
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
      <radialGradient id="laptop-screen-light"><stop stop-color="#c3d8ff" stop-opacity=".16"/><stop offset="1" stop-color="#c3d8ff" stop-opacity="0"/></radialGradient>
      <radialGradient id="laptop-lamp-light"><stop stop-color="#ffcb86" stop-opacity=".2"/><stop offset="1" stop-color="#ffcb86" stop-opacity="0"/></radialGradient>
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
      <radialGradient id="office-lamp-light"><stop stop-color="#ffe2a5" stop-opacity=".17"/><stop offset="1" stop-color="#ffe2a5" stop-opacity="0"/></radialGradient>
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
  const stickies = ['#E2B653', '#54C9A0', '#F0895D', '#A992FF'];
  const boardNotes = (x: number, y: number): string =>
    stickies
      .map(
        (c, i) =>
          `<rect class="sticky" x="${x + (i % 2) * 44}" y="${y + Math.floor(i / 2) * 44}" width="34" height="34" rx="3" fill="${c}" style="animation-delay:${i * 0.7}s"/>`
      )
      .join('');
  return wrap('open-office', 'Открытый офис', `
    <rect width="1600" height="900" fill="#DCE7F2"/>
    <rect width="1600" height="620" fill="url(#office-sky)"/>
    <g class="clouds">
      <ellipse cx="300" cy="180" rx="120" ry="40" fill="#FFFFFF" opacity=".9"/>
      <ellipse cx="360" cy="160" rx="80" ry="34" fill="#FFFFFF" opacity=".9"/>
      <ellipse cx="900" cy="120" rx="140" ry="42" fill="#FFFFFF" opacity=".85"/>
      <ellipse cx="1300" cy="220" rx="110" ry="36" fill="#FFFFFF" opacity=".85"/>
    </g>
    <path d="M0,460 Q200,360 400,440 T800,420 T1200,450 T1600,410 V620 H0 Z" fill="#9FB8CF"/>
    <rect y="600" width="1600" height="20" fill="#B9C9DB"/>
    <g fill="none" stroke="#F0F4F8" stroke-width="18">
      <path d="M0,60 H1600"/>
      <path d="M420,60 V620 M1180,60 V620"/>
    </g>
    <rect y="620" width="1600" height="280" fill="#EEF2F6"/>

    <g>
      <rect x="140" y="110" width="200" height="360" rx="10" fill="#3D4E6B"/>
      ${boardNotes(180, 170)}
      <rect x="1260" y="110" width="200" height="360" rx="10" fill="#3D4E6B"/>
      ${boardNotes(1300, 200)}
    </g>

    <g>
      <rect x="480" y="470" width="640" height="24" rx="6" fill="#FFFFFF"/>
      <rect x="500" y="494" width="20" height="200" fill="#C9D3DE"/>
      <rect x="1080" y="494" width="20" height="200" fill="#C9D3DE"/>
      <rect x="640" y="330" width="220" height="140" rx="10" fill="#2E3A59"/>
      <rect x="652" y="342" width="196" height="116" rx="6" fill="#F4F6FB"/>
      <rect x="880" y="380" width="120" height="90" rx="6" fill="#5B3FD6" opacity=".8"/>
      <path d="M980,470 q10,-90 -10,-160" stroke="#7FA8D4" stroke-width="10" fill="none" stroke-linecap="round"/>
    </g>

    <g transform="translate(800 200)">
      <circle r="52" fill="#FFFFFF" stroke="#3D4E6B" stroke-width="6"/>
      <line x1="0" y1="0" x2="0" y2="-30" stroke="#3D4E6B" stroke-width="6" stroke-linecap="round"/>
      <line class="minute" x1="0" y1="0" x2="0" y2="-40" stroke="#5B3FD6" stroke-width="4" stroke-linecap="round"/>
      <circle r="5" fill="#3D4E6B"/>
    </g>

    <defs>
      <linearGradient id="office-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7FA8D4"/>
        <stop offset="100%" stop-color="#DCE7F2"/>
      </linearGradient>
    </defs>
  `);
}

function kitchen(): string {
  return wrap('kitchen', 'Кухня', `
    <rect width="1600" height="900" fill="#F5EFE6"/>
    <rect width="1600" height="560" fill="#EFE6D8"/>
    <rect y="560" width="1600" height="340" fill="#D9C7B0"/>
    <g fill="#4A6B5D">
      <rect x="60" y="120" width="300" height="220" rx="10"/>
      <rect x="380" y="120" width="300" height="220" rx="10"/>
      <rect x="920" y="120" width="300" height="220" rx="10"/>
      <rect x="1240" y="120" width="300" height="220" rx="10"/>
    </g>
    <g fill="#F5EFE6">
      <rect x="190" y="220" width="40" height="8" rx="4"/><rect x="510" y="220" width="40" height="8" rx="4"/>
      <rect x="1050" y="220" width="40" height="8" rx="4"/><rect x="1370" y="220" width="40" height="8" rx="4"/>
    </g>
    <rect x="700" y="120" width="200" height="220" rx="8" fill="#C7DCE8"/>
    <rect x="0" y="470" width="1600" height="40" fill="#C4A484"/>
    <rect x="0" y="510" width="1600" height="220" fill="#4A6B5D"/>
    <rect x="0" y="510" width="1600" height="6" fill="#3B5649"/>

    <g>
      <rect x="640" y="400" width="90" height="72" rx="10" fill="#D96C4A"/>
      <path d="M730,420 q40,0 40,26 q0,26 -40,26" fill="none" stroke="#D96C4A" stroke-width="10"/>
      <g class="steam">
        <path d="M660,392 q10,-20 0,-40 q-10,-20 0,-40" stroke="#B9AFA3" stroke-width="5" fill="none" stroke-linecap="round" style="animation-delay:0s"/>
        <path d="M685,392 q10,-20 0,-40 q-10,-20 0,-40" stroke="#B9AFA3" stroke-width="5" fill="none" stroke-linecap="round" style="animation-delay:1.6s"/>
        <path d="M710,392 q10,-20 0,-40 q-10,-20 0,-40" stroke="#B9AFA3" stroke-width="5" fill="none" stroke-linecap="round" style="animation-delay:3.2s"/>
      </g>
    </g>
    <g>
      <rect x="1120" y="380" width="70" height="90" rx="12" fill="#B87252"/>
      <path d="M1155,380 C 1120,330 1110,290 1150,270 C 1180,300 1200,330 1155,380 Z" fill="#4A6B5D"/>
      <path d="M1160,378 C 1200,340 1220,300 1190,280" fill="none" stroke="#4A6B5D" stroke-width="14" stroke-linecap="round"/>
    </g>
  `);
}

function citySunset(): string {
  const far: string[] = [];
  for (let i = 0; i < 14; i++) {
    const x = i * 118;
    const h = 120 + ((i * 53) % 160);
    far.push(`<rect x="${x}" y="${640 - h}" width="96" height="${h + 40}" fill="#B75C8A" opacity=".75"/>`);
  }
  const near: string[] = [];
  for (let i = 0; i < 8; i++) {
    const x = -40 + i * 220;
    const h = 200 + ((i * 71) % 220);
    near.push(`<rect x="${x}" y="${900 - h}" width="160" height="${h}" fill="#4A2A5E"/>`);
    for (let w = 0; w < 4; w++) {
      for (let r = 0; r < Math.floor(h / 60); r++) {
        if ((w + r + i) % 3 === 0) continue;
        near.push(`<rect x="${x + 22 + w * 34}" y="${900 - h + 24 + r * 60}" width="16" height="24" fill="#FFD98E" opacity=".75"/>`);
      }
    }
  }
  return wrap('city-sunset', 'Город на закате', `
    <rect width="1600" height="900" fill="url(#sunset)"/>
    <g class="sun">
      <circle cx="800" cy="520" r="120" fill="#FFF1C2" opacity=".35"/>
      <circle cx="800" cy="520" r="80" fill="#FFF6DC"/>
    </g>
    <g class="parallax">${far.join('')}</g>
    ${near.join('')}
    <g>
      <rect x="1200" y="700" width="10" height="200" fill="#2A1638"/>
      <path d="M1205,700 q0,-40 40,-40" stroke="#2A1638" stroke-width="10" fill="none"/>
      <circle cx="1248" cy="660" r="10" fill="#FFD98E"/>
    </g>
    <defs>
      <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7B3F8C"/>
        <stop offset="45%" stop-color="#E85D75"/>
        <stop offset="75%" stop-color="#F5A65B"/>
        <stop offset="100%" stop-color="#FFD98E"/>
      </linearGradient>
    </defs>
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
