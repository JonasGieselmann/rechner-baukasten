import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { AdminHeader } from '../components/AdminHeader';
import { BRAND } from '../../branding/tokens';

interface Org {
  id: string;
  name: string;
  slug: string;
  parent_org_id: string | null;
  brand_name: string | null;
  logo_url: string | null;
}
interface UserRow { id: string; name: string; email: string; role: string; org_id: string | null }

interface Branding {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

const CARD = 'rounded-2xl border p-6 space-y-4';
const INPUT = 'w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2';
const inputStyle = { borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background, color: BRAND.colors.text };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 opacity-60">{label}</label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#0F2F5B'} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border" style={{ borderColor: BRAND.colors.border }} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB" className={INPUT} style={inputStyle} />
      </div>
    </Field>
  );
}

function OrgCard({ org, users, isPlatform, onChanged }: {
  org: Org; users: UserRow[]; isPlatform: boolean; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [b, setB] = useState<Branding>({
    brandName: org.brand_name ?? '', logoUrl: org.logo_url ?? '',
    primaryColor: '', accentColor: '', backgroundColor: '', textColor: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [assignUserId, setAssignUserId] = useState('');

  const members = users.filter((u) => u.org_id === org.id);
  const candidates = users.filter((u) => u.role !== 'super_admin');

  const saveBranding = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await fetch(`/api/organizations/${org.id}/branding`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen.');
      setMsg('Branding gespeichert.'); onChanged();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Fehler.'); } finally { setSaving(false); }
  };

  const assignAgencyAdmin = async () => {
    if (!assignUserId) return;
    setMsg('');
    const res = await fetch(`/api/organizations/${org.id}/members`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: assignUserId, role: 'agency_admin' }),
    });
    setMsg(res.ok ? 'Agency-Admin zugewiesen.' : 'Zuweisung fehlgeschlagen.');
    setAssignUserId(''); onChanged();
  };

  return (
    <div className={CARD} data-testid={`org-card-${org.slug}`} style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>{org.name}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: isPlatform ? BRAND.colors.text : `${BRAND.colors.accent}33`, color: isPlatform ? BRAND.colors.background : BRAND.colors.primary }}>
              {isPlatform ? 'Plattform' : 'White-Label-Kunde'}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: BRAND.colors.muted }}>
            /{org.slug}{!isPlatform && org.parent_org_id ? ' · verwaltet von Layer One' : ''} · {members.length} Mitglied{members.length === 1 ? '' : 'er'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Management applies to customer orgs only; the platform org (Layer One) is operator-only.
              Kalku has no org pricing — packages are per-agency (managed in the Agency Console). */}
          {!isPlatform && (
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="text-sm px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70"
              style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
            >
              {open ? 'Schließen' : 'Verwalten'}
            </button>
          )}
        </div>
      </div>

      {msg && <p className="text-sm" style={{ color: BRAND.colors.accent }}>{msg}</p>}

      {open && !isPlatform && (
        <div className="space-y-5 pt-2 border-t" style={{ borderColor: BRAND.colors.border }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <Field label="Markenname"><input className={INPUT} style={inputStyle} value={b.brandName} onChange={(e) => setB({ ...b, brandName: e.target.value })} placeholder="z.B. BeautyFlow" /></Field>
            <Field label="Logo-URL"><input className={INPUT} style={inputStyle} value={b.logoUrl} onChange={(e) => setB({ ...b, logoUrl: e.target.value })} placeholder="https://..." /></Field>
            <ColorField label="Primärfarbe" value={b.primaryColor} onChange={(v) => setB({ ...b, primaryColor: v })} />
            <ColorField label="Akzentfarbe" value={b.accentColor} onChange={(v) => setB({ ...b, accentColor: v })} />
            <ColorField label="Hintergrund" value={b.backgroundColor} onChange={(v) => setB({ ...b, backgroundColor: v })} />
            <ColorField label="Textfarbe" value={b.textColor} onChange={(v) => setB({ ...b, textColor: v })} />
          </div>
          <button onClick={saveBranding} disabled={saving} className="inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}>
            {saving ? 'Speichern...' : 'Branding speichern'}
          </button>

          <div className="space-y-2 pt-2 border-t" style={{ borderColor: BRAND.colors.border }}>
            <p className="text-sm font-semibold pt-3" style={{ color: BRAND.colors.text }}>Agency-Admin zuweisen</p>
            <p className="text-xs" style={{ color: BRAND.colors.muted }}>
              Macht einen bestehenden Nutzer zum Verwalter dieser Organisation (Tier 2). Der Nutzer registriert sich zuvor normal.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg border flex-1 min-w-[220px]" style={inputStyle}>
                <option value="">Nutzer wählen…</option>
                {candidates.map((u) => <option key={u.id} value={u.id}>{u.email} ({u.role})</option>)}
              </select>
              <button onClick={assignAgencyAdmin} disabled={!assignUserId} className="text-sm px-4 py-2 rounded-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}>
                Als Agency-Admin zuweisen
              </button>
            </div>
            {members.length > 0 && (
              <p className="text-xs" style={{ color: BRAND.colors.muted }}>
                Mitglieder: {members.map((m) => `${m.email} (${m.role})`).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrganizations() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) navigate('/');
  }, [user, isSuperAdmin, loading, navigate]);

  // silent=true refreshes data without unmounting the cards (preserves each
  // card's expanded/edit state after a save).
  const load = useCallback((silent = false) => {
    if (!silent) setLoadingData(true);
    Promise.all([
      fetch('/api/organizations', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/users', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([o, u]) => {
        if (Array.isArray(o)) setOrgs(o);
        if (Array.isArray(u)) setUsers(u);
      })
      .catch(() => setError('Laden fehlgeschlagen.'))
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin, load]);

  const createOrg = async () => {
    if (!newName.trim()) return;
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? 'Anlegen fehlgeschlagen.');
      }
      setNewName(''); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Fehler.'); } finally { setCreating(false); }
  };

  const platform = orgs.filter((o) => !o.parent_org_id);
  const customers = orgs.filter((o) => o.parent_org_id);

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}>
      <AdminHeader />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold" style={{ color: BRAND.colors.text }}>Organisationen</h1>
          <p className="text-base" style={{ color: BRAND.colors.muted }}>
            White-Label-Kunden verwalten: Organisation anlegen, Branding setzen und einen Agency-Admin zuweisen.
            Layer One ist die Plattform-Organisation, jeder Kunde ist eine eigene Organisation darunter.
          </p>
        </div>

        <div className={CARD} style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
          <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>Neue White-Label-Organisation</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <Field label="Name">
                <input className={INPUT} style={inputStyle} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z.B. Praxis Müller Marketing" onKeyDown={(e) => e.key === 'Enter' && createOrg()} />
              </Field>
            </div>
            <button onClick={createOrg} disabled={creating || !newName.trim()} className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}>
              {creating ? 'Anlegen...' : 'Organisation anlegen'}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {loadingData ? (
          <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden...</p>
        ) : (
          <div className="space-y-4">
            {platform.map((o) => <OrgCard key={o.id} org={o} users={users} isPlatform onChanged={() => load(true)} />)}
            {customers.length === 0 && (
              <p className="text-sm" style={{ color: BRAND.colors.muted }}>Noch keine White-Label-Kunden. Legen Sie oben den ersten an.</p>
            )}
            {customers.map((o) => <OrgCard key={o.id} org={o} users={users} isPlatform={false} onChanged={() => load(true)} />)}
          </div>
        )}
      </main>
    </div>
  );
}
