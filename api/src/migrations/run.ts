import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';
import { logger } from '../config/logger';

async function runMigrations() {
  try {
    const migrationSQL = readFileSync(join(__dirname, '001_create_tables.sql'), 'utf-8');
    
    await pool.query(migrationSQL);
    
    logger.info('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

