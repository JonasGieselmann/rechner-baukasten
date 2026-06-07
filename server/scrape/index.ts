import { scrapeWebsite, type BrandingSignals } from './website.js';
import { fetchInstagram, type InstagramSignals } from './instagram.js';

// Lead enrichment for the Potenzialanalyse: website branding scrape + best-effort
// Instagram signals, run in parallel. Stored in lead.scrapeData and surfaced in
// the report, dashboard and admin views.

export interface ScrapeData {
  version: number;
  scrapedAt: string;
  website: BrandingSignals | null;
  instagram: InstagramSignals | null;
  summary: { brandingScore: number | null; followers: number | null; insights: string[] };
}

export interface EnrichInput {
  websiteUrl?: string | null;
  instagramHandle?: string | null;
}

export async function enrichLead(input: EnrichInput): Promise<ScrapeData> {
  const [website, instagram] = await Promise.all([
    input.websiteUrl ? scrapeWebsite(input.websiteUrl).catch(() => null) : Promise.resolve(null),
    input.instagramHandle ? fetchInstagram(input.instagramHandle).catch(() => null) : Promise.resolve(null),
  ]);

  const insights: string[] = [];
  if (website) {
    insights.push(`Website-Branding: ${website.brandingScore}/100.`);
    insights.push(...website.notes.slice(0, 3));
  }
  if (instagram) {
    if (instagram.followers !== null) {
      insights.push(`Instagram: ${instagram.followers.toLocaleString('de-DE')} Follower.`);
    } else if (instagram.notes.length > 0) {
      insights.push(instagram.notes[0]);
    }
  }

  return {
    version: 1,
    scrapedAt: new Date().toISOString(),
    website,
    instagram,
    summary: {
      brandingScore: website ? website.brandingScore : null,
      followers: instagram ? instagram.followers : null,
      insights,
    },
  };
}

// True when at least one source returned usable data.
export function scrapeSucceeded(data: ScrapeData): boolean {
  return Boolean(data.website?.reachable || data.instagram?.reachable);
}
