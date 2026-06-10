import type { CalculatorConfig } from '../types';

// Server-backed persistence for the no-code builder calculators (replaces the old
// localStorage). Org-scoped management calls forward ?orgId from the URL; the
// public read (for /embed/:id) needs no org.
const API = '';

function withOrg(path: string): string {
  if (typeof window === 'undefined') return path;
  const orgId = new URLSearchParams(window.location.search).get('orgId');
  if (!orgId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}orgId=${encodeURIComponent(orgId)}`;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error || `HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

interface BuilderRow {
  id: string;
  name: string;
  config: Partial<Omit<CalculatorConfig, 'id' | 'name' | 'createdAt' | 'updatedAt'>>;
  created_at?: string;
  updated_at?: string;
}

function rowToConfig(row: BuilderRow): CalculatorConfig {
  const c = row.config || {};
  return {
    id: row.id,
    name: row.name,
    description: c.description ?? '',
    blocks: c.blocks ?? [],
    variables: c.variables ?? {},
    theme: c.theme,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  } as CalculatorConfig;
}

// Strip the column fields; everything else goes into the `config` jsonb.
function toPayload(calc: CalculatorConfig) {
  return {
    name: calc.name,
    config: { description: calc.description, blocks: calc.blocks, variables: calc.variables, theme: calc.theme },
  };
}

export async function listBuilderCalcs(): Promise<CalculatorConfig[]> {
  const rows = await req<BuilderRow[]>(withOrg('/api/builder-calculators'));
  return rows.map(rowToConfig);
}

export async function createBuilderCalc(calc: CalculatorConfig): Promise<CalculatorConfig> {
  const row = await req<BuilderRow>(withOrg('/api/builder-calculators'), { method: 'POST', body: JSON.stringify(toPayload(calc)) });
  return rowToConfig(row);
}

export async function updateBuilderCalc(calc: CalculatorConfig): Promise<void> {
  await req(withOrg(`/api/builder-calculators/${calc.id}`), { method: 'PATCH', body: JSON.stringify(toPayload(calc)) });
}

export async function deleteBuilderCalc(id: string): Promise<void> {
  await req(withOrg(`/api/builder-calculators/${id}`), { method: 'DELETE' });
}

// PUBLIC read (no auth, no org) for the editor load + /embed/:id.
export async function getBuilderCalc(id: string): Promise<CalculatorConfig | null> {
  try {
    return rowToConfig(await req<BuilderRow>(`/api/builder-calculators/public/${id}`));
  } catch {
    return null;
  }
}
