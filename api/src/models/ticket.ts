import { pool } from '../config/database';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  status?: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: string;
}

export class TicketModel {
  static async findAll(page: number = 1, limit: number = 10): Promise<{ tickets: Ticket[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM tickets WHERE deleted_at IS NULL'
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM tickets WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return { tickets: result.rows, total };
  }

  static async findById(id: number): Promise<Ticket | null> {
    const result = await pool.query(
      'SELECT * FROM tickets WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByIds(ids: number[]): Promise<Ticket[]> {
    if (ids.length === 0) return [];
    const result = await pool.query(
      'SELECT * FROM tickets WHERE id = ANY($1) AND deleted_at IS NULL',
      [ids]
    );
    return result.rows;
  }

  static async create(input: CreateTicketInput): Promise<Ticket> {
    const result = await pool.query(
      'INSERT INTO tickets (title, description, status, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [input.title, input.description, input.status || 'open']
    );
    return result.rows[0];
  }

  static async update(id: number, input: UpdateTicketInput): Promise<Ticket | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(input.description);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(input.status);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramCount} AND deleted_at IS NULL RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  static async softDelete(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE tickets SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  }

  static async bulkSoftDelete(ids: number[]): Promise<number[]> {
    if (ids.length === 0) return [];
    const result = await pool.query(
      'UPDATE tickets SET deleted_at = NOW() WHERE id = ANY($1) AND deleted_at IS NULL RETURNING id',
      [ids]
    );
    return result.rows.map(row => row.id);
  }
}

