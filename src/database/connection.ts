import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database.Database;
  private initialized = false;

  private constructor() {
    if (!fs.existsSync(config.paths.data)) {
      fs.mkdirSync(config.paths.data, { recursive: true });
    }

    const dbPath = path.join(config.paths.data, 'nexus-flow.db');
    this.db = new Database(dbPath);

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');

    logger.info(`Database connected: ${dbPath}`);
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  getClient(): Database.Database {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  initialize(): void {
    if (this.initialized) return;
    this.runMigrations();
    this.initialized = true;
  }

  private runMigrations(): void {
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        this.db.exec(sql);
        logger.debug(`Migration applied: ${file}`);
      } catch (err: any) {
        logger.error(`Migration failed: ${file} - ${err.message}`);
        throw err;
      }
    }

    logger.info(`Database migrations completed (${files.length} files)`);
  }

  close(): void {
    this.db.close();
    logger.info('Database connection closed');
  }
}

export const dbConnection = DatabaseConnection.getInstance();
