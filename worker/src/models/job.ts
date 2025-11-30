import { pool } from '../config/database';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface Job {
  id: number;
  status: JobStatus;
  progress: number;
  total_items: number;
  processed_items: number;
}

export class JobModel {
  static async findById(id: number): Promise<Job | null> {
    const result = await pool.query('SELECT id, status, progress, total_items, processed_items FROM jobs WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async updateStatus(id: number, status: JobStatus, error?: string): Promise<void> {
    await pool.query(
      `UPDATE jobs SET status = $1::VARCHAR, error = $2, updated_at = NOW(), 
       completed_at = CASE WHEN $1::VARCHAR IN ('succeeded', 'failed', 'canceled') THEN NOW() ELSE completed_at END
       WHERE id = $3`,
      [status, error || null, id]
    );
  }

  static async updateProgress(id: number, progress: number, processedItems: number): Promise<void> {
    await pool.query(
      'UPDATE jobs SET progress = $1, processed_items = $2, updated_at = NOW() WHERE id = $3',
      [progress, processedItems, id]
    );
  }
}

