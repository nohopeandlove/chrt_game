export function installAccessibility(root: HTMLElement, trigger: HTMLButtonElement): void {
  const defaults = { size: '18', palette: 'default', font: 'sans', spacing: 'normal', lines: 'normal', images: 'color' };
  type Preferences = typeof defaults;
  let prefs: Preferences = { ...defaults };
  let expanded = false;
  try {
    const stored = JSON.parse(localStorage.getItem('ya-specialist/vision') || 'null');
    if (stored && typeof stored === 'object') prefs = { ...prefs, ...stored };
    else {
      if (localStorage.getItem('ya-specialist/large') === 'true') prefs.size = '22';
      if (localStorage.getItem('ya-specialist/contrast') === 'true') prefs.palette = 'light';
    }
    expanded = localStorage.getItem('ya-specialist/vision-panel-open') === 'true';
  } catch { /* Available without storage. */ }
  const choices: Record<Exclude<keyof Preferences, 'size'>, string[][]> = {
    palette: [['default','Обычная палитра'],['light','Чёрный на белом'],['dark','Белый на чёрном'],['yellow','Жёлтый на чёрном'],['blue','Синий на голубом'],['cream','Коричневый на бежевом']],
    font: [['sans','Без засечек'],['serif','С засечками']],
    spacing: [['normal','Стандартное'],['medium','Среднее'],['wide','Большое']],
    lines: [['normal','Стандартный'],['medium','Средний'],['wide','Большой']],
    images: [['gray','Чёрно-белые'],['hidden','Отключить'],['color','Цветные']]
  };
  for (const key of Object.keys(choices) as (keyof typeof choices)[]) if (!choices[key].some(([v]) => v === prefs[key])) prefs[key] = defaults[key];
  if (!Number.isFinite(Number(prefs.size)) || Number(prefs.size) < 18 || Number(prefs.size) > 36) prefs.size = defaults.size;
  const apply = (): void => {
    const html = document.documentElement;
    html.classList.remove('a11y-large','a11y-contrast');
    html.style.setProperty('--vision-size', `${prefs.size}px`);
    html.style.setProperty('--vision-font', prefs.font === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif');
    html.style.setProperty('--font', prefs.font === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif');
    html.style.setProperty('--vision-spacing', prefs.spacing === 'wide' ? '.12em' : prefs.spacing === 'medium' ? '.06em' : 'normal');
    html.style.setProperty('--vision-lines', prefs.lines === 'wide' ? '2.2' : prefs.lines === 'medium' ? '1.9' : '1.6');
    html.dataset['visionPalette'] = prefs.palette;
    html.dataset['visionImages'] = prefs.images;
    html.classList.toggle('vision-contrast', prefs.palette !== 'default');
    html.classList.toggle('vision-large', Number(prefs.size) > 18);
    document.dispatchEvent(new Event('accessibility-updated'));
    try { localStorage.setItem('ya-specialist/vision', JSON.stringify(prefs)); } catch { /* Session settings still work. */ }
  };
  apply();
  const panel = document.createElement('section');
  panel.className = 'vision-panel'; panel.id = 'vision-panel';
  panel.setAttribute('aria-label','Настройки версии для слабовидящих');
  (trigger.closest('.learning-tools') ?? root).append(panel);
  const group = (key: keyof typeof choices, label: string): string => `<fieldset class="vision-group"><legend>${label}</legend><div class="vision-options">${choices[key].map(([value,text]) => `<button type="button" data-vision-key="${key}" data-value="${value}" aria-pressed="${prefs[key]===value}"${key==='palette' ? ` class="vision-swatch" data-swatch="${value}" aria-label="${text}" title="${text}"` : ''}>${key==='palette'?'<span aria-hidden="true">А</span>':text}</button>`).join('')}</div></fieldset>`;
  panel.innerHTML = `<div class="vision-top">${group('palette','Цветовая схема')}<label class="vision-range">Размер шрифта: <output data-size-output></output><span class="vision-range-track"><span>100%</span><input type="range" name="size" min="100" max="200" step="1" aria-label="Размер шрифта в процентах"><span>200%</span></span></label><button type="button" data-collapse>Свернуть настройки ↑</button></div><div class="vision-details">${group('images','Изображения')}${group('lines','Межстрочный интервал')}${group('spacing','Расстояние между буквами')}${group('font','Шрифт')}</div><div class="vision-bottom"><button type="button" data-reset>Вернуть обычную версию</button><span role="status" data-vision-status>Изменения сохраняются автоматически.</span></div>`;
  const sync = (): void => {
    panel.querySelectorAll<HTMLButtonElement>('[data-vision-key]').forEach(b => b.setAttribute('aria-pressed',String(prefs[b.dataset['visionKey'] as keyof Preferences] === b.dataset['value'])));
    const percent = Math.round(Number(prefs.size) / 18 * 100);
    panel.querySelector<HTMLInputElement>('[name=size]')!.value = String(percent);
    panel.querySelector<HTMLOutputElement>('[data-size-output]')!.value = `${percent}%`;
  };
  const setExpanded = (value: boolean): void => {
    expanded = value; panel.hidden = !expanded;
    trigger.setAttribute('aria-expanded',String(expanded));
    try { localStorage.setItem('ya-specialist/vision-panel-open',String(expanded)); } catch { /* Session only. */ }
  };
  trigger.removeAttribute('aria-haspopup'); trigger.setAttribute('aria-controls',panel.id);
  trigger.addEventListener('click',()=>setExpanded(!expanded));
  panel.querySelector('[data-collapse]')!.addEventListener('click',()=>{setExpanded(false);trigger.focus();});
  panel.querySelectorAll<HTMLButtonElement>('[data-vision-key]').forEach(b=>b.addEventListener('click',()=>{
    prefs[b.dataset['visionKey'] as keyof Preferences] = b.dataset['value']!; apply(); sync();
    panel.querySelector('[data-vision-status]')!.textContent = 'Настройки применены.';
  }));
  panel.querySelector<HTMLInputElement>('[name=size]')!.addEventListener('input',event=>{
    prefs.size = String(Number(((event.target as HTMLInputElement).value)) * 18 / 100); apply(); sync();
  });
  panel.querySelector('[data-reset]')!.addEventListener('click',()=>{
    prefs = { ...defaults }; apply(); sync(); panel.querySelector('[data-vision-status]')!.textContent = 'Восстановлена обычная версия.';
  });
  sync(); setExpanded(expanded);
}
