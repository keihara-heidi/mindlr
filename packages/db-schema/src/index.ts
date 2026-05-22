import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  platform: text('platform').notNull().default('macos'),
  updatedAt: integer('updated_at').notNull(),
});

export const models = sqliteTable('models', {
  repoId: text('repo_id').primaryKey(),
  files: text('files', { mode: 'json' }).$type<ModelFile[]>().notNull(),
  totalBytes: integer('total_bytes').notNull(),
  downloadedAt: integer('downloaded_at').notNull(),
  lastUsedAt: integer('last_used_at'),
});

export const history = sqliteTable('history', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  modelRepoId: text('model_repo_id').notNull(),
  durationMs: integer('duration_ms').notNull(),
  createdAt: integer('created_at').notNull(),
  syncedAt: integer('synced_at'),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(),
  op: text('op', { enum: ['insert', 'update', 'delete'] }).notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: integer('created_at').notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type SettingsInsert = typeof settings.$inferInsert;
export type Model = typeof models.$inferSelect;
export type ModelInsert = typeof models.$inferInsert;
export type History = typeof history.$inferSelect;
export type HistoryInsert = typeof history.$inferInsert;
export type SyncQueueEntry = typeof syncQueue.$inferSelect;

export interface ModelFile {
  path: string;
  bytes: number;
  sha256: string;
}

export const TABLES = { settings, models, history, syncQueue } as const;
export type TableName = keyof typeof TABLES;
