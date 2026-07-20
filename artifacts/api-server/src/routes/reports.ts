import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

/** GET /api/reports/calls?from=&to=&agentId=&type= */
router.get('/calls', async (req, res) => {
  try {
    const { from, to, agentId, type } = req.query as Record<string, string>;
    let sql = `
      SELECT cl.*, u.name as agent_name_resolved, c.company
      FROM calls cl
      LEFT JOIN users u ON cl.agent_id = u.id
      LEFT JOIN customers c ON cl.customer_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (req.user!.role === 'agent') {
      params.push(req.user!.id);
      sql += ` AND cl.agent_id = $${params.length}`;
    } else if (agentId) {
      params.push(agentId);
      sql += ` AND cl.agent_id = $${params.length}`;
    }
    if (from) { params.push(from); sql += ` AND cl.created_at >= $${params.length}::date`; }
    if (to)   { params.push(to);   sql += ` AND cl.created_at < ($${params.length}::date + 1)`; }
    if (type) { params.push(type); sql += ` AND cl.type = $${params.length}`; }

    sql += ' ORDER BY cl.created_at DESC LIMIT 1000';
    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/reports/summary?from=&to= */
router.get('/summary', async (req, res) => {
  try {
    const { from = '1970-01-01', to = '2099-01-01', agentId } = req.query as Record<string, string>;
    const agentClause = req.user!.role === 'agent'
      ? `AND agent_id = ${req.user!.id}`
      : agentId ? `AND agent_id = ${parseInt(agentId)}` : '';

    const [total, byType, byDate, topCustomers] = await Promise.all([
      query(`SELECT COUNT(*) as total, SUM(duration_seconds) as total_seconds FROM calls
             WHERE created_at >= $1::date AND created_at < ($2::date + 1) ${agentClause}`,
             [from, to]),
      query(`SELECT type, COUNT(*) as count FROM calls
             WHERE created_at >= $1::date AND created_at < ($2::date + 1) ${agentClause}
             GROUP BY type`, [from, to]),
      query(`SELECT created_at::date as date, COUNT(*) as calls FROM calls
             WHERE created_at >= $1::date AND created_at < ($2::date + 1) ${agentClause}
             GROUP BY date ORDER BY date`, [from, to]),
      query(`SELECT customer_name, customer_mobile, COUNT(*) as calls FROM calls
             WHERE created_at >= $1::date AND created_at < ($2::date + 1) ${agentClause}
             GROUP BY customer_name, customer_mobile
             ORDER BY calls DESC LIMIT 10`, [from, to]),
    ]);

    const typeMap: Record<string, number> = {};
    for (const r of byType.rows) typeMap[r.type] = parseInt(r.count);

    return res.json({
      total_calls: parseInt(total.rows[0]?.total ?? '0'),
      total_minutes: Math.round(parseInt(total.rows[0]?.total_seconds ?? '0') / 60),
      by_type: typeMap,
      by_date: byDate.rows,
      top_customers: topCustomers.rows,
    });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/reports/customers */
router.get('/customers', async (req, res) => {
  try {
    const agentClause = req.user!.role === 'agent' ? `AND c.agent_id = ${req.user!.id}` : '';
    const { rows } = await query(`
      SELECT c.*, u.name as agent_name,
        COUNT(cl.id) as call_count,
        MAX(cl.created_at) as last_call_at
      FROM customers c
      LEFT JOIN users u ON c.agent_id = u.id
      LEFT JOIN calls cl ON cl.customer_id = c.id
      WHERE 1=1 ${agentClause}
      GROUP BY c.id, u.name
      ORDER BY call_count DESC
    `);
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
