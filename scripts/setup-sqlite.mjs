#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_DB_PATH = "data/app.sqlite";
const schemaPathConfig = (process.env.SQLITE_SCHEMA_PATH || "sql/sqlite-schema.sql").trim();
const SQLITE_SCHEMA_PATH = path.isAbsolute(schemaPathConfig)
  ? schemaPathConfig
  : path.join(process.cwd(), schemaPathConfig);
const dbPathConfig = (process.env.SQLITE_DB_PATH || DEFAULT_DB_PATH).trim();
const dbPath = path.isAbsolute(dbPathConfig)
  ? dbPathConfig
  : path.join(process.cwd(), dbPathConfig);

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const now = new Date().toISOString();
const defaults = [
  {
    id: "emp_admin",
    name: "Starter Admin",
    email: "admin@starter.local",
    role: "admin",
    passwordHash: "$2b$10$sFsZYror4KSMxndRAArUYOMudyMx8q5ZSnbMPmytpXT1PS9P9wQDC",
  },
  {
    id: "emp_manager",
    name: "Starter Manager",
    email: "manager@starter.local",
    role: "manager",
    passwordHash: "$2b$10$wHXFPnwnPv927fKL.nmJBOSALqHmoB37u/jW3UDNWFn.FTqCDNrC2",
  },
  {
    id: "emp_staff",
    name: "Starter Staff",
    email: "staff@starter.local",
    role: "staff",
    passwordHash: "$2b$10$z45AEDTj1pkz9xOZ/KLyKeoBhzrd.HbWGdHYMFDvZ7O7tk2C3PafO",
  },
];

const db = new DatabaseSync(dbPath);

try {
  if (!fs.existsSync(SQLITE_SCHEMA_PATH)) {
    throw new Error(`Missing SQLite schema file: ${SQLITE_SCHEMA_PATH}`);
  }
  const schemaSql = fs.readFileSync(SQLITE_SCHEMA_PATH, "utf8");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("BEGIN IMMEDIATE;");
  db.exec(schemaSql);
  const cols = db
    .prepare("PRAGMA table_info(reference_ranges)")
    .all()
    .map((r) => r.name);
  if (!cols.includes("normal_low")) {
    db.exec("ALTER TABLE reference_ranges ADD COLUMN normal_low REAL;");
  }
  if (!cols.includes("normal_high")) {
    db.exec("ALTER TABLE reference_ranges ADD COLUMN normal_high REAL;");
  }
  db.exec("COMMIT;");

  const insertStatement = db.prepare(`
    INSERT INTO employees (
      id, name, email, role, password_hash, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      password_hash = excluded.password_hash,
      is_active = 1,
      updated_at = excluded.updated_at
  `);

  const userInsertStatement = db.prepare(`
    INSERT INTO users (
      user_id, full_name, username, email, password_hash, role, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      full_name = excluded.full_name,
      email = excluded.email,
      password_hash = excluded.password_hash,
      role = excluded.role,
      active = 1,
      updated_at = excluded.updated_at
  `);

  const departmentInsert = db.prepare(`
    INSERT INTO departments (department_id, name, ordering, active, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      ordering = excluded.ordering,
      active = 1,
      updated_at = excluded.updated_at
  `);

  const toLabRole = (role) => {
    if (role === "admin") return "admin";
    if (role === "manager") return "reviewer";
    return "lab";
  };

  for (const employee of defaults) {
    insertStatement.run(
      employee.id,
      employee.name,
      employee.email,
      employee.role,
      employee.passwordHash,
      now,
      now
    );

    userInsertStatement.run(
      `usr_${employee.id}`,
      employee.name,
      employee.email.split("@")[0],
      employee.email,
      employee.passwordHash,
      toLabRole(employee.role),
      now,
      now
    );
  }

  const defaultDepartments = [
    "Hematology",
    "Biochimie",
    "Endocrine",
    "Urine",
    "Stool",
    "Culture",
    "Culture+ATB",
  ];

  for (let i = 0; i < defaultDepartments.length; i += 1) {
    departmentInsert.run(
      `dept_${i + 1}`,
      defaultDepartments[i],
      i + 1,
      now,
      now
    );
  }

  console.log(`SQLite setup complete: ${dbPath}`);
  console.log("Seeded auth users: admin@starter.local, manager@starter.local, staff@starter.local");
  console.log("Seeded lab users table and default departments.");
} finally {
  db.close();
}
