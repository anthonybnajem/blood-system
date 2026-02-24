import "server-only";

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_DB_PATH = "data/app.sqlite";
const DEFAULT_BACKUP_DIR = "data/backups";
const SQLITE_SCHEMA_PATH = path.join(process.cwd(), "sql", "sqlite-schema.sql");
const DEFAULT_AUTO_BACKUP_HOUR = 2;
const DEFAULT_AUTO_BACKUP_MINUTE = 0;
const DEFAULT_AUTO_BACKUP_RETENTION_DAYS = 14;

let sqliteDb: DatabaseSync | null = null;
let autoBackupSchedulerStarted = false;
let autoBackupTimer: NodeJS.Timeout | null = null;
let backupInProgress = false;

function resolveDbPath() {
  const configuredPath = process.env.SQLITE_DB_PATH?.trim() || DEFAULT_DB_PATH;
  const absolutePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
  const directory = path.dirname(absolutePath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  return absolutePath;
}

export function getSqliteDbPath() {
  return resolveDbPath();
}

function resolveBackupDirPath() {
  const configuredPath = process.env.SQLITE_BACKUP_DIR?.trim() || DEFAULT_BACKUP_DIR;
  const absolutePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
  if (!fs.existsSync(absolutePath)) {
    fs.mkdirSync(absolutePath, { recursive: true });
  }
  return absolutePath;
}

function parseIntegerEnv(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
) {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function applyConnectionPragmas(db: DatabaseSync) {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA temp_store = MEMORY;");
}

function applySchema(db: DatabaseSync) {
  if (!fs.existsSync(SQLITE_SCHEMA_PATH)) {
    throw new Error(`SQLite schema file is missing: ${SQLITE_SCHEMA_PATH}`);
  }
  const schemaSql = fs.readFileSync(SQLITE_SCHEMA_PATH, "utf8");
  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec(schemaSql);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function ensureReferenceRangeColumns(db: DatabaseSync) {
  const existingColumns = new Set(
    (
      db.prepare(`PRAGMA table_info(reference_ranges)`).all() as Array<{
        name: string;
      }>
    ).map((c) => c.name)
  );

  if (!existingColumns.has("normal_low")) {
    db.exec("ALTER TABLE reference_ranges ADD COLUMN normal_low REAL;");
  }
  if (!existingColumns.has("normal_high")) {
    db.exec("ALTER TABLE reference_ranges ADD COLUMN normal_high REAL;");
  }
}

function withWriteLockAndCheckpoint<T>(db: DatabaseSync, action: () => T) {
  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    const result = action();
    db.exec("COMMIT;");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // Ignore rollback failures and rethrow original error.
    }
    throw error;
  }
}

function withBackupLock<T>(action: () => T) {
  if (backupInProgress) {
    throw new Error("SQLite backup is already in progress");
  }
  backupInProgress = true;
  try {
    return action();
  } finally {
    backupInProgress = false;
  }
}

function buildBackupFilePath() {
  const backupDir = resolveBackupDirPath();
  const dbPath = resolveDbPath();
  const extension = path.extname(dbPath) || ".sqlite";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(backupDir, `sqlite-backup-${timestamp}${extension}`);
}

function pruneOldBackups() {
  const retentionDays = parseIntegerEnv(
    process.env.SQLITE_BACKUP_RETENTION_DAYS,
    DEFAULT_AUTO_BACKUP_RETENTION_DAYS,
    1,
    3650
  );
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const backupDir = resolveBackupDirPath();
  const entries = fs.readdirSync(backupDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.startsWith("sqlite-backup-")) {
      continue;
    }
    const backupPath = path.join(backupDir, entry.name);
    const stat = fs.statSync(backupPath);
    if (stat.mtimeMs < cutoffTime) {
      fs.unlinkSync(backupPath);
    }
  }
}

function runDailyAutoBackup() {
  try {
    createSqliteBackupFile();
    pruneOldBackups();
  } catch (error) {
    console.error("SQLite auto-backup failed:", error);
  }
}

function scheduleNextAutoBackup() {
  if (process.env.SQLITE_AUTO_BACKUP_DISABLED === "1") {
    return;
  }

  const hour = parseIntegerEnv(
    process.env.SQLITE_AUTO_BACKUP_HOUR,
    DEFAULT_AUTO_BACKUP_HOUR,
    0,
    23
  );
  const minute = parseIntegerEnv(
    process.env.SQLITE_AUTO_BACKUP_MINUTE,
    DEFAULT_AUTO_BACKUP_MINUTE,
    0,
    59
  );

  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  const delayMs = next.getTime() - now.getTime();
  autoBackupTimer = setTimeout(() => {
    runDailyAutoBackup();
    scheduleNextAutoBackup();
  }, delayMs);
  autoBackupTimer.unref?.();
}

function startAutoBackupScheduler() {
  if (autoBackupSchedulerStarted) {
    return;
  }
  autoBackupSchedulerStarted = true;
  scheduleNextAutoBackup();
}

export function getSqliteDb() {
  if (!sqliteDb) {
    sqliteDb = new DatabaseSync(resolveDbPath());
    applyConnectionPragmas(sqliteDb);
    applySchema(sqliteDb);
    ensureReferenceRangeColumns(sqliteDb);
  }

  startAutoBackupScheduler();

  return sqliteDb;
}

export function closeSqliteDb() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
}

export function readSqliteBackupBytes() {
  return withBackupLock(() => {
    const db = getSqliteDb();
    const dbPath = resolveDbPath();
    return withWriteLockAndCheckpoint(db, () => fs.readFileSync(dbPath));
  });
}

export function createSqliteBackupFile(destinationPath?: string) {
  return withBackupLock(() => {
    const db = getSqliteDb();
    const dbPath = resolveDbPath();
    const backupPath = destinationPath || buildBackupFilePath();
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    withWriteLockAndCheckpoint(db, () => {
      fs.copyFileSync(dbPath, backupPath);
    });
    return backupPath;
  });
}
