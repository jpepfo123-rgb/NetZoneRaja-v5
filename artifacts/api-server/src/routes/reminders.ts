import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

/** GET /api/reminders */
router.get('/', async (req, res) => {
  try {
    const { customerId, status } = req.query as Record<string, string>;
    let sql = `
      SELECT r.*, c.name as customer_name_resolved, c.mobile as customer_mobile_resolved
      FROM reminders r
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (req.user!.role === 'agent') {
      params.push(req.user!.id);
      sql += ` AND r.agent_id = $${params.length}`;
    }
    if (customerId) {
      params.push(customerId);
      sql += ` AND r.customer_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    }

    // Auto-update overdue
    await query(`
      UPDATE reminders SET status='overdue', updated_at=NOW()
      WHERE status='pending' AND date_time < NOW()
    `);

    sql += ' ORDER BY r.date_time ASC';
    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/reminders */
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    if (!b.customer_id || !b.date_time) {
      return res.status(400).json({ error: 'customer_id and date_time required' });
    }
    const { rows: c } = await query('SELECT name, mobile FROM customers WHERE id=$1', [b.customer_id]);
    const { rows } = await query(
      `INSERT INTO reminders (customer_id, customer_name, customer_mobile, agent_id, date_time, notes, reminder_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [b.customer_id, c[0]?.name ?? b.customer_name ?? '',
       c[0]?.mobile ?? b.customer_mobile ?? '',
       req.user!.id, b.date_time, b.notes ?? null,
       b.reminder_type ?? 'Call Back', 'pending']
    );
    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/reminders/:id */
router.patch('/:id', async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await query(
      `UPDATE reminders SET
         status=COALESCE($1, status),
         notes=COALESCE($2, notes),
         date_time=COALESCE($3::timestamptz, date_time),
         updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [b.status ?? null, b.notes ?? null, b.date_time ?? null, req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/reminders/:id/status */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body as { status?: string };
    if (!status) return res.status(400).json({ error: 'status required' });
    const { rows } = await query(
      `UPDATE reminders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** DELETE /api/reminders/:id */
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM reminders WHERE id=$1', [req.params['id']]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
