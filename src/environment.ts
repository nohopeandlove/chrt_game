/** Runtime label: the same Docker image can run in either isolated environment. */
export async function installEnvironmentBadge(host: HTMLElement): Promise<void> {
  const badge = document.createElement('div');
  badge.className = 'environment-banner'; badge.hidden = true;
  badge.setAttribute('role','status'); host.append(badge);
  try {
    const response = await fetch('/api/environment', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json() as { environment?: string };
    if (data.environment !== 'dev') return;
    badge.textContent = 'Тестовая версия (DEV) · Здесь проверяются новые изменения. Используйте вымышленные данные.';
    badge.hidden = false;
    if (!document.title.startsWith('[DEV]')) document.title = `[DEV] ${document.title}`;
  } catch { /* The banner never blocks loading the application. */ }
}
