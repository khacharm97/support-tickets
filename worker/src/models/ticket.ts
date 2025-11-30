import { pool } from '../config/database';

export class TicketModel {
  static async bulkSoftDelete(ids: number[]): Promise<number[]> {
    if (ids.length === 0) return [];
    const result = await pool.query(
      'UPDATE tickets SET deleted_at = NOW() WHERE id = ANY($1) AND deleted_at IS NULL RETURNING id',
      [ids]
    );
    return result.rows.map(row => row.id);
  }
}

