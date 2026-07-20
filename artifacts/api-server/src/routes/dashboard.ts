import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth } from '../middlewares/auth';
import { addSseClient, connectedClients } from '../lib/events.js';

const router = Router();
router.use(requireAuth);

/** GET /api/dashboard */
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const agentFilter = isAdmin ? '' : `AND agent_id = ${req.user!.id}`;

    const [todayCalls, missedToday, totalCustomers, pendingFollowUps,
           todayReminders, liveAgents, callsByType, recentCalls] = await Promise.all([
      // Today's calls
      query(`SELECT COUNT(*) FROM calls WHERE created_at >= NOW()::date ${agentFilter}`),
      // Missed today
      query(`SELECT COUNT(*) FROM calls WHERE type='Missed' AND created_at >= NOW()::date ${agentFilter}`),
      // Total customers
      query(`SELECT COUNT(*) FROM customers WHERE 1=1 ${isAdmin ? '' : `AND agent_id=${req.user!.id}`}`),
      // Pending follow-ups
      query(`SELECT COUNT(*) FROM customers WHERE follow_up_date IS NOT NULL AND follow_up_date::date <= NOW()::date ${isAdmin ? '' : `AND agent_id=${req.user!.id}`}`),
      // Today's reminders
      query(`SELECT COUNT(*) FROM reminders WHERE status='pending' AND date_time::date = NOW()::date ${isAdmin ? '' : `AND agent_id=${req.user!.id}`}`),
      // Active agents (admin only)
      isAdmin ? query(`SELECT COUNT(*) FROM users WHERE role='agent' AND active=true`) : Promise.resolve({ rows: [{ count: 0 }] }),
      // Calls by type today
      query(`SELECT type, COUNT(*) as count FROM calls WHERE created_at >= NOW()::date ${agentFilter} GROUP BY type`),
      // Recent calls
      query(`SELECT cl.*, c.name as customer_display FROM calls cl
             LEFT JOIN customers c ON cl.customer_id = c.id
             WHERE 1=1 ${agentFilter.replace('agent_id', 'cl.agent_id')}
             ORDER BY cl.created_at DESC LIMIT 10`),
    ]);

    const callTypeMap: Record<string, number> = {};
    for (const row of callsByType.rows) {
      callTypeMap[row.type] = parseInt(row.count);
    }

    return res.json({
      today_calls: parseInt(todayCalls.rows[0].count),
      missed_today: parseInt(missedToday.rows[0].count),
      total_customers: parseInt(totalCustomers.rows[0].count),
      pending_follow_ups: parseInt(pendingFollowUps.rows[0].count),
      today_reminders: parseInt(todayReminders.rows[0].count),
      active_agents: parseInt(liveAgents.rows[0].count),
      calls_by_type: {
        incoming: callTypeMap['Incoming'] ?? 0,
        outgoing: callTypeMap['Outgoing'] ?? 0,
        missed: callTypeMap['Missed'] ?? 0,
      },
      recent_calls: recentCalls.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/dashboard/agent-performance (admin only) */
router.get('/agent-performance', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        u.id, u.name, u.username,
        COUNT(cl.id) FILTER (WHERE cl.created_at >= NOW()::date) as calls_today,
        COUNT(cl.id) FILTER (WHERE cl.created_at >= NOW() - INTERVAL '7 days') as calls_week,
        COUNT(cl.id) FILTER (WHERE cl.type='Missed' AND cl.created_at >= NOW()::date) as missed_today,
        COUNT(DISTINCT c.id) as total_customers,
        ROUND(AVG(cl.duration_seconds) FILTER (WHERE cl.duration_seconds > 0), 0) as avg_duration
      FROM users u
      LEFT JOIN calls cl ON cl.agent_id = u.id
      LEFT JOIN customers c ON c.agent_id = u.id
      WHERE u.role = 'agent' AND u.active = true
      GROUP BY u.id, u.name, u.username
      ORDER BY calls_today DESC
    `);
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/dashboard/events — Server-Sent Events stream.
 * Dashboard subscribes here to receive real-time call notifications
 * without polling. Events:
 *   - "connected" : handshake on connect
 *   - "call"      : a new call record was created (any agent)
 *   - heartbeat comment (:ping) every 30 s to keep proxies alive
 */
router.get('/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');  // disable nginx buffering
  res.flushHeaders();

  // Send initial handshake
  res.write(`event: connected\ndata: {"clients":${connectedClients() + 1}}\n\n`);

  addSseClient(res, req.user?.id?.toString(), req.user?.role);

  // Heartbeat — keeps the TCP connection alive through proxies/load balancers
  const heartbeat = setInterval(() => {
    try { res.write(':ping\n\n'); } catch { clearInterval(heartbeat); }
  }, 30_000);

  res.on('close', () => clearInterval(heartbeat));
});

/** GET /api/dashboard/live-calls */
router.get('/live-calls', async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT cl.*, u.name as agent_name_resolved
      FROM calls cl
      LEFT JOIN users u ON cl.agent_id = u.id
      WHERE cl.created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY cl.created_at DESC LIMIT 20
    `);
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/dashboard/repeat-callers */
router.get('/repeat-callers', async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        phone_number, customer_name,
        COUNT(*) as call_count,
        MAX(created_at) as last_call,
        array_agg(DISTINCT type) as call_types
      FROM calls
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY phone_number, customer_name
      HAVING COUNT(*) > 2
      ORDER BY call_count DESC LIMIT 20
    `);
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
