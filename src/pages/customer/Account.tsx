import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';
import { Avatar } from '../../components/Avatar';
import { BRAND } from '../../../branding/tokens';

const INPUT_CLS =
  'w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2';

const INPUT_STYLE = {
  borderColor: BRAND.colors.border,
  backgroundColor: BRAND.colors.background,
  color: BRAND.colors.text,
};

function ProfileCard() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');


  const createdAt = (user as (typeof user & { createdAt?: string }) | null)?.createdAt;
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })
    : null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen.');
      await refreshUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-2xl border p-6 space-y-4"
      style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
    >
      <div className="flex items-center gap-4">
        <Avatar name={user?.name} email={user?.email} size="lg" />
        <div>
          <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
            Profil
          </h2>
          {memberSince && (
            <p className="text-xs" style={{ color: BRAND.colors.muted }}>
              Mitglied seit {memberSince}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 opacity-60">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLS}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-60">E-Mail</label>
          <input
            type="email"
            value={user?.email ?? ''}
            readOnly
            className={INPUT_CLS + ' opacity-50 cursor-not-allowed'}
            style={INPUT_STYLE}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
      >
        {saving ? 'Speichern...' : 'Speichern'}
      </button>
    </div>
  );
}

function PraxisCard() {
  const { user, refreshUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl ?? '');
  const [instagramHandle, setInstagramHandle] = useState(user?.instagramHandle ?? '');
  const [gmbUrl, setGmbUrl] = useState(user?.gmbUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, businessName, websiteUrl, instagramHandle, gmbUrl }),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen.');
      await refreshUser();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-2xl border p-6 space-y-4"
      style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
    >
      <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
        Praxis-Angaben
      </h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 opacity-60">Telefon</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={INPUT_CLS}
            style={INPUT_STYLE}
            placeholder="+49 123 456789"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-60">Praxisname</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={INPUT_CLS}
            style={INPUT_STYLE}
            placeholder="Ihr Praxisname"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-60">Website-URL</label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className={INPUT_CLS}
            style={INPUT_STYLE}
            placeholder="https://ihre-praxis.de"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-60">Instagram-Handle</label>
          <input
            type="text"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            className={INPUT_CLS}
            style={INPUT_STYLE}
            placeholder="@ihre_praxis"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-60">Google My Business oder Praxis + Stadt</label>
          <input
            type="text"
            value={gmbUrl}
            onChange={(e) => setGmbUrl(e.target.value)}
            className={INPUT_CLS}
            style={INPUT_STYLE}
            placeholder="z.B. Ihre Praxis Berlin Mitte"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && (
        <p className="text-sm" style={{ color: BRAND.colors.accent }}>
          Praxis-Angaben gespeichert.
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
      >
        {saving ? 'Speichern...' : 'Speichern'}
      </button>
    </div>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);
    if (next !== confirm) {
      setError('Neues Passwort und Bestätigung stimmen nicht überein.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? 'Passwort konnte nicht geändert werden.');
      }
      setSuccess(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-2xl border p-6 space-y-4"
      style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
    >
      <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
        Passwort
      </h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1 opacity-60">Aktuelles Passwort</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={INPUT_CLS}
            style={INPUT_STYLE}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-60">Neues Passwort</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={INPUT_CLS}
            style={INPUT_STYLE}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 opacity-60">Neues Passwort bestätigen</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={INPUT_CLS}
            style={INPUT_STYLE}
            autoComplete="new-password"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && (
        <p className="text-sm" style={{ color: BRAND.colors.accent }}>
          Passwort erfolgreich geändert.
        </p>
      )}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
      >
        {saving ? 'Speichern...' : 'Passwort ändern'}
      </button>
    </div>
  );
}

function DeleteAccountCard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/me', { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Löschung fehlgeschlagen.');
      }
      await logout();
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
      setDeleting(false);
    }
  };

  return (
    <div
      className="rounded-2xl border p-6 space-y-3"
      style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
    >
      <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
        Konto
      </h2>
      <p className="text-sm" style={{ color: BRAND.colors.muted }}>
        Löschen Sie Ihr Konto endgültig. Ihre Analysen und personenbezogenen Daten werden dabei
        unwiderruflich entfernt (Recht auf Löschung, Art. 17 DSGVO).
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!confirming ? (
        <button
          className="text-sm transition-opacity hover:opacity-70 underline underline-offset-2"
          style={{ color: BRAND.colors.muted }}
          onClick={() => setConfirming(true)}
        >
          Konto löschen
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium" style={{ color: BRAND.colors.text }}>
            Wirklich endgültig löschen?
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: '#C0392B', color: '#FFFFFF' }}
          >
            {deleting ? 'Wird gelöscht...' : 'Ja, Konto löschen'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: BRAND.colors.muted }}
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  );
}

function RechtlichesCard() {
  return (
    <div
      className="rounded-2xl border p-6 space-y-3"
      style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
    >
      <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
        Rechtliches &amp; Datenschutz
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.muted }}>
        Einwilligungen, Datenexport (Art. 20 DSGVO) und Kontolöschung verwalten Sie im
        Self-Service-Bereich. Impressum, Datenschutz und AGB finden Sie jederzeit in der Fußzeile.
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          to="/dashboard/rechtliches"
          className="inline-flex items-center px-4 py-2 rounded-full font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
        >
          Self-Service öffnen
        </Link>
      </div>
    </div>
  );
}

export default function Account() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProfileCard />
      <PraxisCard />
      <PasswordCard />
      <RechtlichesCard />
      <DeleteAccountCard />
    </div>
  );
}
