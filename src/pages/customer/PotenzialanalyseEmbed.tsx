import { BRAND } from '../../../branding/tokens';

export default function PotenzialanalyseEmbed() {
  return (
    <div className="w-full h-full min-h-[80vh]">
      <iframe
        src="/funnel/potenzialanalyse"
        title="Potenzialanalyse"
        className="w-full h-full min-h-[80vh] border-0"
        style={{ borderRadius: BRAND.radii.card }}
      />
    </div>
  );
}
