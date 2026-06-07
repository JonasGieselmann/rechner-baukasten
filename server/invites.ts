import { Router, Request } from 'express';
import { requireAuth, type AuthenticatedRequest } from './middleware.js';
import { getInviteByToken, getOrgById, setUserRoleAndOrg } from './db.js';

const router = Router();

function isExpired(expiresAt: unknown): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt as string).getTime();
  return Number.isFinite(t) && t < Date.now();
}

// GET /api/invites/:token - public: validate an invite + show which org it joins.
router.get('/:token', async (req: Request<{ token: string }>, res) => {
  try {
    const invite = await getInviteByToken(req.params.token);
    if (!invite || isExpired(invite.expires_at)) return res.json({ valid: false });
    const org = await getOrgById(invite.org_id as string);
    if (!org) return res.json({ valid: false });
    res.json({ valid: true, orgName: (org.brand_name as string) || (org.name as string) });
  } catch (err) {
    console.error('Invite validate error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

// POST /api/invites/:token/claim - the freshly-registered user joins the invite's org.
router.post('/:token/claim', requireAuth, async (req: AuthenticatedRequest<{ token: string }>, res) => {
  try {
    const invite = await getInviteByToken(req.params.token);
    if (!invite || isExpired(invite.expires_at)) return res.status(400).json({ error: 'Einladung ungültig oder abgelaufen.' });
    // Only an end-customer may be moved via an invite (never demote an admin).
    if (req.user!.role !== 'customer') return res.status(403).json({ error: 'Nur Endkunden können einer Einladung folgen.' });
    // Prevent org-hopping between distinct customer orgs: only a fresh customer
    // (still in the default landing org) or one re-claiming their own org may join.
    const cur = (req.user!.orgId ?? null) as string | null;
    if (cur && cur !== 'default' && cur !== 'beautyflow' && cur !== (invite.org_id as string)) {
      return res.status(403).json({ error: 'Sie gehören bereits zu einer Organisation.' });
    }
    if (!(await getOrgById(invite.org_id as string))) return res.status(400).json({ error: 'Organisation existiert nicht mehr.' });
    await setUserRoleAndOrg(req.user!.id, 'customer', invite.org_id as string);
    res.json({ success: true, orgId: invite.org_id });
  } catch (err) {
    console.error('Invite claim error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
