import { pool } from '../config/database';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
export type JobType = 'bulk_delete';

export interface Job {
  id: number;
  type: JobType;
  status: JobStatus;
  progress: number;
  total_items: number;
  processed_items: number;
  user_id: number | null;
  idempotency_key: string | null;
  metadata: any;
  error: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface CreateJobInput {
  type: JobType;
  userId: number;
  idempotencyKey?: string;
  metadata: any;
}

export interface JobFilter {
  type?: JobType;
  status?: JobStatus;
  userId?: number;
  page?: number;
  limit?: number;
}

export class JobModel {
  static async findById(id: number): Promise<Job | null> {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByIdempotencyKey(userId: number, key: string): Promise<Job | null> {
    const result = await pool.query(
      'SELECT * FROM jobs WHERE user_id = $1 AND idempotency_key = $2',
      [userId, key]
    );
    return result.rows[0] || null;
  }

  static async findAll(filter: JobFilter = {}): Promise<{ jobs: Job[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filter.type) {
      conditions.push(`type = $${paramCount++}`);
      values.push(filter.type);
    }
    if (filter.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filter.status);
    }
    if (filter.userId !== undefined) {
      conditions.push(`user_id = $${paramCount++}`);
      values.push(filter.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM jobs ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM jobs ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`,
      [...values, limit, offset]
    );

    return { jobs: result.rows, total };
  }

  static async create(input: CreateJobInput): Promise<Job> {
    const result = await pool.query(
      `INSERT INTO jobs (type, status, progress, total_items, processed_items, user_id, idempotency_key, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
      [
        input.type,
        'queued',
        0,
        input.metadata.totalItems || 0,
        0,
        input.userId,
        input.idempotencyKey || null,
        JSON.stringify(input.metadata),
      ]
    );
    return result.rows[0];
  }

  static async updateStatus(id: number, status: JobStatus, error?: string): Promise<Job | null> {
    const result = await pool.query(
      `UPDATE jobs SET status = $1::VARCHAR, error = $2, updated_at = NOW(), 
       completed_at = CASE WHEN $1::VARCHAR IN ('succeeded', 'failed', 'canceled') THEN NOW() ELSE completed_at END
       WHERE id = $3 RETURNING *`,
      [status, error || null, id]
    );
    return result.rows[0] || null;
  }

  static async updateProgress(id: number, progress: number, processedItems: number): Promise<Job | null> {
    const result = await pool.query(
      'UPDATE jobs SET progress = $1, processed_items = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [progress, processedItems, id]
    );
    return result.rows[0] || null;
  }

  static async cancel(id: number): Promise<Job | null> {
    const result = await pool.query(
      `UPDATE jobs SET status = 'canceled', updated_at = NOW(), completed_at = NOW() 
       WHERE id = $1 AND status IN ('queued', 'running') RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }
}

