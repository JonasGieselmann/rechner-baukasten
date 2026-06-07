// Best-effort Instagram enrichment. Public Instagram data is heavily blocked,
// so this is opportunistic: we try the public profile page's og:description
// (which historically embeds follower/post counts) with a short timeout and
// degrade gracefully to null. Reliable data needs the Instagram Graph API or a
// third-party data provider (a key/decision for the operator) - see notes.

export interface InstagramSignals {
  handle: string | null;
  reachable: boolean;
  followers: number | null;
  posts: number | null;
  fullName: string | null;
  notes: string[];
}

const TIMEOUT_MS = 6000;
const UA = 'Mozilla/5.0 (compatible; BeautyFlowBot/1.0; +https://kalku.layer-one.io)';

export function normalizeHandle(raw: string): string | null {
  let s = (raw || '').trim();
  if (!s) return null;
  const urlMatch = s.match(/instagram\.com\/([^/?#]+)/i);
  if (urlMatch) s = urlMatch[1];
  s = s.replace(/^@/, '').trim();
  if (!/^[A-Za-z0-9._]{1,40}$/.test(s)) return null;
  return s;
}

// Parse counts like "12.3k", "1,234", "2M" into a number.
export function parseCount(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s/g, '');
  const m = s.match(/^([\d.,]+)([km])?$/);
  if (!m) return null;
  let num = parseFloat(m[1].replace(/,/g, ''));
  if (Number.isNaN(num)) return null;
  if (m[2] === 'k') num *= 1_000;
  if (m[2] === 'm') num *= 1_000_000;
  return Math.round(num);
}

export async function fetchInstagram(rawHandle: string): Promise<InstagramSignals> {
  const handle = normalizeHandle(rawHandle);
  const out: InstagramSignals = {
    handle,
    reachable: false,
    followers: null,
    posts: null,
    fullName: null,
    notes: [],
  };
  if (!handle) {
    out.notes.push('Kein gültiger Instagram-Handle.');
    return out;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(handle)}/`, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    });
    out.reachable = res.ok;
    if (!res.ok) {
      out.notes.push('Instagram-Profil aktuell nicht öffentlich abrufbar.');
      return out;
    }
    const html = await res.text();
    const desc =
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      '';
    const followersMatch = desc.match(/([\d.,]+\s*[KkMm]?)\s*Followers/i);
    const postsMatch = desc.match(/([\d.,]+\s*[KkMm]?)\s*Posts/i);
    if (followersMatch) out.followers = parseCount(followersMatch[1]);
    if (postsMatch) out.posts = parseCount(postsMatch[1]);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) out.fullName = titleMatch[1].replace(/\s*\(@.*$/, '').trim() || null;
    if (out.followers === null) {
      out.notes.push(
        'Follower-Zahl nicht öffentlich auslesbar. Für verlässliche Instagram-Daten ist die Instagram-Graph-API oder ein Datenanbieter nötig.',
      );
    }
  } catch (err) {
    out.notes.push(
      err instanceof Error && err.name === 'AbortError'
        ? 'Instagram antwortete nicht innerhalb des Zeitlimits.'
        : 'Instagram konnte nicht abgerufen werden.',
    );
  } finally {
    clearTimeout(timer);
  }
  return out;
}
