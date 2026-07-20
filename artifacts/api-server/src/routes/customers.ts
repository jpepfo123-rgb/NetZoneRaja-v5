import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

/**
 * Backfill: link orphaned call records (customer_id IS NULL) to a customer
 * by normalised phone number (last 10 digits, digits only).
 * Called after every customer create/update so historical calls are linked immediately.
 */
async function backfillCalls(customerId: number, customerName: string, mobile: string) {
  await query(
    `UPDATE calls
     SET customer_id   = $1,
         customer_name = $2
     WHERE customer_id IS NULL
       AND RIGHT(regexp_replace(COALESCE(phone_number, customer_mobile, ''), '[^0-9]', '', 'g'), 10) != ''
       AND RIGHT(regexp_replace(COALESCE(phone_number, customer_mobile, ''), '[^0-9]', '', 'g'), 10)
         = RIGHT(regexp_replace($3, '[^0-9]', '', 'g'), 10)`,
    [customerId, customerName, mobile]
  );
}

/** GET /api/customers */
router.get('/', async (req, res) => {
  try {
    const { search, category, agentId } = req.query as Record<string, string>;
    let sql = `
      SELECT c.*, u.name as agent_name,
        (SELECT COUNT(*) FROM calls WHERE customer_id = c.id) as total_calls,
        (SELECT MAX(created_at) FROM calls WHERE customer_id = c.id) as last_call_at
      FROM customers c
      LEFT JOIN users u ON c.agent_id = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    // Agents can only see their own customers
    if (req.user!.role === 'agent') {
      params.push(req.user!.id);
      sql += ` AND c.agent_id = $${params.length}`;
    } else if (agentId) {
      params.push(agentId);
      sql += ` AND c.agent_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (c.name ILIKE $${params.length} OR c.mobile ILIKE $${params.length} OR c.company ILIKE $${params.length})`;
    }
    if (category) {
      params.push(category);
      sql += ` AND c.category = $${params.length}`;
    }

    sql += ' ORDER BY c.updated_at DESC';
    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/customers/:id */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, u.name as agent_name FROM customers c
       LEFT JOIN users u ON c.agent_id = u.id WHERE c.id = $1`,
      [req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/customers */
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    if (!b.name || !b.mobile) {
      return res.status(400).json({ error: 'name and mobile are required' });
    }
    const agentId = b.agent_id ?? (req.user!.role === 'agent' ? req.user!.id : null);
    const { rows } = await query(
      `INSERT INTO customers
        (name, mobile, alternate_number, company, email, address, city, category, priority, notes, follow_up_date, agent_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [b.name, b.mobile, b.alternate_number ?? null, b.company ?? null,
       b.email ?? null, b.address ?? null, b.city ?? null,
       b.category ?? 'New Lead', b.priority ?? 'Medium',
       b.notes ?? null, b.follow_up_date ?? null, agentId]
    );
    const newCustomer = rows[0];

    // Backfill: link any existing call records that matched this phone number
    // but were logged before the customer record existed.
    if (newCustomer?.id && newCustomer?.mobile) {
      await backfillCalls(newCustomer.id, newCustomer.name, newCustomer.mobile);
    }

    return res.status(201).json(newCustomer);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PUT /api/customers/:id */
router.put('/:id', async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await query(
      `UPDATE customers SET
        name=$1, mobile=$2, alternate_number=$3, company=$4, email=$5,
        address=$6, city=$7, category=$8, priority=$9, notes=$10,
        follow_up_date=$11, status=$12, close_date=$13, close_remark=$14,
        close_by=$15, updated_at=NOW()
       WHERE id=$16 RETURNING *`,
      [b.name, b.mobile, b.alternate_number ?? null, b.company ?? null,
       b.email ?? null, b.address ?? null, b.city ?? null,
       b.category ?? 'New Lead', b.priority ?? 'Medium',
       b.notes ?? null, b.follow_up_date ?? null,
       b.status ?? 'Active',
       b.close_date ?? null, b.close_remark ?? null, b.close_by ?? null,
       req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const updated = rows[0];
    if (updated?.id && updated?.mobile) {
      await backfillCalls(updated.id, updated.name, updated.mobile);
    }
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/customers/:id */
router.patch('/:id', async (req, res) => {
  try {
    const b = req.body;
    const allowed = ['name','mobile','alternate_number','company','email','address',
                     'city','category','priority','notes','follow_up_date','agent_id',
                     'status','close_date','close_remark','close_by'];
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const key of allowed) {
      if (key in b) {
        params.push(b[key]);
        sets.push(`${key}=$${params.length}`);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(req.params['id']);
    const { rows } = await query(
      `UPDATE customers SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const patched = rows[0];
    if (patched?.id && patched?.mobile) {
      await backfillCalls(patched.id, patched.name, patched.mobile);
    }
    return res.json(patched);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** DELETE /api/customers/:id */
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM customers WHERE id=$1', [req.params['id']]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
