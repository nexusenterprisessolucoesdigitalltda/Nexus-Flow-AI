import { dbConnection } from './connection';
import { logger } from '../utils/logger';

export interface ConversationMessage {
  id?: number;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  skillUsed?: string;
  tokensUsed?: number;
  modelUsed?: string;
  createdAt?: string;
}

export interface ConversationHistory {
  role: string;
  content: string;
}

export class ConversationRepository {
  addMessage(message: ConversationMessage): number {
    const db = dbConnection.getClient();
    const stmt = db.prepare(`
      INSERT INTO conversations (user_id, role, content, skill_used, tokens_used, model_used)
      VALUES (@userId, @role, @content, @skillUsed, @tokensUsed, @modelUsed)
    `);

    const result = stmt.run({
      userId: message.userId,
      role: message.role,
      content: message.content,
      skillUsed: message.skillUsed || null,
      tokensUsed: message.tokensUsed || null,
      modelUsed: message.modelUsed || null,
    });

    return Number(result.lastInsertRowid);
  }

  getHistory(userId: string, limit: number = 20): ConversationHistory[] {
    const db = dbConnection.getClient();
    const stmt = db.prepare(`
      SELECT role, content
      FROM conversations
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(userId, limit) as ConversationHistory[];
    return rows.reverse();
  }

  clearHistory(userId: string): number {
    const db = dbConnection.getClient();
    const result = db.prepare('DELETE FROM conversations WHERE user_id = ?').run(userId);
    logger.info(`History cleared for user ${userId} (${result.changes} messages)`);
    return result.changes;
  }

  getStats(userId: string): { total: number; lastMessage?: string } {
    const db = dbConnection.getClient();
    const count = db.prepare('SELECT COUNT(*) as total FROM conversations WHERE user_id = ?').get(userId) as any;
    const last = db.prepare('SELECT created_at FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any;
    return {
      total: count?.total || 0,
      lastMessage: last?.created_at,
    };
  }

  pruneOldMessages(userId: string, keepCount: number = 100): number {
    const db = dbConnection.getClient();
    const result = db.prepare(`
      DELETE FROM conversations
      WHERE id NOT IN (
        SELECT id FROM conversations
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      ) AND user_id = ?
    `).run(userId, keepCount, userId);
    return result.changes;
  }
}

export const conversationRepo = new ConversationRepository();
