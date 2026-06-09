import { useSearchParams } from 'react-router-dom';

// Shared ?orgId plumbing for the agency UI. agency_admin operates on their own
// org (orgId empty → backend uses their org). super_admin drills into a specific
// org via ?orgId, which must survive every navigation + API call.
export function useOrgQuery() {
  const [params] = useSearchParams();
  const orgId = params.get('orgId') || '';
  const q = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  // Append orgId to a path or API url, respecting an existing query string.
  const withQ = (path: string) => {
    if (!orgId) return path;
    return path.includes('?') ? `${path}&orgId=${encodeURIComponent(orgId)}` : `${path}${q}`;
  };
  return { orgId, q, withQ };
}
