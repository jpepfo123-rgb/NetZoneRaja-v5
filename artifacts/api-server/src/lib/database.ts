import pg from 'pg';
import { logger } from './logger';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL pool error');
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.debug({ text: text.slice(0, 80), duration, rows: res.rowCount }, 'db query');
  return res;
}

// Run on startup: seed users with bcrypt hashed passwords
export async function initDb() {
  try {
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('admin123', salt);
    const agentHash = await bcrypt.hash('agent123', salt);

    await query(`
      INSERT INTO users (name, username, password_hash, role, phone) VALUES
        ('Admin User',  'admin',  $1, 'admin', '9000000001'),
        ('Raj Sharma',  'agent1', $2, 'agent', '9000000002'),
        ('Priya Singh', 'agent2', $2, 'agent', '9000000003')
      ON CONFLICT (username) DO NOTHING
    `, [adminHash, agentHash]);

    // Seed sample customers if empty
    const { rows } = await query('SELECT COUNT(*) FROM customers');
    if (parseInt(rows[0].count) === 0) {
      const { rows: users } = await query('SELECT id, username FROM users');
      const agent1 = users.find((u: any) => u.username === 'agent1')?.id;
      const agent2 = users.find((u: any) => u.username === 'agent2')?.id;
      if (agent1 && agent2) {
        await query(`
          INSERT INTO customers (name, mobile, alternate_number, company, email, address, city, category, priority, notes, agent_id) VALUES
            ('Amit Patel',   '9876543210', '9876543211', 'Patel Traders',  'amit@example.com',   'Shop No 12, MG Road', 'Mumbai',    'Interested',      'High',   'Interested in premium plan',        $1),
            ('Sunita Rao',   '9123456789', NULL,          'Rao Enterprises','sunita@example.com', 'Flat 4B, Pune Nagar', 'Pune',      'Follow-up',       'Medium', 'Called twice, need follow-up',       $1),
            ('Vijay Kumar',  '8765432109', '8765432100', 'Kumar & Sons',   'vijay@example.com',  '45 DL Colony',        'Delhi',     'Customer',        'Low',    'Active customer since 2023',         $2),
            ('Meera Shah',   '7654321098', NULL,          'Shah Fabrics',   'meera@example.com',  'Phase 2, SG Highway', 'Ahmedabad', 'Payment Pending', 'High',   'Payment due this week',              $1),
            ('Rajan Verma',  '6543210987', '6543210988', 'Verma IT',       'rajan@example.com',  '12 Koramangala',      'Bangalore', 'New Lead',        'Medium', 'Referral from Vijay',                $2),
            ('Anita Desai',  '9988776655', NULL,          'Desai Exports',  'anita@example.com',  'Anna Nagar, Block A', 'Chennai',   'Closed',          'Low',    'Deal closed successfully',           $1),
            ('Deepak Joshi', '9871234560', '9871234561', 'Joshi Pvt Ltd',  'deepak@example.com', 'Park Street 33',      'Kolkata',   'Interested',      'High',   'Demo scheduled next week',           $2),
            ('Kavita Nair',  '8900123456', NULL,          'Nair Solutions', 'kavita@example.com', 'Banjara Hills, Rd 2', 'Hyderabad', 'Follow-up',       'Medium', 'Waiting for budget approval',        $1)
        `, [agent1, agent2]);

        // Seed some calls
        const { rows: custs } = await query('SELECT id, name, mobile, agent_id FROM customers LIMIT 5');
        for (const c of custs) {
          const { rows: u } = await query('SELECT name FROM users WHERE id=$1', [c.agent_id]);
          const agentName = u[0]?.name ?? 'Agent';
          await query(`
            INSERT INTO calls (customer_id, customer_name, customer_mobile, agent_id, agent_name, type, duration, duration_seconds, remarks, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW() - ($10 || ' hours')::interval)
          `, [c.id, c.name, c.mobile, c.agent_id, agentName,
              ['Incoming','Outgoing','Missed'][Math.floor(Math.random()*3)],
              '2:30', 150, 'Initial contact', String(Math.floor(Math.random()*8)+1)]);
        }
      }
    }
    logger.info('Database initialized successfully');
  } catch (err) {
    logger.error({ err }, 'DB init error');
  }
}
