import { app } from 'electron';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '@mindlr/db-schema';

let _db: BetterSQLite3Database<typeof schema> | null = null;
let _sqlite: Database.Database | null = null;

export function initDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;

  const userData = app.getPath('userData');
  if (!existsSync(userData)) mkdirSync(userData, { recursive: true });

  const dbPath = join(userData, 'mindlr.db');
  _sqlite = new Database(dbPath);
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.pragma('foreign_keys = ON');

  _db = drizzle(_sqlite, { schema });

  runBootstrapDdl(_sqlite);
  seedDefaults(_sqlite);

  return _db;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) throw new Error('DB not initialized. Call initDb() first.');
  return _db;
}

export function getSqlite(): Database.Database {
  if (!_sqlite) throw new Error('DB not initialized. Call initDb() first.');
  return _sqlite;
}

export function closeDb(): void {
  _sqlite?.close();
  _sqlite = null;
  _db = null;
}

/**
 * Phase 1 bootstrap DDL. Phase 2+ will replace this with drizzle-kit migrations
 * loaded from disk (out/migrations/).
 */
function runBootstrapDdl(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'macos',
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS models (
      repo_id TEXT PRIMARY KEY NOT NULL,
      files TEXT NOT NULL,
      total_bytes INTEGER NOT NULL,
      downloaded_at INTEGER NOT NULL,
      last_used_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      model_repo_id TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      synced_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      op TEXT NOT NULL,
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}

/**
 * Seed default settings rows if absent. Idempotent — uses INSERT OR IGNORE
 * so existing user values are never overwritten.
 *
 * `notchPosition` is wired now so future drag-to-reposition (Phase 4+) edits
 * the same row without schema churn. v1 always honours `auto-center-active-
 * display` regardless of what's stored.
 */
function seedDefaults(sqlite: Database.Database) {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO settings (key, value, platform, updated_at) VALUES (?, ?, ?, ?)`,
    )
    .run('notchPosition', JSON.stringify({ mode: 'auto-center-active-display' }), 'macos', now);
}
