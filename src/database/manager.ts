import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../utils/logger';

const DB_PATH = path.join(process.cwd(), 'data', 'sunday-claw.db');

class DatabaseManager {
  private db: Database.Database;

  constructor() {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        skill_used TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
    `);
    logger.info('Database initialized');
  }

  addMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, skillUsed?: string): void {
    const stmt = this.db.prepare(
      'INSERT INTO conversations (user_id, role, content, skill_used) VALUES (?, ?, ?, ?)'
    );
    stmt.run(userId, role, content, skillUsed || null);
  }

  getHistory(userId: string, limit: number = 20): { role: string; content: string }[] {
    const stmt = this.db.prepare(
      'SELECT role, content FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    );
    const rows = stmt.all(userId, limit) as { role: string; content: string }[];
    return rows.reverse();
  }

  clearHistory(userId: string): void {
    this.db.prepare('DELETE FROM conversations WHERE user_id = ?').run(userId);
    logger.info(`History cleared for user ${userId}`);
  }

  close(): void {
    this.db.close();
  }
}

export const db = new DatabaseManager();
