export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length <= 100;
}

export function sanitizeString(input: unknown, max = 500): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, max).trim();
}
