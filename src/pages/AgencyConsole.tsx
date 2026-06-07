import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { Avatar } from '../components/Avatar';
import { Wordmark } from '../components/Wordmark';
import { BRAND } from '../../branding/tokens';
import { OVERLAY_STYLE } from '../lib/uiStyles';
import { formatDate } from '../lib/dateFormat';

interface Customer { id: string; name: string; email: string; role: string; created_at: string }
interface Invite { id: string; token: string; expires_at: string | null; created_at: string }
interface Pkg { id: string; name: string; description: string; features: string[]; sort_order: number }

const CARD = 'rounded-2xl border p-6 space-y-4';
const inputStyle = { borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background, color: BRAND.colors.text };

export default function AgencyConsole() {
  const navigate = useNavigate();
  const { user, isAgencyAdmin, isSuperAdmin, loading, logout } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [pwUser, setPwUser] = useState<Customer | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  // Packages (the agency's own product packages)
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [editPkg, setEditPkg] = useState<{ id: string | null; name: string; description: string; featuresText: string } | null>(null);
  const [pkgSaving, setPkgSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || (!isAgencyAdmin && !isSuperAdmin))) navigate('/');
  }, [user, isAgencyAdmin, isSuperAdmin, loading, navigate]);

  const load = useCallback(() => {
    setLoadingData(true);
    Promise.all([
      fetch('/api/agency/customers', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/agency/invites', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/agency/packages', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([c, i, p]) => {
        // Exclude the agency admin themselves from the customer list.
        if (Array.isArray(c)) setCustomers(c.filter((u: Customer) => u.id !== user?.id));
        if (Array.isArray(i)) setInvites(i);
        if (Array.isArray(p)) setPackages(p);
      })
      .catch(() => undefined)
      .finally(() => setLoadingData(false));
  }, [user?.id]);

  useEffect(() => { if (isAgencyAdmin || isSuperAdmin) load(); }, [isAgencyAdmin, isSuperAdmin, load]);

  const inviteUrl = (token: string) => `${window.location.origin}/invite/${token}`;

  const createInvite = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/agency/invites', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const inv = (await res.json()) as Invite;
        await navigator.clipboard?.writeText(inviteUrl(inv.token)).catch(() => undefined);
        setCopied(inv.token);
        load();
      }
    } finally {
      setCreating(false);
    }
  };

  const copy = async (token: string) => {
    await navigator.clipboard?.writeText(inviteUrl(token)).catch(() => undefined);
    setCopied(token);
    setTimeout(() => setCopied(''), 1500);
  };

  const resetPassword = async () => {
    if (!pwUser || pwValue.length < 8) { setPwMsg('Mindestens 8 Zeichen.'); return; }
    setPwSaving(true);
    setPwMsg('');
    try {
      const res = await fetch(`/api/agency/customers/${pwUser.id}/password`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwValue }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || 'Fehlgeschlagen.');
      }
      setPwMsg('Passwort gesetzt.');
      setPwValue('');
      setTimeout(() => { setPwUser(null); setPwMsg(''); }, 1200);
    } catch (e) {
      setPwMsg(e instanceof Error ? e.message : 'Fehler.');
    } finally {
      setPwSaving(false);
    }
  };

  const savePkg = async () => {
    if (!editPkg || !editPkg.name.trim()) return;
    setPkgSaving(true);
    const body = {
      name: editPkg.name.trim(),
      description: editPkg.description.trim(),
      features: editPkg.featuresText.split('\n').map((l) => l.trim()).filter(Boolean),
      sortOrder: editPkg.id ? (packages.find((p) => p.id === editPkg.id)?.sort_order ?? 0) : packages.length,
    };
    const res = await fetch(editPkg.id ? `/api/agency/packages/${editPkg.id}` : '/api/agency/packages', {
      method: editPkg.id ? 'PATCH' : 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    setPkgSaving(false);
    if (res.ok) { setEditPkg(null); load(); }
  };

  const delPkg = async (id: string) => {
    await fetch(`/api/agency/packages/${id}`, { method: 'DELETE', credentials: 'include' });
    load();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}>
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b sticky top-0 z-20" style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background }}>
        <div className="flex items-center gap-2"><Wordmark size="md" /><span className="text-sm" style={{ color: BRAND.colors.muted }}>Agentur</span></div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && <Link to="/admin" className="text-sm px-3 py-1.5 rounded-full border" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}>&#x2190; Admin</Link>}
          <button onClick={logout} className="text-sm px-3 py-1.5 rounded-full border" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}>Abmelden</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Agentur-Konsole</h1>
          <p className="text-base" style={{ color: BRAND.colors.muted }}>
            Laden Sie Kunden per Link ein, verwalten Sie deren Zugänge und Ihre Dashboards.
          </p>
        </div>

        <div className={CARD} style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Kunden einladen</h2>
            <button onClick={createInvite} disabled={creating} className="text-sm px-4 py-2 rounded-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}>
              {creating ? 'Erstelle…' : 'Einladungslink erstellen'}
            </button>
          </div>
          <p className="text-sm" style={{ color: BRAND.colors.muted }}>
            Wer sich über den Link registriert, landet automatisch als Ihr Kunde. Links sind 30 Tage gültig.
          </p>
          {invites.length === 0 ? (
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Noch keine Einladungslinks.</p>
          ) : (
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 text-sm border rounded-lg px-3 py-2" style={{ borderColor: BRAND.colors.border }}>
                  <span className="truncate" style={{ color: BRAND.colors.muted }}>{inviteUrl(inv.token)}</span>
                  <button onClick={() => copy(inv.token)} className="shrink-0 text-xs px-3 py-1 rounded-full border transition-opacity hover:opacity-70" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}>
                    {copied === inv.token ? 'Kopiert!' : 'Kopieren'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={CARD} style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ihre Kunden ({customers.length})</h2>
            <Link to="/agency/dashboards" className="text-sm underline" style={{ color: BRAND.colors.primary }}>Dashboards verwalten</Link>
          </div>
          {loadingData ? (
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden…</p>
          ) : customers.length === 0 ? (
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Noch keine Kunden. Teilen Sie oben einen Einladungslink.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: BRAND.colors.border }}>
              {customers.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={c.name} email={c.email} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs truncate" style={{ color: BRAND.colors.muted }}>{c.email} · {c.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs hidden sm:inline" style={{ color: BRAND.colors.muted }}>{formatDate(c.created_at)}</span>
                    {c.role !== 'super_admin' && (
                      <button onClick={() => { setPwUser(c); setPwValue(''); setPwMsg(''); }} className="text-xs px-2.5 py-1 rounded-lg border transition-opacity hover:opacity-70" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}>
                        Passwort
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={CARD} style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Ihre Pakete</h2>
            <button onClick={() => setEditPkg({ id: null, name: '', description: '', featuresText: '' })} className="text-sm px-4 py-2 rounded-full font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}>
              + Paket
            </button>
          </div>
          <p className="text-sm" style={{ color: BRAND.colors.muted }}>
            Diese Pakete sehen Ihre Kunden im Portal (unter „Pakete"). Keine Preise — Anfragen laufen über Sie.
          </p>
          {packages.length === 0 ? (
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Noch keine Pakete. Legen Sie Ihr erstes an.</p>
          ) : (
            <ul className="space-y-2">
              {packages.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 border rounded-lg px-3 py-2" style={{ borderColor: BRAND.colors.border }}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: BRAND.colors.text }}>{p.name}</p>
                    <p className="text-xs truncate" style={{ color: BRAND.colors.muted }}>
                      {p.description || '—'}{p.features?.length ? ` · ${p.features.length} Merkmal${p.features.length === 1 ? '' : 'e'}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setEditPkg({ id: p.id, name: p.name, description: p.description, featuresText: (p.features ?? []).join('\n') })} className="text-xs px-2.5 py-1 rounded-lg border transition-opacity hover:opacity-70" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}>Bearbeiten</button>
                    <button onClick={() => delPkg(p.id)} className="text-xs px-2.5 py-1 rounded-lg border transition-opacity hover:opacity-70" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.muted }}>Löschen</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {editPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={OVERLAY_STYLE} onClick={() => !pkgSaving && setEditPkg(null)}>
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-4" style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{editPkg.id ? 'Paket bearbeiten' : 'Paket anlegen'}</h3>
            <input type="text" placeholder="Name (z.B. Basic)" value={editPkg.name} onChange={(e) => setEditPkg({ ...editPkg, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2" style={inputStyle} />
            <input type="text" placeholder="Kurzbeschreibung (optional)" value={editPkg.description} onChange={(e) => setEditPkg({ ...editPkg, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2" style={inputStyle} />
            <textarea placeholder="Features — eine pro Zeile" value={editPkg.featuresText} onChange={(e) => setEditPkg({ ...editPkg, featuresText: e.target.value })} rows={5} className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2" style={inputStyle} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditPkg(null)} disabled={pkgSaving} className="text-sm px-4 py-2 rounded-full" style={{ color: BRAND.colors.muted }}>Abbrechen</button>
              <button onClick={savePkg} disabled={pkgSaving || !editPkg.name.trim()} className="text-sm px-4 py-2 rounded-full font-semibold disabled:opacity-40" style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}>{pkgSaving ? 'Speichern…' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {pwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={OVERLAY_STYLE} onClick={() => !pwSaving && setPwUser(null)}>
          <div className="w-full max-w-sm rounded-2xl border p-6 space-y-4" style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Passwort setzen</h3>
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Neues Passwort für <strong>{pwUser.name}</strong> ({pwUser.email}).</p>
            <input type="text" value={pwValue} onChange={(e) => setPwValue(e.target.value)} placeholder="Neues Passwort (min. 8 Zeichen)" autoFocus className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && resetPassword()} />
            {pwMsg && <p className="text-sm" style={{ color: BRAND.colors.accent }}>{pwMsg}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPwUser(null)} disabled={pwSaving} className="text-sm px-4 py-2 rounded-full" style={{ color: BRAND.colors.muted }}>Abbrechen</button>
              <button onClick={resetPassword} disabled={pwSaving || pwValue.length < 8} className="text-sm px-4 py-2 rounded-full font-semibold disabled:opacity-40" style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}>{pwSaving ? 'Speichern…' : 'Passwort setzen'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
