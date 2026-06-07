import { useParams } from 'react-router-dom';
import { BRAND } from '../../../branding/tokens';

// Dynamic funnel embed: renders whichever funnel the dashboard links to,
// instead of a single hardcoded slug. Route: /dashboard/funnel/:slug
export default function FunnelEmbed() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="w-full h-full min-h-[80vh]">
      <iframe
        src={`/funnel/${slug ?? 'potenzialanalyse'}`}
        title="Funnel"
        className="w-full h-full min-h-[80vh] border-0"
        style={{ borderRadius: BRAND.radii.card }}
      />
    </div>
  );
}
