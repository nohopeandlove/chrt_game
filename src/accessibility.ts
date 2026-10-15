export function installAccessibility(root: HTMLElement, trigger: HTMLButtonElement): void {
  const defaults = { size: '18', palette: 'default', font: 'sans', spacing: 'normal', lines: 'normal' };
  type Preferences = typeof defaults;
  let prefs: Preferences = { ...defaults };
  try {
    const stored = JSON.parse(localStorage.getItem('ya-specialist/vision') || 'null');
    if (stored && typeof stored === 'object') prefs = { ...prefs, ...stored };
    else {
      if (localStorage.getItem('ya-specialist/large') === 'true') prefs.size = '22';
      if (localStorage.getItem('ya-specialist/contrast') === 'true') prefs.palette = 'light';
    }
  } catch { /* Available without storage. */ }
  const choices: Record<keyof Preferences, string[][]> = {
    size: [['18','Обычный'],['22','Крупный'],['26','Очень крупный']],
    palette: [['default','Обычная'],['light','Чёрный на белом'],['dark','Белый на чёрном'],['yellow','Жёлтый на чёрном']],
    font: [['sans','Без засечек'],['serif','С засечками']],
    spacing: [['normal','Обычный'],['wide','Увеличенный']],
    lines: [['normal','Обычный'],['wide','Увеличенный']]
  };
  for (const key of Object.keys(defaults) as (keyof Preferences)[]) if (!choices[key].some(([v]) => v === prefs[key])) prefs[key] = defaults[key];
  const apply = (): void => {
    const html = document.documentElement;
    html.classList.remove('a11y-large','a11y-contrast');
    html.style.setProperty('--vision-size', `${prefs.size}px`);
    html.style.setProperty('--vision-font', prefs.font === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif');
    html.style.setProperty('--font', prefs.font === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif');
    html.style.setProperty('--vision-spacing', prefs.spacing === 'wide' ? '.06em' : 'normal');
    html.style.setProperty('--vision-lines', prefs.lines === 'wide' ? '1.9' : '1.6');
    html.dataset['visionPalette'] = prefs.palette;
    html.classList.toggle('vision-contrast', prefs.palette !== 'default');
    html.classList.toggle('vision-large', prefs.size !== '18');
    document.dispatchEvent(new Event('accessibility-updated'));
    try { localStorage.setItem('ya-specialist/vision', JSON.stringify(prefs)); } catch { /* Session settings still work. */ }
  };
  apply();
  const dialog = document.createElement('dialog');
  dialog.className = 'learning-dialog vision-dialog'; dialog.setAttribute('aria-labelledby','vision-title');
  root.append(dialog);
  const labels: Record<keyof Preferences,string> = {size:'Размер текста',palette:'Цветовая схема',font:'Шрифт',spacing:'Интервал между буквами',lines:'Межстрочный интервал'};
  dialog.innerHTML = `<header class="dashboard-head"><h2 id="vision-title">Версия для слабовидящих</h2><button class="icon-close" type="button" data-close aria-label="Закрыть настройки">×</button></header><p>Настройки применяются сразу и сохраняются для следующих посещений.</p><form class="vision-settings">${(Object.keys(labels) as (keyof Preferences)[]).map(key => `<label class="field"><span>${labels[key]}</span><select class="input" name="${key}">${choices[key].map(([value,label])=>`<option value="${value}"${prefs[key]===value?' selected':''}>${label}</option>`).join('')}</select></label>`).join('')}<div class="learning-actions"><button class="btn" type="button" data-reset>Сбросить настройки</button><button class="btn btn--primary" type="button" data-close>Вернуться к игре</button></div><p role="status" data-vision-status></p></form>`;
  dialog.querySelector('form')!.addEventListener('change',()=>{
    const data = new FormData(dialog.querySelector('form')!);
    for (const key of Object.keys(defaults) as (keyof Preferences)[]) prefs[key] = String(data.get(key));
    apply(); dialog.querySelector('[data-vision-status]')!.textContent = 'Настройки применены.';
  });
  dialog.querySelector('[data-reset]')!.addEventListener('click',()=>{
    prefs = { ...defaults }; apply();
    for (const key of Object.keys(defaults) as (keyof Preferences)[]) dialog.querySelector<HTMLSelectElement>(`[name=${key}]`)!.value = prefs[key];
    dialog.querySelector('[data-vision-status]')!.textContent = 'Восстановлены обычные настройки.';
  });
  dialog.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
  trigger.setAttribute('aria-haspopup','dialog');
  trigger.addEventListener('click',()=>dialog.showModal());
}
