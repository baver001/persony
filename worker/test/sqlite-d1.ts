import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type Stmt = {
  bind: (...values: unknown[]) => Stmt;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[] }>;
  run: () => Promise<{ meta?: { changes?: number } }>;
};

function createStmt(db: DatabaseSync, sql: string): Stmt {
  let bound: unknown[] = [];

  const stmt: Stmt = {
    bind(...values: unknown[]) {
      bound = values;
      return stmt;
    },
    async first<T>() {
      const values = bound as (string | number | null | Uint8Array)[];
      const row = db.prepare(sql).get(...values) as T | undefined;
      return row ?? null;
    },
    async all<T>() {
      const values = bound as (string | number | null | Uint8Array)[];
      const rows = db.prepare(sql).all(...values) as T[];
      return { results: rows };
    },
    async run() {
      const values = bound as (string | number | null | Uint8Array)[];
      const info = db.prepare(sql).run(...values);
      return { meta: { changes: Number(info.changes) } };
    },
  };

  return stmt;
}

export function createTestD1(migrationsDir: string): D1Database {
  const db = new DatabaseSync(':memory:');

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    for (const statement of sql.split(';')) {
      const trimmed = statement.trim();
      if (trimmed) db.exec(trimmed);
    }
  }

  return {
    prepare(sql: string) {
      return createStmt(db, sql);
    },
    batch: async (statements: D1PreparedStatement[]) => {
      for (const s of statements) {
        await s.run();
      }
      return [];
    },
    exec: async (query: string) => {
      db.exec(query);
      return { count: 0, duration: 0 };
    },
  } as D1Database;
}
