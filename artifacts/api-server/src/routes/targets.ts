import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth, requireAdmin } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

/** GET /api/targets?period=YYYY-MM&agentId= */
router.get('/', async (req, res) => {
  try {
    const { period, agentId } = req.query as Record<string, string>;
    const effectivePeriod = period ?? new Date().toISOString().slice(0, 7);

    let sql = `
      SELECT t.*, u.name AS agent_name,
        (SELECT COUNT(*) FROM calls cl
         WHERE cl.agent_id = t.agent_id
           AND TO_CHAR(cl.created_at,'YYYY-MM') = t.period) AS achieved_calls,
        (SELECT COUNT(DISTINCT cl.customer_id) FROM calls cl
         WHERE cl.agent_id = t.agent_id
           AND cl.customer_id IS NOT NULL
           AND cl.type != 'Missed'
           AND TO_CHAR(cl.created_at,'YYYY-MM') = t.period) AS achieved_convs
      FROM targets t
      JOIN users u ON t.agent_id = u.id
      WHERE t.period = $1
    `;
    const params: unknown[] = [effectivePeriod];

    if (req.user!.role === 'agent') {
      params.push(req.user!.id);
      sql += ` AND t.agent_id = $${params.length}`;
    } else if (agentId) {
      params.push(agentId);
      sql += ` AND t.agent_id = $${params.length}`;
    }

    sql += ' ORDER BY u.name';
    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/targets — admin only */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    if (!b.agent_id || !b.period) {
      return res.status(400).json({ error: 'agent_id and period are required' });
    }
    const { rows } = await query(
      `INSERT INTO targets (agent_id, period, call_target, conv_target, revenue_target, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (agent_id, period) DO UPDATE SET
         call_target = EXCLUDED.call_target,
         conv_target = EXCLUDED.conv_target,
         revenue_target = EXCLUDED.revenue_target,
         updated_at = NOW()
       RETURNING *`,
      [b.agent_id, b.period, b.call_target ?? 50, b.conv_target ?? 10,
       b.revenue_target ?? 0, req.user!.id]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PUT /api/targets/:id */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await query(
      `UPDATE targets SET
         call_target = $1, conv_target = $2,
         revenue_target = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [b.call_target, b.conv_target, b.revenue_target ?? 0, req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** DELETE /api/targets/:id */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM targets WHERE id=$1', [req.params['id']]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
