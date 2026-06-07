import * as cheerio from 'cheerio';
import { lookup } from 'node:dns/promises';

// Website branding scrape for the Potenzialanalyse. Fetches the lead's site and
// extracts objective branding/quality signals plus a heuristic branding score.
// Hardened against SSRF (user-supplied URL), with a timeout and byte cap.

export interface BrandingSignals {
  requestedUrl: string;
  finalUrl: string | null;
  reachable: boolean;
  https: boolean;
  statusCode: number | null;
  title: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  themeColor: string | null;
  hasViewport: boolean;
  hasFavicon: boolean;
  fontFamilies: string[];
  detectedColors: string[];
  h1: string | null;
  headingCount: number;
  wordCount: number;
  imageCount: number;
  socialLinks: { instagram: string | null; facebook: string | null; tiktok: string | null };
  brandingScore: number;
  notes: string[];
}

const TIMEOUT_MS = 8000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const UA = 'Mozilla/5.0 (compatible; BeautyFlowBot/1.0; +https://kalku.layer-one.io)';

export function normalizeUrl(raw: string): URL | null {
  let s = (raw || '').trim();
  if (!s) return null;
  // If a scheme is present it must be http/https; reject file:, ftp:, javascript:, etc.
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    if (!/^https?:\/\//i.test(s)) return null;
  } else {
    s = 'https://' + s;
  }
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u;
  } catch {
    return null;
  }
}

// True if an IP literal is loopback / private / link-local / CGNAT / metadata.
export function isBlockedIp(ip: string): boolean {
  let h = ip.toLowerCase().trim().replace(/^\[/, '').replace(/\]$/, '');
  const mapped = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/); // IPv4-mapped IPv6
  if (mapped) h = mapped[1];
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const o = h.split('.').map(Number);
    if (o[0] === 127 || o[0] === 0 || o[0] === 10) return true;
    if (o[0] === 192 && o[1] === 168) return true;
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true;
    if (o[0] === 169 && o[1] === 254) return true; // link-local + cloud metadata
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return true; // CGNAT / Tailscale 100.64.0.0/10
    return false;
  }
  if (h === '::1' || h === '::') return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // ULA fc00::/7
  if (/^fe[89ab]/.test(h)) return true; // link-local fe80::/10
  return false;
}

// String-level host block (loopback/metadata names + IP literals). DNS-resolved
// addresses are validated separately in isHostSafe.
export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '').replace(/^\[/, '').replace(/\]$/, '');
  if (!h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^[\d.]+$/.test(h) || h.includes(':')) return isBlockedIp(h);
  return false;
}

// Resolve a hostname and ensure none of its addresses are in a blocked range.
async function isHostSafe(hostname: string): Promise<boolean> {
  if (isBlockedHost(hostname)) return false;
  try {
    const addrs = await lookup(hostname.replace(/^\[/, '').replace(/\]$/, ''), { all: true });
    return addrs.length > 0 && addrs.every((a) => !isBlockedIp(a.address));
  } catch {
    return false;
  }
}

function abs(base: string, href: string | undefined): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function emptySignals(requestedUrl: string): BrandingSignals {
  return {
    requestedUrl,
    finalUrl: null,
    reachable: false,
    https: false,
    statusCode: null,
    title: null,
    metaDescription: null,
    ogImage: null,
    themeColor: null,
    hasViewport: false,
    hasFavicon: false,
    fontFamilies: [],
    detectedColors: [],
    h1: null,
    headingCount: 0,
    wordCount: 0,
    imageCount: 0,
    socialLinks: { instagram: null, facebook: null, tiktok: null },
    brandingScore: 0,
    notes: [],
  };
}

function computeScore(s: BrandingSignals): { score: number; notes: string[] } {
  let score = 0;
  const notes: string[] = [];
  if (s.https) score += 12;
  else notes.push('Website ohne HTTPS-Verschlüsselung.');
  if (s.title) score += 10;
  else notes.push('Kein aussagekräftiger Seitentitel gefunden.');
  if (s.metaDescription) score += 10;
  else notes.push('Keine Meta-Description (wichtig für Google-Vorschau).');
  if (s.ogImage) score += 12;
  else notes.push('Kein Vorschaubild (Open Graph) für Social-Sharing hinterlegt.');
  if (s.themeColor || s.detectedColors.length > 0) score += 10;
  if (s.hasViewport) score += 16;
  else notes.push('Keine mobile-optimierte Darstellung (Viewport) erkannt.');
  if (s.hasFavicon) score += 5;
  if (s.fontFamilies.length > 0) score += 10;
  if (s.wordCount >= 200) score += 10;
  else notes.push('Wenig Textinhalt, das schwächt Sichtbarkeit und Vertrauen.');
  if (s.h1) score += 5;
  return { score: Math.min(100, score), notes };
}

export async function scrapeWebsite(requestedUrl: string): Promise<BrandingSignals> {
  const out = emptySignals(requestedUrl);
  const url = normalizeUrl(requestedUrl);
  if (!url) {
    out.notes.push('Ungültige Website-URL.');
    return out;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let html = '';
  try {
    // Manual redirect handling: validate every hop (host + resolved IPs) so an
    // open redirect cannot reach an internal/metadata address (SSRF).
    let current = url;
    let res: Awaited<ReturnType<typeof fetch>> | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!(await isHostSafe(current.hostname))) {
        out.notes.push('Website-Host nicht erlaubt.');
        return finalize(out);
      }
      res = await fetch(current.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (!location) break;
      const next = normalizeUrl(new URL(location, current.toString()).toString());
      if (!next) {
        out.notes.push('Ungültige Weiterleitung.');
        return finalize(out);
      }
      current = next;
      res = null;
    }
    if (!res) {
      out.notes.push('Zu viele Weiterleitungen.');
      return finalize(out);
    }
    out.statusCode = res.status;
    out.finalUrl = current.toString();
    out.https = current.protocol === 'https:';
    out.reachable = res.ok;
    const ctype = res.headers.get('content-type') || '';
    if (!res.ok || !ctype.includes('text/html')) {
      if (!res.ok) out.notes.push(`Website antwortete mit Status ${res.status}.`);
      return finalize(out);
    }
    const buf = await res.arrayBuffer();
    html = Buffer.from(buf.slice(0, MAX_BYTES)).toString('utf8');
  } catch (err) {
    out.notes.push(
      err instanceof Error && err.name === 'AbortError'
        ? 'Website antwortete nicht innerhalb des Zeitlimits.'
        : 'Website konnte nicht geladen werden.',
    );
    return finalize(out);
  } finally {
    clearTimeout(timer);
  }

  const base = out.finalUrl || url.toString();
  const $ = cheerio.load(html);

  out.title = ($('title').first().text() || '').trim() || null;
  out.metaDescription = $('meta[name="description"]').attr('content')?.trim() || null;
  out.ogImage = abs(base, $('meta[property="og:image"]').attr('content'));
  out.themeColor = $('meta[name="theme-color"]').attr('content')?.trim() || null;
  out.hasViewport = $('meta[name="viewport"]').length > 0;
  out.hasFavicon = $('link[rel*="icon"]').length > 0;
  out.h1 = ($('h1').first().text() || '').trim() || null;
  out.headingCount = $('h1,h2,h3').length;
  out.imageCount = $('img').length;
  out.wordCount = ($('body').text() || '').trim().split(/\s+/).filter(Boolean).length;

  // Fonts: Google Fonts links + font-family declarations.
  const fonts = new Set<string>();
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(/family=([^&:]+)/g);
    m?.forEach((part) => {
      const fam = decodeURIComponent(part.replace('family=', '')).replace(/\+/g, ' ').split(':')[0];
      if (fam) fonts.add(fam.trim());
    });
  });
  const styleText = $('style').text() + ' ' + ($('[style]').map((_, el) => $(el).attr('style') || '').get().join(' '));
  const famMatches = styleText.match(/font-family\s*:\s*([^;"}]+)/gi) || [];
  famMatches.slice(0, 20).forEach((decl) => {
    const first = decl.replace(/font-family\s*:/i, '').split(',')[0].replace(/['"]/g, '').trim();
    if (first && !/^(inherit|initial|var\()/i.test(first)) fonts.add(first);
  });
  out.fontFamilies = Array.from(fonts).slice(0, 6);

  // Colors: theme-color + hex colors in inline styles.
  const colors = new Set<string>();
  if (out.themeColor && /^#?[0-9a-f]{3,8}$/i.test(out.themeColor)) colors.add(out.themeColor);
  (styleText.match(/#[0-9a-fA-F]{3,8}\b/g) || []).slice(0, 40).forEach((c) => colors.add(c.toLowerCase()));
  out.detectedColors = Array.from(colors).slice(0, 8);

  // Social links present on the page.
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!out.socialLinks.instagram && /instagram\.com/i.test(href)) out.socialLinks.instagram = href;
    if (!out.socialLinks.facebook && /facebook\.com/i.test(href)) out.socialLinks.facebook = href;
    if (!out.socialLinks.tiktok && /tiktok\.com/i.test(href)) out.socialLinks.tiktok = href;
  });

  return finalize(out);
}

function finalize(out: BrandingSignals): BrandingSignals {
  const { score, notes } = computeScore(out);
  out.brandingScore = score;
  out.notes = [...out.notes, ...notes];
  return out;
}
