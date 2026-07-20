import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

const STAGES = ['New Lead','Contacted','Interested','Proposal Sent','Negotiation','Won','Lost'];

/** GET /api/pipeline — returns all customers grouped by pipeline_stage */
router.get('/', async (req, res) => {
  try {
    const agentClause = req.user!.role === 'agent'
      ? `AND c.agent_id = '${req.user!.id}'`
      : '';

    const { rows } = await query(`
      SELECT c.*, u.name AS agent_name
      FROM customers c
      LEFT JOIN users u ON c.agent_id = u.id
      WHERE 1=1 ${agentClause}
      ORDER BY c.updated_at DESC
    `, []);

    // Group into kanban columns
    const columns: Record<string, any[]> = {};
    for (const s of STAGES) columns[s] = [];

    for (const row of rows) {
      const stage = row.pipeline_stage ?? 'New Lead';
      if (!columns[stage]) columns[stage] = [];
      columns[stage].push(row);
    }

    return res.json({ stages: STAGES, columns, total: rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/pipeline/stats — stage counts */
router.get('/stats', async (req, res) => {
  try {
    const agentClause = req.user!.role === 'agent'
      ? `AND agent_id = '${req.user!.id}'`
      : '';

    const { rows } = await query(`
      SELECT COALESCE(pipeline_stage,'New Lead') AS stage, COUNT(*) AS count
      FROM customers
      WHERE 1=1 ${agentClause}
      GROUP BY pipeline_stage
    `, []);

    const stats: Record<string, number> = {};
    for (const s of STAGES) stats[s] = 0;
    for (const r of rows) stats[r.stage] = parseInt(r.count);

    return res.json(stats);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/pipeline/:customerId — move to a new stage */
router.patch('/:id', async (req, res) => {
  try {
    const { stage } = req.body;
    if (!STAGES.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${STAGES.join(', ')}` });
    }

    const { rows } = await query(
      `UPDATE customers SET pipeline_stage = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [stage, req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
