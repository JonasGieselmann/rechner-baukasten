import { Router, Request } from 'express';
import { requireAuth, type AuthenticatedRequest } from './middleware.js';
import { getInviteByToken, getOrgById, setUserRoleAndOrg, markInviteUsed } from './db.js';

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
    // A single-use team invite that has already been consumed is no longer valid.
    if ((invite.role as string) === 'agency_admin' && invite.used_at) return res.json({ valid: false });
    const org = await getOrgById(invite.org_id as string);
    if (!org) return res.json({ valid: false });
    res.json({
      valid: true,
      orgName: (org.brand_name as string) || (org.name as string),
      role: (invite.role as string) || 'customer',
    });
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
    // Only a fresh end-customer may follow an invite (we never demote an existing
    // admin, and never let an admin re-home themselves through a tenant link).
    if (req.user!.role !== 'customer') return res.status(403).json({ error: 'Dieser Einladung kann nur ein neues Konto folgen.' });
    // Prevent org-hopping between distinct customer orgs: only a fresh customer
    // (still in the default landing org) or one re-claiming their own org may join.
    const cur = (req.user!.orgId ?? null) as string | null;
    if (cur && cur !== 'default' && cur !== 'beautyflow' && cur !== (invite.org_id as string)) {
      return res.status(403).json({ error: 'Sie gehören bereits zu einer Organisation.' });
    }
    if (!(await getOrgById(invite.org_id as string))) return res.status(400).json({ error: 'Organisation existiert nicht mehr.' });
    // Grant the invite's role (customer or agency_admin team member) within the
    // invite's org only. super_admin can never be reached here — createInvite caps
    // the stored role to customer|agency_admin.
    const grantedRole = (invite.role as string) === 'agency_admin' ? 'agency_admin' : 'customer';
    // Team invites are SINGLE-USE: atomically consume before granting admin so a
    // leaked link cannot mint multiple admins. Customer invites stay multi-use.
    if (grantedRole === 'agency_admin') {
      const consumed = await markInviteUsed(invite.id as string);
      if (!consumed) return res.status(400).json({ error: 'Einladung bereits verwendet.' });
    }
    await setUserRoleAndOrg(req.user!.id, grantedRole, invite.org_id as string);
    res.json({ success: true, orgId: invite.org_id, role: grantedRole });
  } catch (err) {
    console.error('Invite claim error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
