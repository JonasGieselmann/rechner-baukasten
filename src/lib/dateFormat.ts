const FULL = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const SHORT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDateTime(value: string | number | Date): string {
  return FULL.format(new Date(value));
}

export function formatDate(value: string | number | Date): string {
  return SHORT.format(new Date(value));
}
