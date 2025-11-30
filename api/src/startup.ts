import { pool } from './config/database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from './config/logger';

export async function runMigrationsOnStartup() {
  try {
    // Check if tables exist
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tickets'
      );
    `);

    if (!checkResult.rows[0].exists) {
      logger.info('Running migrations...');
      // Try multiple possible paths (works in both dev and production)
      const possiblePaths = [
        join(__dirname, 'migrations/001_create_tables.sql'),
        join(process.cwd(), 'api/src/migrations/001_create_tables.sql'),
        join(process.cwd(), 'src/migrations/001_create_tables.sql'),
      ];
      
      let migrationSQL: string | null = null;
      for (const path of possiblePaths) {
        try {
          migrationSQL = readFileSync(path, 'utf-8');
          logger.debug(`Found migration file at: ${path}`);
          break;
        } catch (e) {
          // Try next path
        }
      }
      
      if (!migrationSQL) {
        throw new Error('Could not find migration file. Tried paths: ' + possiblePaths.join(', '));
      }
      
      await pool.query(migrationSQL);
      logger.info('Initial migration completed');
    } else {
      logger.info('Database tables already exist');
    }

    // Run additional migrations if needed
    try {
      // Check if idempotency_key column needs to be updated
      const columnCheck = await pool.query(`
        SELECT character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'idempotency_key'
      `);
      
      if (columnCheck.rows.length > 0 && columnCheck.rows[0].character_maximum_length === 255) {
        logger.info('Running migration: Update idempotency_key length...');
        const migration2Paths = [
          join(__dirname, 'migrations/002_update_idempotency_key_length.sql'),
          join(process.cwd(), 'api/src/migrations/002_update_idempotency_key_length.sql'),
          join(process.cwd(), 'src/migrations/002_update_idempotency_key_length.sql'),
        ];
        
        let migration2SQL: string | null = null;
        for (const path of migration2Paths) {
          try {
            migration2SQL = readFileSync(path, 'utf-8');
            logger.debug(`Found migration file at: ${path}`);
            break;
          } catch (e) {
            // Try next path
          }
        }
        
        if (migration2SQL) {
          await pool.query(migration2SQL);
          logger.info('Migration 002 completed: idempotency_key length updated');
        }
      }
    } catch (error) {
      logger.warn('Error running additional migrations (may already be applied):', error);
    }
  } catch (error) {
    logger.error('Migration error:', error);
    throw error;
  }
}

