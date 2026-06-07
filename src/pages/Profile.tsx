import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { Wordmark } from '../components/Wordmark';
import { BRAND } from '../../branding/tokens';
import {
  ProfileCard,
  PraxisCard,
  PasswordCard,
  RechtlichesCard,
  DeleteAccountCard,
} from '../components/profile/ProfileCards';

// Standalone, role-aware profile + settings. Reachable by every role (the admin
// avatars link here) so admins no longer get dumped into the customer dashboard.
export default function Profile() {
  const { isSuperAdmin, isAgencyAdmin, isCustomer } = useAuth();
  const backTo = isSuperAdmin ? '/admin' : isAgencyAdmin ? '/agency' : '/dashboard';
  // Practice-specific fields and the DSGVO self-service only make sense for end customers.
  const showCustomerCards = isCustomer;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}>
      <header
        className="flex items-center justify-between px-4 sm:px-6 py-3 border-b sticky top-0 z-30"
        style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background }}
      >
        <Link to={backTo} className="flex items-center gap-2 hover:opacity-80">
          <Wordmark size="md" />
        </Link>
        <Link
          to={backTo}
          className="text-sm px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70"
          style={{ borderColor: BRAND.colors.border, color: BRAND.colors.text }}
        >
          &larr; Zur&uuml;ck
        </Link>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold" style={{ color: BRAND.colors.text }}>
              Profil &amp; Einstellungen
            </h1>
            <p className="text-sm" style={{ color: BRAND.colors.muted }}>
              Verwalten Sie hier Ihre Konto-Angaben und Ihr Passwort.
            </p>
          </div>
          <ProfileCard />
          {showCustomerCards && <PraxisCard />}
          <PasswordCard />
          {showCustomerCards && <RechtlichesCard />}
          {showCustomerCards && <DeleteAccountCard />}
        </div>
      </main>
    </div>
  );
}
