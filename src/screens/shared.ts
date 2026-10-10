export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, ch =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;'
  );
}

/** 100000 → «100 000 ₽» */
export function formatSalary(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₽`;
}
