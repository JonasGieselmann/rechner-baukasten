import type { Funnel, Lead } from '../types';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

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
  return request<Funnel[]>('/api/funnels');
}

export function createFunnel(body: {
  name: string;
  description?: string;
  slug?: string;
  config?: Funnel['config'];
}): Promise<Funnel> {
  return request<Funnel>('/api/funnels', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getFunnel(id: string): Promise<Funnel> {
  return request<Funnel>(`/api/funnels/${id}`);
}

export function updateFunnel(
  id: string,
  body: Partial<Pick<Funnel, 'name' | 'description' | 'slug' | 'status' | 'config'>>,
): Promise<Funnel> {
  return request<Funnel>(`/api/funnels/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteFunnel(id: string): Promise<{ success: true }> {
  return request<{ success: true }>(`/api/funnels/${id}`, { method: 'DELETE' });
}

export function getFunnelLeads(id: string): Promise<Lead[]> {
  return request<Lead[]>(`/api/funnels/${id}/leads`);
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
