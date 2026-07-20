import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

/** GET /api/remarks?customerId= */
router.get('/', async (req, res) => {
  try {
    const { customerId } = req.query as { customerId?: string };
    let sql = 'SELECT * FROM remarks WHERE 1=1';
    const params: unknown[] = [];
    if (customerId) {
      params.push(customerId);
      sql += ` AND customer_id = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/remarks */
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    if (!b.customer_id || !b.text) {
      return res.status(400).json({ error: 'customer_id and text required' });
    }
    const { rows } = await query(
      `INSERT INTO remarks (customer_id, agent_id, agent_name, text, is_call_note)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [b.customer_id, req.user!.id, req.user!.name,
       b.text, b.is_call_note ?? false]
    );
    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** DELETE /api/remarks/:id */
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM remarks WHERE id=$1', [req.params['id']]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
