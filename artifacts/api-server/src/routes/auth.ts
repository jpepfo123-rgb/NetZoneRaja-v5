import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../lib/database';
import { signToken } from '../lib/jwt';
import { requireAuth } from '../middlewares/auth';

const router = Router();

/** POST /api/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body as {
      username?: string; password?: string; role?: string;
    };

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'username and password required' });
    }

    const { rows } = await query(
      'SELECT * FROM users WHERE username = $1 AND active = true',
      [username.trim().toLowerCase()]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ ok: false, error: `Not an ${role} account` });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });

    return res.json({
      ok: true,
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

/** POST /api/auth/logout */
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name, username, role, phone FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, error: 'User not found' });
    return res.json({ ok: true, user: rows[0] });
  } catch {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

/** POST /api/auth/change-password */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string; newPassword: string;
    };
    const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user!.id]);
    if (!rows[0]) return res.status(404).json({ ok: false, error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ ok: false, error: 'Current password is wrong' });

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user!.id]);
    return res.json({ ok: true, message: 'Password changed successfully' });
  } catch {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

export default router;
