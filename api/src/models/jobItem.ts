import { pool } from '../config/database';

export interface JobItem {
  id: number;
  job_id: number;
  item_id: number;
  status: 'succeeded' | 'failed';
  error: string | null;
  created_at: Date;
}

export class JobItemModel {
  static async create(jobId: number, itemId: number, status: 'succeeded' | 'failed', error?: string): Promise<JobItem> {
    const result = await pool.query(
      'INSERT INTO job_items (job_id, item_id, status, error, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [jobId, itemId, status, error || null]
    );
    return result.rows[0];
  }

  static async findByJobId(jobId: number): Promise<JobItem[]> {
    const result = await pool.query(
      'SELECT * FROM job_items WHERE job_id = $1 ORDER BY created_at ASC',
      [jobId]
    );
    return result.rows;
  }
}

