import { pool } from '../config/database';

export class JobItemModel {
  static async create(jobId: number, itemId: number, status: 'succeeded' | 'failed', error?: string): Promise<void> {
    await pool.query(
      'INSERT INTO job_items (job_id, item_id, status, error, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [jobId, itemId, status, error || null]
    );
  }
}

