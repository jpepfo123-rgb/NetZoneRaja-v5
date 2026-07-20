import app from './app.js';
import { logger } from './lib/logger.js';
import { initDb } from './lib/database.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function start() {
  try {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, `CRM API Server started`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
