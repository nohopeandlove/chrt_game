import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const pages = [
  { file: 'docs/ABOUT.md', slug: 'about', title: 'Об электронном образовательном ресурсе', public: true },
  { file: 'docs/METHODICAL.md', slug: 'methodical', title: 'Методические указания' },
  { file: 'docs/CRITERIA.md', slug: 'criteria', title: 'Соответствие критериям' },
  { file: 'docs/ANALYTICS.md', slug: 'analytics', title: 'Оценивание и аналитика' }
];
const pagePath = page => page.public ? '/about/' : `/materials/${page.slug}/`;
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function inline(s) {
  // Protect code spans from link/emphasis parsing; all source text is escaped.
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(`<code>${esc(code)}</code>`) - 1}\u0000`);
  s = esc(s).replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, href) => {
    const page = pages.find(p => basename(p.file) === basename(href));
    const target = page ? pagePath(page) : /^https?:\/\//.test(href) ? href : '';
    return target ? `<a href="${target}">${label}</a>` : label;
  }).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, n) => codes[Number(n)]);
}
function markdown(source) {
  const lines = source.replace(/\r/g, '').split('\n');
  const out = [], toc = [];
  let index = 0, heading = 0;
  while (index < lines.length) {
    const line = lines[index++];
    if (!line.trim()) continue;
    if (line.startsWith('```')) {
      const code = [];
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++]);
      index++; out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); continue;
    }
    const h = /^(#{1,6}) (.+)$/.exec(line);
    if (h) {
      const level = h[1].length, title = h[2], id = `section-${heading++}`;
      if (level === 2) toc.push(`<li><a href="#${id}">${inline(title)}</a></li>`);
      out.push(`<h${level} id="${id}">${inline(title)}</h${level}>`); continue;
    }
    if (line.startsWith('|') && /^\|[\s:|-]+\|\s*$/.test(lines[index] ?? '')) {
      const cells = (s) => s.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
      index++;
      const rows = [];
      while (index < lines.length && lines[index].startsWith('|')) rows.push(`<tr>${cells(lines[index++]).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`);
      out.push(`<div class="table-scroll" tabindex="0" role="region" aria-label="Таблица"><table><thead><tr>${cells(line).map(c => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`); continue;
    }
    const list = /^(?:- |\d+\. )/.exec(line);
    if (list) {
      const ordered = /^\d/.test(line), tag = ordered ? 'ol' : 'ul', items = [];
      let item = line.replace(/^(?:- |\d+\. )/, '');
      while (index < lines.length) {
        const next = lines[index];
        if (/^(?:- |\d+\. )/.test(next)) { items.push(`<li>${inline(item)}</li>`); item = next.replace(/^(?:- |\d+\. )/, ''); index++; }
        else if (/^\s+\S/.test(next) && !next.trimStart().startsWith('```')) { item += ' ' + next.trim(); index++; }
        else break;
      }
      items.push(`<li>${inline(item)}</li>`); out.push(`<${tag}>${items.join('')}</${tag}>`); continue;
    }
    const paragraph = [line];
    while (index < lines.length && lines[index].trim() && !/^(#|```|\||- |\d+\. )/.test(lines[index])) paragraph.push(lines[index++]);
    out.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return { html: out.join('\n'), toc: toc.join('') };
}
function render(page) {
  const { html, toc } = markdown(readFileSync(resolve(page.file), 'utf8'));
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.title} — Я — специалист</title><style>
  *{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;background:#f4f6fa;color:#23344d;font:18px/1.65 system-ui,sans-serif}a{color:#2157a0;text-underline-offset:3px}a:focus-visible, [tabindex]:focus-visible{outline:3px solid #ba4800;outline-offset:4px}.wrap{width:min(1080px,100%);margin:auto;padding:28px 24px}header{background:white;border-bottom:1px solid #d4deeb}nav{display:flex;flex-wrap:wrap;gap:12px 24px}nav a[aria-current]{font-weight:750}.brand{font-weight:750;display:block;margin-bottom:16px}main{background:white;border:1px solid #d4deeb;border-radius:20px;margin-top:28px!important;margin-bottom:36px!important}h1{font-size:clamp(26px,4vw,40px);line-height:1.2}h2{font-size:26px;margin-top:40px;line-height:1.35}h3{font-size:21px}h1,h2,h3,p,li{overflow-wrap:anywhere}pre{overflow:auto;background:#f0f3f8;padding:18px;border-radius:12px;font-size:14px}code{font-family:ui-monospace,monospace;font-size:.88em;overflow-wrap:anywhere}.table-scroll{max-width:100%;overflow-x:auto;margin:24px 0}table{border-collapse:collapse;width:100%;min-width:650px;font-size:16px}th,td{text-align:left;vertical-align:top;border:1px solid #d4deeb;padding:14px}th{background:#edf3fb}aside{padding:16px 24px;background:#f0f5fc;border-radius:12px}footer{font-size:15px}li+li{margin-top:8px}@media(max-width:500px){.wrap{padding:20px 16px}body{font-size:16px}main{border-radius:0}h2{font-size:23px}aside{padding:12px}}@media print{header,aside,footer{display:none}body{background:white;color:black;font-size:11pt}main{border:0!important;margin:0!important;width:100%!important;padding:0!important}.table-scroll{overflow:visible}table{min-width:0;font-size:9pt}pre{white-space:pre-wrap}h2,h3{break-after:avoid}}
  </style></head><body><header><div class="wrap"><a class="brand" href="${page.public ? "/" : "/teacher/"}">← ${page.public ? "Вернуться к игре «Я — специалист»" : "Кабинет преподавателя"}</a><nav aria-label="Учебные материалы">${(page.public ? [] : pages.filter(p => p.public || p.slug === 'analytics')).map(p => `<a href="${pagePath(p)}"${p.slug === page.slug ? ' aria-current="page"' : ''}>${p.title}</a>`).join('')}</nav></div></header><main class="wrap" id="content">${toc ? `<aside aria-label="Содержание"><strong>На этой странице</strong><ul>${toc}</ul></aside>` : ''}<article>${html}</article></main><footer class="wrap">ГБПОУ «Челябинский радиотехнический техникум» · «Я — специалист». Материалы можно распечатать через меню браузера.</footer></body></html>`;
}
export function materialPages() {
  return {
    name: 'material-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0];
        const page = pages.find(p => pathname === pagePath(p) || pathname === `${pagePath(p)}index.html`);
        if (!page) return next();
        res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(render(page));
      });
    },
    generateBundle() { for (const page of pages) this.emitFile({ type: 'asset', fileName: `${pagePath(page).slice(1)}index.html`, source: render(page) }); }
  };
}
