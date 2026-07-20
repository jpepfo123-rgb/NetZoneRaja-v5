import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

/** GET /api/attendance?date=YYYY-MM-DD&agentId=&from=&to= */
router.get('/', async (req, res) => {
  try {
    const { date, agentId, from, to } = req.query as Record<string, string>;

    let sql = `
      SELECT a.*, u.name AS agent_name_resolved
      FROM attendance a
      JOIN users u ON a.agent_id = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (req.user!.role === 'agent') {
      params.push(req.user!.id);
      sql += ` AND a.agent_id = $${params.length}`;
    } else if (agentId) {
      params.push(agentId);
      sql += ` AND a.agent_id = $${params.length}`;
    }

    if (date) { params.push(date); sql += ` AND a.date = $${params.length}::date`; }
    if (from) { params.push(from); sql += ` AND a.date >= $${params.length}::date`; }
    if (to)   { params.push(to);   sql += ` AND a.date <= $${params.length}::date`; }

    sql += ' ORDER BY a.date DESC, a.check_in DESC LIMIT 500';
    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/attendance/today */
router.get('/today', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT a.*, u.name AS agent_name_resolved
       FROM attendance a
       JOIN users u ON a.agent_id = u.id
       WHERE a.date = CURRENT_DATE
       ORDER BY a.check_in`,
      []
    );
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/attendance/checkin */
router.post('/checkin', async (req, res) => {
  try {
    const agentId = req.user!.id;
    const { rows: uRows } = await query('SELECT name FROM users WHERE id=$1', [agentId]);
    const agentName = uRows[0]?.name ?? '';

    const { rows } = await query(
      `INSERT INTO attendance (agent_id, agent_name, check_in, date)
       VALUES ($1, $2, NOW(), CURRENT_DATE)
       ON CONFLICT (agent_id, date) DO UPDATE SET
         check_in = COALESCE(attendance.check_in, EXCLUDED.check_in),
         updated_at = NOW()
       RETURNING *`,
      [agentId, agentName]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/attendance/checkout */
router.patch('/checkout', async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE attendance
       SET check_out = NOW(), updated_at = NOW()
       WHERE agent_id = $1 AND date = CURRENT_DATE
       RETURNING *`,
      [req.user!.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No check-in found for today' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/attendance/:id — update notes/status (admin) */
router.patch('/:id', async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await query(
      `UPDATE attendance SET
         status     = COALESCE($1, status),
         notes      = COALESCE($2, notes),
         check_in   = COALESCE($3::timestamptz, check_in),
         check_out  = COALESCE($4::timestamptz, check_out),
         updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [b.status ?? null, b.notes ?? null,
       b.check_in ?? null, b.check_out ?? null,
       req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
