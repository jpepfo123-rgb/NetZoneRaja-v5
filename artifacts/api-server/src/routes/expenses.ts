import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth, requireAdmin } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

const CATEGORIES = ['Travel','Food','Communication','Marketing','Utilities','Other'];

/** GET /api/expenses?status=&agentId=&from=&to= */
router.get('/', async (req, res) => {
  try {
    const { status, agentId, from, to } = req.query as Record<string, string>;

    let sql = `
      SELECT e.*, u.name AS agent_name_resolved
      FROM expenses e
      JOIN users u ON e.agent_id = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (req.user!.role === 'agent') {
      params.push(req.user!.id);
      sql += ` AND e.agent_id = $${params.length}`;
    } else if (agentId) {
      params.push(agentId);
      sql += ` AND e.agent_id = $${params.length}`;
    }

    if (status) { params.push(status); sql += ` AND e.status = $${params.length}`; }
    if (from)   { params.push(from);   sql += ` AND e.expense_date >= $${params.length}::date`; }
    if (to)     { params.push(to);     sql += ` AND e.expense_date <= $${params.length}::date`; }

    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC LIMIT 500';
    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/expenses */
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    if (!b.amount || !b.description) {
      return res.status(400).json({ error: 'amount and description are required' });
    }
    const agentId = b.agent_id ?? req.user!.id;
    const { rows: uRows } = await query('SELECT name FROM users WHERE id=$1', [agentId]);
    const agentName = uRows[0]?.name ?? req.user!.name;

    const { rows } = await query(
      `INSERT INTO expenses
         (agent_id, agent_name, amount, category, description, expense_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [agentId, agentName, b.amount,
       b.category ?? 'Other', b.description,
       b.expense_date ?? new Date().toISOString().slice(0, 10),
       b.notes ?? null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/expenses/:id */
router.patch('/:id', async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await query(
      `UPDATE expenses SET
         amount       = COALESCE($1, amount),
         category     = COALESCE($2, category),
         description  = COALESCE($3, description),
         expense_date = COALESCE($4::date, expense_date),
         notes        = COALESCE($5, notes),
         updated_at   = NOW()
       WHERE id = $6 RETURNING *`,
      [b.amount ?? null, b.category ?? null, b.description ?? null,
       b.expense_date ?? null, b.notes ?? null, req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/expenses/:id/status — admin only */
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending','approved','rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const { rows } = await query(
      `UPDATE expenses SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** DELETE /api/expenses/:id */
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM expenses WHERE id=$1', [req.params['id']]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export { CATEGORIES as EXPENSE_CATEGORIES };
export default router;
