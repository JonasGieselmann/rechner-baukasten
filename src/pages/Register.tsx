import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../lib/auth-client';

export function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || 'Registrierung fehlgeschlagen');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04070d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#7EC8F3] to-[#5BA8D3] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#0a0a0f]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Konto erstellen</h1>
          <p className="text-[#6b7a90] mt-2">Starte kostenlos mit dem Rechner-Baukasten</p>
        </div>

        {/* Register Form */}
        <div className="bg-[#10131c] rounded-2xl p-8 border border-[#1a1f2e]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-[#b8c7d9] mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded-lg py-3 px-4
                          text-white placeholder:text-[#4a5565]
                          focus:border-[#7EC8F3] focus:ring-1 focus:ring-[#7EC8F3]/30
                          outline-none transition-all"
                placeholder="Dein Name"
              />
            </div>

            <div>
              <label className="block text-sm text-[#b8c7d9] mb-2">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded-lg py-3 px-4
                          text-white placeholder:text-[#4a5565]
                          focus:border-[#7EC8F3] focus:ring-1 focus:ring-[#7EC8F3]/30
                          outline-none transition-all"
                placeholder="deine@email.de"
              />
            </div>

            <div>
              <label className="block text-sm text-[#b8c7d9] mb-2">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded-lg py-3 px-4
                          text-white placeholder:text-[#4a5565]
                          focus:border-[#7EC8F3] focus:ring-1 focus:ring-[#7EC8F3]/30
                          outline-none transition-all"
                placeholder="Mindestens 8 Zeichen"
              />
            </div>

            <div>
              <label className="block text-sm text-[#b8c7d9] mb-2">Passwort bestätigen</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded-lg py-3 px-4
                          text-white placeholder:text-[#4a5565]
                          focus:border-[#7EC8F3] focus:ring-1 focus:ring-[#7EC8F3]/30
                          outline-none transition-all"
                placeholder="Passwort wiederholen"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7EC8F3] text-[#0a0a0f] py-3 px-4 rounded-lg
                        font-semibold hover:bg-[#a6daff] transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Wird erstellt...' : 'Konto erstellen'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#1a1f2e] text-center">
            <p className="text-[#6b7a90] text-sm">
              Bereits ein Konto?{' '}
              <Link to="/login" className="text-[#7EC8F3] hover:text-[#a6daff] transition-colors">
                Anmelden
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
