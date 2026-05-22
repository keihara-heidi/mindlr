import { ipcMain, BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  DbQueryRequestSchema,
  DbMutateRequestSchema,
  type DbQueryResponse,
  type DbMutateResponse,
  type DbChangeEvent,
  type TableName,
} from '@mindlr/ipc-contracts';
import { TABLES } from '@mindlr/db-schema';
import { getSqlite } from '@main/db/client.js';

const SQL_TABLE_NAMES: Record<TableName, string> = {
  settings: 'settings',
  models: 'models',
  history: 'history',
  syncQueue: 'sync_queue',
};

const CAMEL_TO_SNAKE: Record<string, string> = {
  repoId: 'repo_id',
  totalBytes: 'total_bytes',
  downloadedAt: 'downloaded_at',
  lastUsedAt: 'last_used_at',
  modelRepoId: 'model_repo_id',
  durationMs: 'duration_ms',
  createdAt: 'created_at',
  syncedAt: 'synced_at',
  updatedAt: 'updated_at',
  tableName: 'table_name',
  lastError: 'last_error',
};

const SNAKE_TO_CAMEL: Record<string, string> = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([k, v]) => [v, k]),
);

const JSON_COLS_BY_TABLE: Record<TableName, Set<string>> = {
  settings: new Set(),
  models: new Set(['files']),
  history: new Set(),
  syncQueue: new Set(['payload']),
};

function toSqlCol(col: string): string {
  return CAMEL_TO_SNAKE[col] ?? col;
}

function toClientCol(col: string): string {
  return SNAKE_TO_CAMEL[col] ?? col;
}

function rowToClient(table: TableName, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const jsonCols = JSON_COLS_BY_TABLE[table];
  for (const [k, v] of Object.entries(row)) {
    const clientKey = toClientCol(k);
    if (jsonCols.has(k) && typeof v === 'string') {
      try {
        out[clientKey] = JSON.parse(v);
      } catch {
        out[clientKey] = v;
      }
    } else {
      out[clientKey] = v;
    }
  }
  return out;
}

function dataToSql(table: TableName, data: Record<string, unknown>): Record<string, unknown> {
  const jsonCols = JSON_COLS_BY_TABLE[table];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    const sqlKey = toSqlCol(k);
    if (jsonCols.has(sqlKey)) {
      out[sqlKey] = JSON.stringify(v);
    } else {
      out[sqlKey] = v;
    }
  }
  return out;
}

function buildWhere(where: Record<string, unknown> | undefined): { clause: string; params: unknown[] } {
  if (!where || Object.keys(where).length === 0) return { clause: '', params: [] };
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(where)) {
    parts.push(`${toSqlCol(k)} = ?`);
    params.push(v);
  }
  return { clause: ` WHERE ${parts.join(' AND ')}`, params };
}

function broadcastChange(event: DbChangeEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.dbChange, event);
  }
}

export function registerDbHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.dbQuery, async (_e, raw): Promise<DbQueryResponse> => {
    const req = DbQueryRequestSchema.parse(raw);
    if (!(req.table in TABLES)) throw new Error(`unknown table: ${req.table}`);
    const tableName = SQL_TABLE_NAMES[req.table];

    const { clause, params } = buildWhere(req.where);
    const orderBy = req.orderBy ? ` ORDER BY ${toSqlCol(req.orderBy)}` : '';
    const limit = req.limit ? ` LIMIT ${req.limit}` : '';
    const stmt = `SELECT * FROM ${tableName}${clause}${orderBy}${limit}`;

    const rows = getSqlite().prepare(stmt).all(...params) as Record<string, unknown>[];
    return { rows: rows.map((r) => rowToClient(req.table, r)) };
  });

  ipcMain.handle(IPC_CHANNELS.dbMutate, async (_e, raw): Promise<DbMutateResponse> => {
    const req = DbMutateRequestSchema.parse(raw);
    if (!(req.table in TABLES)) throw new Error(`unknown table: ${req.table}`);
    const tableName = SQL_TABLE_NAMES[req.table];

    const sqlite = getSqlite();
    let affected = 0;

    if (req.op === 'insert') {
      const data = dataToSql(req.table, req.data);
      const cols = Object.keys(data);
      const placeholders = cols.map(() => '?').join(', ');
      const stmt = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`;
      affected = sqlite.prepare(stmt).run(...Object.values(data)).changes;
    } else if (req.op === 'upsert') {
      const data = dataToSql(req.table, req.data);
      const cols = Object.keys(data);
      const placeholders = cols.map(() => '?').join(', ');
      const conflict = req.conflictKeys.map(toSqlCol).join(', ');
      const updates = cols
        .filter((c) => !req.conflictKeys.map(toSqlCol).includes(c))
        .map((c) => `${c} = excluded.${c}`)
        .join(', ');
      const stmt = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${conflict}) DO UPDATE SET ${updates}`;
      affected = sqlite.prepare(stmt).run(...Object.values(data)).changes;
    } else if (req.op === 'update') {
      const data = dataToSql(req.table, req.data);
      const setClause = Object.keys(data).map((c) => `${c} = ?`).join(', ');
      const { clause, params } = buildWhere(req.where);
      const stmt = `UPDATE ${tableName} SET ${setClause}${clause}`;
      affected = sqlite.prepare(stmt).run(...Object.values(data), ...params).changes;
    } else if (req.op === 'delete') {
      const { clause, params } = buildWhere(req.where);
      if (!clause) throw new Error('delete requires a where clause');
      const stmt = `DELETE FROM ${tableName}${clause}`;
      affected = sqlite.prepare(stmt).run(...params).changes;
    }

    if (affected > 0) {
      broadcastChange({ table: req.table, op: req.op });
    }
    return { affected };
  });
}

export function unregisterDbHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.dbQuery);
  ipcMain.removeHandler(IPC_CHANNELS.dbMutate);
}
