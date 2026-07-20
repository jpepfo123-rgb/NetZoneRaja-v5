import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../lib/database';
import { requireAuth, requireAdmin } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

/** GET /api/agents (admin only) */
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.name, u.username, u.role, u.phone, u.active, u.created_at,
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(cl.id) FILTER (WHERE cl.created_at >= NOW()::date) as calls_today
      FROM users u
      LEFT JOIN customers c ON c.agent_id = u.id
      LEFT JOIN calls cl ON cl.agent_id = u.id
      GROUP BY u.id ORDER BY u.name
    `);
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/agents (admin only) */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, username, password, role = 'agent', phone } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'name, username, password required' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, username, password_hash, role, phone)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, username, role, phone, active`,
      [name, username.toLowerCase(), hash, role, phone ?? null]
    );
    return res.status(201).json(rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/agents/:id */
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, phone, active, password } = req.body;
    const params: unknown[] = [];
    const sets: string[] = [];

    if (name)   { params.push(name);   sets.push(`name=$${params.length}`); }
    if (phone !== undefined) { params.push(phone);  sets.push(`phone=$${params.length}`); }
    if (active !== undefined) { params.push(active); sets.push(`active=$${params.length}`); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      params.push(hash);
      sets.push(`password_hash=$${params.length}`);
    }

    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params['id']);
    const { rows } = await query(
      `UPDATE users SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${params.length}
       RETURNING id, name, username, role, phone, active`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** DELETE /api/agents/:id */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // Soft delete (deactivate)
    const { rows } = await query(
      `UPDATE users SET active=false, updated_at=NOW() WHERE id=$1 RETURNING id`,
      [req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
