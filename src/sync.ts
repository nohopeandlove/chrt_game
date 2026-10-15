import { makeReport, parseReport } from './reporting.ts';
import type { StudentReport } from './reporting.ts';
import type { GameState } from './types.ts';

type Link = { id: string; token: string; revision: number };
let message = 'Результаты будут автоматически сохранены после начала игры.';
const pending = new Map<string, StudentReport>();
const links = new Map<string, Link>();
const fingerprints = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
function persistPending(): void {
  try { localStorage.setItem('ya-specialist/pending-reports', JSON.stringify([...pending])); } catch { /* Keep retrying from memory if storage is full or unavailable. */ }
}
function status(value: string): void { message=value; document.dispatchEvent(new CustomEvent('server-sync-status',{detail:value})); }
export function syncStatus(): string { return message; }
function persist(key: string, link: Link): void {
  links.set(key,link);
  try { localStorage.setItem(`ya-specialist/server-session/${key}`,JSON.stringify(link)); } catch { /* The current session can still sync. */ }
}
async function responseJson(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json() as Record<string,unknown>; } catch { throw new Error('Сервер результатов недоступен.'); }
}
async function linkFor(key: string): Promise<Link> {
  let link=links.get(key);
  if(!link)try {
    const value=JSON.parse(localStorage.getItem(`ya-specialist/server-session/${key}`) || 'null') as Link | null;
    if(value && typeof value.id==='string' && typeof value.token==='string' && Number.isSafeInteger(value.revision))link=value;
  } catch { /* create a new server session */ }
  if(link)return link;
  const response=await fetch('/api/student/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
  const data=await responseJson(response);
  if(!response.ok || typeof data.id!=='string' || typeof data.token!=='string')throw new Error('Не удалось открыть сессию результатов.');
  link={id:data.id,token:data.token,revision:0};persist(key,link);return link;
}
async function send(key: string, report: StudentReport): Promise<void> {
  const link=await linkFor(key);
  for(let attempt=0;attempt<2;attempt++) {
    const revision=link.revision+1;
    const response=await fetch(`/api/student/reports/${encodeURIComponent(link.id)}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${link.token}`},body:JSON.stringify({report,revision}),signal:AbortSignal.timeout(15000)});
    const data=await responseJson(response);
    if(response.status===409 && typeof data.revision==='number'){link.revision=data.revision;persist(key,link);continue;}
    if(response.status===401){links.delete(key);try{localStorage.removeItem(`ya-specialist/server-session/${key}`);}catch{/* session only */}}
    if(!response.ok)throw new Error('Сохранение на сервере временно недоступно.');
    link.revision=revision;persist(key,link);return;
  }
  throw new Error('Откройте прохождение только в одной вкладке.');
}
async function flush(): Promise<void> {
  if(running || !pending.size)return;
  let failed=false;
  running=true;status('Сохраняем результаты преподавателю…');
  try {
    for(const [key,report] of pending) {
      await send(key,report);
      if(pending.get(key)===report)pending.delete(key);
      persistPending();
    }
    status(pending.size?'Есть новые результаты, продолжаем сохранение…':'Результаты сохранены на сервере. Преподаватель увидит их автоматически.');
  } catch {
    failed=true;
    status('Нет связи с сервером результатов. Игра продолжается; повторим сохранение автоматически. Не закрывайте вкладку до подтверждения.');
  } finally {
    running=false;
    if(pending.size)timer=setTimeout(()=>void flush(),failed ? 10000 : 400);
  }
}
export function queueSync(state: GameState): void {
  const report=makeReport(state,true);
  const key=state.analytics.sessionId;
  const fingerprint=JSON.stringify({analytics:report.analytics,diagnostics:report.diagnostics});
  if(fingerprints.get(key)===fingerprint)return;
  fingerprints.set(key,fingerprint);pending.set(key,report);persistPending();status('Есть новые результаты. Сохраняем автоматически…');
  clearTimeout(timer);timer=setTimeout(()=>void flush(),400);
}
export function installSync(): void {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('ya-specialist/pending-reports') || '[]');
    if (Array.isArray(stored)) for (const entry of stored) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
      try { pending.set(entry[0], parseReport(JSON.stringify(entry[1]))); } catch { /* ignore corrupt pending item */ }
    }
  } catch { /* browser storage unavailable */ }
  if (pending.size) timer=setTimeout(()=>void flush(),400);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')void flush();});
  document.addEventListener('game-saved', event=>queueSync((event as CustomEvent<GameState>).detail));
  window.addEventListener('online',()=>void flush());
}
