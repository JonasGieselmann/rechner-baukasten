import { useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
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
      <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
        Profil
      </h2>
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
        className="inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold transition-colors hover:bg-neutral-800 disabled:opacity-40"
        style={{ backgroundColor: BRAND.colors.primary, color: '#ffffff' }}
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
        className="inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold transition-colors hover:bg-neutral-800 disabled:opacity-40"
        style={{ backgroundColor: BRAND.colors.primary, color: '#ffffff' }}
      >
        {saving ? 'Speichern...' : 'Passwort ändern'}
      </button>
    </div>
  );
}

export default function Account() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProfileCard />
      <PasswordCard />
    </div>
  );
}
