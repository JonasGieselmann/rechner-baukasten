import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { Avatar } from '../components/Avatar';
import { AgencyHeader } from '../components/AgencyLayout';
import { BRAND } from '../../branding/tokens';
import { OVERLAY_STYLE } from '../lib/uiStyles';
import { formatDate } from '../lib/dateFormat';

interface Member { id: string; name: string; email: string; role: string; created_at: string }
interface Invite { id: string; token: string; role?: string; expires_at: string | null; created_at: string }
interface Pkg { id: string; name: string; description: string; features: string[]; sort_order: number }

const CARD = 'rounded-2xl border p-6 space-y-4';
const inputStyle = { borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background, color: BRAND.colors.text };

export default function AgencyConsole() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // super_admin can operate a specific org via ?orgId=… (drill-in from the
  // platform overview). agency_admin always operates on their own org, so the
  // param is ignored server-side for them.
  const orgId = params.get('orgId') || '';
  const q = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const withQ = (p: string) => `${p}${q}`;

  const { user, isAgencyAdmin, isSuperAdmin, loading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviteRole, setInviteRole] = useState<'customer' | 'agency_admin'>('customer');
  const [copied, setCopied] = useState('');
  // Reset modal (link primary + direct-set secondary)
  const [pwUser, setPwUser] = useState<Member | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  // Packages
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [editPkg, setEditPkg] = useState<{ id: string | null; name: string; description: string; featuresText: string } | null>(null);
  const [pkgSaving, setPkgSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || (!isAgencyAdmin && !isSuperAdmin))) navigate('/');
  }, [user, isAgencyAdmin, isSuperAdmin, loading, navigate]);

  const load = useCallback(() => {
    setLoadingData(true);
    Promise.all([
      fetch(withQ('/api/agency/customers'), { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(withQ('/api/agency/invites'), { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(withQ('/api/agency/packages'), { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([m, i, p]) => {
        if (Array.isArray(m)) setMembers(m.filter((u: Member) => u.id !== user?.id));
        if (Array.isArray(i)) setInvites(i);
        if (Array.isArray(p)) setPackages(p);
      })
      .catch(() => undefined)
      .finally(() => setLoadingData(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, q]);

  useEffect(() => { if (isAgencyAdmin || isSuperAdmin) load(); }, [isAgencyAdmin, isSuperAdmin, load]);

  const team = members.filter((m) => m.role === 'agency_admin' || m.role === 'super_admin');
  const clients = members.filter((m) => m.role === 'customer');

  const inviteUrl = (token: string) => `${window.location.origin}/invite/${token}`;

  const createInvite = async () => {
    setCreating(true);
    try {
      const res = await fetch(withQ('/api/agency/invites'), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: inviteRole }),
      });
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

  const openPwModal = (m: Member) => {
    setPwUser(m); setPwValue(''); setPwMsg(''); setResetLink(''); setLinkCopied(false);
  };
  const closePwModal = () => {
    setPwUser(null); setPwValue(''); setPwMsg(''); setResetLink(''); setLinkCopied(false);
  };

  const genResetLink = async () => {
    if (!pwUser) return;
    setLinkLoading(true); setPwMsg(''); setResetLink(''); setLinkCopied(false);
    try {
      const res = await fetch(withQ(`/api/agency/customers/${pwUser.id}/reset-link`), { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || 'Link erzeugen fehlgeschlagen.');
      }
      const { token } = (await res.json()) as { token: string };
      setResetLink(`${window.location.origin}/passwort-zuruecksetzen/${token}`);
    } catch (e) {
      setPwMsg(e instanceof Error ? e.message : 'Fehler.');
    } finally {
      setLinkLoading(false);
    }
  };

  const copyResetLink = async () => {
    try { await navigator.clipboard.writeText(resetLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500); } catch { /* manual select */ }
  };

  const setPasswordDirect = async () => {
    if (!pwUser || pwValue.length < 8) { setPwMsg('Mindestens 8 Zeichen.'); return; }
    setPwSaving(true); setPwMsg('');
    try {
      const res = await fetch(withQ(`/api/agency/customers/${pwUser.id}/password`), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwValue }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || 'Fehlgeschlagen.');
      }
      setPwMsg('Passwort gesetzt.');
      setPwValue('');
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
    const res = await fetch(withQ(editPkg.id ? `/api/agency/packages/${editPkg.id}` : '/api/agency/packages'), {
      method: editPkg.id ? 'PATCH' : 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    setPkgSaving(false);
    if (res.ok) { setEditPkg(null); load(); }
  };

  const delPkg = async (id: string) => {
    await fetch(withQ(`/api/agency/packages/${id}`), { method: 'DELETE', credentials: 'include' });
    load();
  };

  // Can the current operator reset THIS member? agency_admin: customers only.
  // super_admin: anyone except a super_admin.
  const canReset = (m: Member) => m.role !== 'super_admin' && (isSuperAdmin || m.role === 'customer');

  const MemberRow = ({ m }: { m: Member }) => (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={m.name} email={m.email} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{m.name}</p>
          <p className="text-xs truncate" style={{ color: BRAND.colors.muted }}>{m.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs hidden sm:inline" style={{ color: BRAND.colors.muted }}>{formatDate(m.created_at)}</span>
        {canReset(m) && (
          <button onClick={() => openPwModal(m)} data-testid={`reset-${m.id}`} className="text-xs px-2.5 py-1 rounded-lg border transition-opacity hover:opacity-70" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}>
            Passwort
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}>
      <AgencyHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Agentur-Konsole</h1>
          <p className="text-base" style={{ color: BRAND.colors.muted }}>
            {isSuperAdmin && orgId ? 'Sie verwalten diese Organisation als Plattform-Admin. ' : ''}
            Laden Sie Team-Mitglieder und Kunden per Link ein und verwalten Sie deren Zugänge, Dashboards und Pakete.
          </p>
        </div>

        {/* Invite */}
        <div className={CARD} style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Einladen</h2>
            <div className="flex items-center gap-2">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'customer' | 'agency_admin')}
                data-testid="invite-role"
                className="text-sm rounded-full border px-3 py-2"
                style={inputStyle}
              >
                <option value="customer">Als Kunde</option>
                <option value="agency_admin">Als Team-Mitglied</option>
              </select>
              <button onClick={createInvite} disabled={creating} className="text-sm px-4 py-2 rounded-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}>
                {creating ? 'Erstelle…' : 'Link erstellen'}
              </button>
            </div>
          </div>
          <p className="text-sm" style={{ color: BRAND.colors.muted }}>
            Ein neues Konto über den Link wird automatisch {inviteRole === 'agency_admin' ? 'Team-Mitglied (Agentur-Admin)' : 'Ihr Kunde'}. Links sind 30 Tage gültig.
          </p>
          {invites.length === 0 ? (
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Noch keine Einladungslinks.</p>
          ) : (
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 text-sm border rounded-lg px-3 py-2" style={{ borderColor: BRAND.colors.border }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${BRAND.colors.accent}26`, color: BRAND.colors.primary }}>
                      {inv.role === 'agency_admin' ? 'Team' : 'Kunde'}
                    </span>
                    <span className="truncate" style={{ color: BRAND.colors.muted }}>{inviteUrl(inv.token)}</span>
                  </div>
                  <button onClick={() => copy(inv.token)} className="shrink-0 text-xs px-3 py-1 rounded-full border transition-opacity hover:opacity-70" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}>
                    {copied === inv.token ? 'Kopiert!' : 'Kopieren'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Team */}
        <div className={CARD} style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
          <h2 className="text-lg font-semibold">Ihr Team ({team.length})</h2>
          <p className="text-sm" style={{ color: BRAND.colors.muted }}>Agentur-Administratoren, die gemeinsam mit Ihnen diese Organisation verwalten.</p>
          {loadingData ? (
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden…</p>
          ) : team.length === 0 ? (
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Nur Sie. Laden Sie oben „Als Team-Mitglied" ein.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: BRAND.colors.border }}>{team.map((m) => <MemberRow key={m.id} m={m} />)}</ul>
          )}
        </div>

        {/* Customers */}
        <div className={CARD} style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ihre Kunden ({clients.length})</h2>
            <Link to={withQ('/agency/dashboards')} className="text-sm underline" style={{ color: BRAND.colors.primary }}>Dashboards verwalten</Link>
          </div>
          {loadingData ? (
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden…</p>
          ) : clients.length === 0 ? (
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Noch keine Kunden. Teilen Sie oben einen Kunden-Einladungslink.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: BRAND.colors.border }}>{clients.map((m) => <MemberRow key={m.id} m={m} />)}</ul>
          )}
        </div>

        {/* Packages */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={OVERLAY_STYLE} onClick={() => !pwSaving && !linkLoading && closePwModal()}>
          <div className="w-full max-w-sm rounded-2xl border p-6 space-y-4" style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Passwort zurücksetzen</h3>
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>Für <strong>{pwUser.name}</strong> ({pwUser.email}).</p>

            {!resetLink ? (
              <button onClick={genResetLink} disabled={linkLoading} data-testid={`gen-reset-link-${pwUser.id}`} className="w-full text-sm px-4 py-2.5 rounded-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}>
                {linkLoading ? 'Erzeuge…' : 'Reset-Link erzeugen'}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: BRAND.colors.muted }}>Link an die Person senden. Sie vergibt damit selbst ein neues Passwort (7 Tage gültig).</p>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2" style={{ borderColor: BRAND.colors.border }}>
                  <span className="truncate text-xs flex-1" style={{ color: BRAND.colors.text }} data-testid="reset-link-value">{resetLink}</span>
                  <button onClick={copyResetLink} className="shrink-0 text-xs px-3 py-1 rounded-full border transition-opacity hover:opacity-70" style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}>{linkCopied ? 'Kopiert!' : 'Kopieren'}</button>
                </div>
              </div>
            )}

            <details>
              <summary className="text-xs cursor-pointer select-none" style={{ color: BRAND.colors.muted }}>Stattdessen direkt ein Passwort setzen</summary>
              <div className="mt-3 space-y-2">
                <input type="text" value={pwValue} onChange={(e) => setPwValue(e.target.value)} placeholder="Neues Passwort (min. 8 Zeichen)" className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && setPasswordDirect()} />
                <button onClick={setPasswordDirect} disabled={pwSaving || pwValue.length < 8} className="text-sm px-4 py-2 rounded-full font-semibold disabled:opacity-40" style={{ backgroundColor: BRAND.colors.card, color: BRAND.colors.text, border: `1px solid ${BRAND.colors.border}` }}>{pwSaving ? 'Speichern…' : 'Passwort direkt setzen'}</button>
              </div>
            </details>

            {pwMsg && <p className="text-sm" style={{ color: BRAND.colors.accent }}>{pwMsg}</p>}
            <div className="flex justify-end">
              <button onClick={closePwModal} disabled={pwSaving || linkLoading} className="text-sm px-4 py-2 rounded-full" style={{ color: BRAND.colors.muted }}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
