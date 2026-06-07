import { useParams } from 'react-router-dom';
import FunnelFrame from '../../components/FunnelFrame';

// Dynamic funnel embed: renders whichever funnel the dashboard links to.
// Route: /dashboard/funnel/:slug
export default function FunnelEmbed() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="w-full">
      <FunnelFrame slug={slug ?? 'potenzialanalyse'} title="Funnel" />
    </div>
  );
}
