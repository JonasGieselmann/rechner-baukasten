import {
  ProfileCard,
  PraxisCard,
  PasswordCard,
  RechtlichesCard,
  DeleteAccountCard,
} from '../../components/profile/ProfileCards';

// Customer account view (rendered inside the customer DashboardLayout).
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
