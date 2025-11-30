import { pool } from '../config/database';

export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<User | null> {
    const result = await pool.query('SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(email: string, passwordHash: string, role: UserRole = 'user'): Promise<User> {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, email, role, created_at, updated_at',
      [email, passwordHash, role]
    );
    return result.rows[0];
  }
}

