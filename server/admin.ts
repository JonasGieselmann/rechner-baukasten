import express from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { getAllUsers, approveUser, deleteUser, getUserById } from './db.js';

// ============================================
// Types
// ============================================

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  created_at: string;
}

interface AdminRequest extends express.Request {
  adminUser?: AdminUser;
}

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

// Middleware to check if user is super_admin
async function requireSuperAdmin(
  req: AdminRequest,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserById(session.user.id);
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Super Admin only.' });
    }

    // Attach user to request for downstream use
    req.adminUser = user as AdminUser;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all users (admin only)
router.get('/users', requireSuperAdmin, async (req: AdminRequest, res) => {
  try {
    const users = await getAllUsers();

    // Audit log for user list access (optional, can be noisy)
    logAdminAction(req.adminUser!.id, 'LIST_USERS', '-', `Retrieved ${users.length} users`);

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// Approve a user (admin only)
router.post('/users/:userId/approve', requireSuperAdmin, async (req: AdminRequest, res) => {
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
    logAdminAction(req.adminUser!.id, 'APPROVE_USER', userId, `Approved: ${targetUser.email}`);

    res.json({ success: true, message: 'User approved' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

// Delete/reject a user (admin only)
router.delete('/users/:userId', requireSuperAdmin, async (req: AdminRequest, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!isValidUserId(userId)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Prevent admin from deleting themselves
    if (userId === req.adminUser?.id) {
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
    logAdminAction(req.adminUser!.id, 'DELETE_USER', userId, `Deleted: ${targetUser.email}`);

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Operation failed' });
  }
});

export default router;
