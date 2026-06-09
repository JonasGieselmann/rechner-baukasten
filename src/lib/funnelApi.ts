import type { Funnel, Lead } from '../types';

const API_BASE = '';

// Forward the agency drill-in org (?orgId in the URL) to authenticated management
// calls. agency_admin has no ?orgId (backend uses their own org); super_admin
// operating a specific org carries it so funnels stay scoped to that org. Public
// by-slug/submit calls deliberately do NOT use this.
function withOrg(path: string): string {
  if (typeof window === 'undefined') return path;
  const orgId = new URLSearchParams(window.location.search).get('orgId');
  if (!orgId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}orgId=${encodeURIComponent(orgId)}`;
}

export interface LeadSubmission {
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  websiteUrl?: string;
  instagramHandle?: string;
  gmbUrl?: string;
  answers: Record<string, string[]>;
  scores: Record<string, number>;
  recommendation?: string;
  kalkuPotential?: Record<string, number>;
  utm?: Record<string, string>;
  source?: string;
  consent?: { privacy: boolean; marketing: boolean };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function listFunnels(): Promise<Funnel[]> {
  return request<Funnel[]>(withOrg('/api/funnels'));
}

export function createFunnel(body: {
  name: string;
  description?: string;
  slug?: string;
  config?: Funnel['config'];
}): Promise<Funnel> {
  return request<Funnel>(withOrg('/api/funnels'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getFunnel(id: string): Promise<Funnel> {
  return request<Funnel>(withOrg(`/api/funnels/${id}`));
}

export function updateFunnel(
  id: string,
  body: Partial<Pick<Funnel, 'name' | 'description' | 'slug' | 'status' | 'config'>>,
): Promise<Funnel> {
  return request<Funnel>(withOrg(`/api/funnels/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteFunnel(id: string): Promise<{ success: true }> {
  return request<{ success: true }>(withOrg(`/api/funnels/${id}`), { method: 'DELETE' });
}

export function getFunnelLeads(id: string): Promise<Lead[]> {
  return request<Lead[]>(withOrg(`/api/funnels/${id}/leads`));
}

export function getFunnelBySlug(slug: string): Promise<Funnel> {
  return request<Funnel>(`/api/funnels/by-slug/${slug}`);
}

export function submitFunnelLead(
  slug: string,
  body: LeadSubmission,
): Promise<{ leadId: string }> {
  return request<{ leadId: string }>(`/api/funnels/by-slug/${slug}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
