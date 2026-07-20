import { Router } from 'express';
import { query } from '../lib/database';
import { requireAuth, requireAdmin } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

/** GET /api/categories */
router.get('/', async (_req, res) => {
  try {
    const { rows } = await query('SELECT * FROM categories ORDER BY name');
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/categories (admin only) */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, color, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await query(
      'INSERT INTO categories (name, color, description) VALUES ($1,$2,$3) RETURNING *',
      [name, color ?? '#1565C0', description ?? null]
    );
    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** PUT /api/categories/:id */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, color, description } = req.body;
    const { rows } = await query(
      'UPDATE categories SET name=$1, color=$2, description=$3 WHERE id=$4 RETURNING *',
      [name, color, description, req.params['id']]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/** DELETE /api/categories/:id */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM categories WHERE id=$1', [req.params['id']]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
