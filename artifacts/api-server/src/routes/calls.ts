import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth } from '../middlewares/auth';
import { broadcastEvent } from '../lib/events.js';

const router = Router();
router.use(requireAuth);

/** GET /api/calls */
router.get('/', async (req, res) => {
  try {
    const { customerId, agentId, type, filter, date, limit = '200' } = req.query as Record<string, string>;

    // The JOIN uses two strategies:
    //   1. Primary:   exact customer_id match
    //   2. Fallback:  phone-number match (last 10 digits, digits only) when customer_id is NULL
    // This ensures calls logged before a customer record existed are automatically linked
    // once the customer is created.
    let sql = `
      SELECT cl.*,
        COALESCE(c.name,     cl.customer_name)   AS customer_name_resolved,
        COALESCE(c.mobile,   cl.customer_mobile)  AS customer_mobile_resolved,
        c.id                                       AS matched_customer_id,
        c.category                                 AS customer_category_live,
        c.notes                                    AS customer_notes
      FROM calls cl
      LEFT JOIN customers c ON (
        cl.customer_id = c.id
        OR (
          cl.customer_id IS NULL
          AND RIGHT(regexp_replace(COALESCE(cl.phone_number, cl.customer_mobile, ''), '[^0-9]', '', 'g'), 10) != ''
          AND RIGHT(regexp_replace(COALESCE(cl.phone_number, cl.customer_mobile, ''), '[^0-9]', '', 'g'), 10)
            = RIGHT(regexp_replace(COALESCE(c.mobile, ''), '[^0-9]', '', 'g'), 10)
        )
      )
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

    if (customerId) {
      params.push(customerId);
      sql += ` AND cl.customer_id = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND cl.type = $${params.length}`;
    }

    // Date filters
    const now = new Date();
    if (filter === 'today') {
      sql += ` AND cl.created_at >= NOW()::date`;
    } else if (filter === 'yesterday') {
      sql += ` AND cl.created_at >= NOW()::date - 1 AND cl.created_at < NOW()::date`;
    } else if (filter === 'week') {
      sql += ` AND cl.created_at >= NOW()::date - 7`;
    } else if (date) {
      params.push(date);
      sql += ` AND cl.created_at::date = $${params.length}::date`;
    }

    params.push(Math.min(parseInt(limit), 500));
    sql += ` ORDER BY cl.created_at DESC LIMIT $${params.length}`;

    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/calls */
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    if (!b.type) return res.status(400).json({ error: 'type is required' });

    const agentId = b.agent_id ?? req.user!.id;
    const { rows: uRows } = await query('SELECT name FROM users WHERE id=$1', [agentId]);
    const agentName = b.agent_name ?? uRows[0]?.name ?? req.user!.name;

    const { rows } = await query(
      `INSERT INTO calls
        (customer_id, customer_name, customer_mobile, agent_id, agent_name,
         type, duration, duration_seconds, phone_number, remarks,
         category, follow_up_date, reminder_date, device_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
               COALESCE($15::timestamptz, NOW()))
       RETURNING *`,
      [b.customer_id ?? null, b.customer_name ?? null, b.customer_mobile ?? null,
       agentId, agentName, b.type,
       b.duration ?? '0:00', b.duration_seconds ?? 0,
       b.phone_number ?? b.customer_mobile ?? null,
       b.remarks ?? null, b.category ?? null,
       b.follow_up_date ?? null, b.reminder_date ?? null,
       b.device_id ?? null, b.created_at ?? null]
    );

    // Update customer stats
    if (b.customer_id) {
      await query(
        `UPDATE customers SET
           total_calls = total_calls + 1,
           last_call_at = NOW(),
           updated_at = NOW()
         WHERE id = $1`,
        [b.customer_id]
      );
    }

    // Push real-time event to dashboard SSE clients
    broadcastEvent('call', {
      id:           rows[0]?.id,
      type:         rows[0]?.type,
      agentId:      agentId,
      agentName:    agentName,
      phoneNumber:  rows[0]?.phone_number,
      customerName: rows[0]?.customer_name,
      createdAt:    rows[0]?.created_at,
    });

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/calls/bulk-sync — sync many calls from device */
router.post('/bulk-sync', async (req, res) => {
  try {
    const { calls } = req.body as { calls: any[] };
    if (!Array.isArray(calls)) return res.status(400).json({ error: 'calls array required' });

    const results = [];
    for (const b of calls) {
      const { rows } = await query(
        `INSERT INTO calls
          (customer_id, customer_name, customer_mobile, agent_id, agent_name,
           type, duration, duration_seconds, phone_number, remarks,
           device_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
                 COALESCE($12::timestamptz, NOW()))
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [b.customer_id ?? null, b.customer_name ?? null, b.customer_mobile ?? null,
         req.user!.id, req.user!.name, b.type,
         b.duration ?? '0:00', b.duration_seconds ?? 0,
         b.phone_number ?? null, b.remarks ?? null,
         b.device_id ?? null, b.created_at ?? null]
      );
      if (rows[0]) results.push(rows[0]);
    }
    return res.json({ ok: true, synced: results.length });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/calls/:id */
router.patch('/:id', async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await query(
      `UPDATE calls SET
         remarks=COALESCE($1, remarks),
         category=COALESCE($2, category),
         follow_up_date=COALESCE($3::timestamptz, follow_up_date),
         reminder_date=COALESCE($4::timestamptz, reminder_date)
       WHERE id=$5 RETURNING *`,
      [b.remarks ?? null, b.category ?? null,
       b.follow_up_date ?? null, b.reminder_date ?? null, req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
