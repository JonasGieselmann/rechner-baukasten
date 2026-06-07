import express from 'express';
import { getAllUsers, approveUser, deleteUser, getUserById, getRawClient, setUserRoleAndOrg, assignDashboardToUser } from './db.js';
import { requireRole, type AuthenticatedRequest } from './middleware.js';

// ============================================
// Security Helpers
// ============================================

// Validate user ID format (matches db.ts validation)
function isValidUserId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id);
}

// Audit logging for admin actions
function logAdminAction(adminId: string, action: string, targetUserId: string, details?: string) {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] ${timestamp} | Admin: ${adminId} | Action: ${action} | Target: ${targetUserId}${details ? ` | ${details}` : ''}`);
}

const router = express.Router();

// Get all users (admin only)
router.get('/users', requireRole('super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const users = await getAllUsers();

    // Audit log for user list access (optional, can be noisy)
    logAdminAction(req.user!.id, 'LIST_USERS', '-', `Retrieved ${users.length} users`);

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// Approve a user (admin only)
router.post('/users/:userId/approve', requireRole('super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!isValidUserId(userId)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Check if user exists
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      // Generic error to prevent user enumeration
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Don't approve already approved users (idempotent)
    if (targetUser.approved) {
      return res.json({ success: true, message: 'User already approved' });
    }

    await approveUser(userId);

    // Audit log
    logAdminAction(req.user!.id, 'APPROVE_USER', userId, `Approved: ${targetUser.email}`);

    res.json({ success: true, message: 'User approved' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// Change a user's role + org assignment (platform admin only)
router.patch('/users/:userId/role', requireRole('super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    if (!isValidUserId(userId)) return res.status(400).json({ error: 'Invalid request' });
    const role = typeof req.body?.role === 'string' ? req.body.role : '';
    if (!['super_admin', 'agency_admin', 'customer', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const target = await getUserById(userId);
    if (!target) return res.status(400).json({ error: 'Invalid request' });
    const orgId =
      typeof req.body?.orgId === 'string' && req.body.orgId ? req.body.orgId : target.org_id ?? 'default';
    await setUserRoleAndOrg(userId, role, orgId);
    logAdminAction(req.user!.id, 'CHANGE_ROLE', userId, `role=${role} org=${orgId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// Assign a dashboard to a user (platform admin only)
router.patch('/users/:userId/dashboard', requireRole('super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    if (!isValidUserId(userId)) return res.status(400).json({ error: 'Invalid request' });
    const dashboardId = typeof req.body?.dashboardId === 'string' && req.body.dashboardId ? req.body.dashboardId : null;
    await assignDashboardToUser(userId, dashboardId);
    res.json({ success: true });
  } catch (error) {
    console.error('Assign dashboard error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// Delete/reject a user (admin only)
router.delete('/users/:userId', requireRole('super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!isValidUserId(userId)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Check if user exists
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      // Generic error to prevent user enumeration
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Prevent deleting other super_admins (safety measure)
    if (targetUser.role === 'super_admin') {
      return res.status(400).json({ error: 'Cannot delete a super admin' });
    }

    await deleteUser(userId);

    // Audit log
    logAdminAction(req.user!.id, 'DELETE_USER', userId, `Deleted: ${targetUser.email}`);

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// ============================================
// Customer overview endpoints (super_admin only)
// ============================================

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  createdAt: string;
  leadsCount: number;
  lastLeadAt: string | null;
}

interface LeadRow {
  id: string;
  funnelId: string;
  funnelSlug: string | null;
  createdAt: string;
  recommendation: string | null;
  scrapeStatus: string;
}

// GET /api/admin/customers
router.get('/customers', requireRole('super_admin'), async (_req: AuthenticatedRequest, res) => {
  try {
    const client = getRawClient();
    const rows = await client`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.approved,
        u.created_at AS "createdAt",
        COUNT(l.id)::int AS "leadsCount",
        MAX(l.created_at) AS "lastLeadAt"
      FROM "user" u
      LEFT JOIN lead l ON l.user_id = u.id
      WHERE u.role IN ('customer', 'user')
      GROUP BY u.id, u.name, u.email, u.role, u.approved, u.created_at
      ORDER BY u.created_at DESC
    `;
    res.json(rows as unknown as CustomerRow[]);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// GET /api/admin/customers/:id
router.get('/customers/:id', requireRole('super_admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (!isValidUserId(id)) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    const client = getRawClient();
    const userRows = await client`
      SELECT id, name, email, role, approved, created_at AS "createdAt"
      FROM "user"
      WHERE id = ${id} AND role IN ('customer', 'user')
    `;
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const leadRows = await client`
      SELECT
        l.id,
        l.funnel_id AS "funnelId",
        f.slug AS "funnelSlug",
        l.created_at AS "createdAt",
        l.recommendation,
        l.scrape_status AS "scrapeStatus"
      FROM lead l
      LEFT JOIN funnel f ON f.id = l.funnel_id
      WHERE l.user_id = ${id}
      ORDER BY l.created_at DESC
    `;
    res.json({ user: userRows[0], leads: leadRows as unknown as LeadRow[] });
  } catch (error) {
    console.error('Get customer detail error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

export default router;
