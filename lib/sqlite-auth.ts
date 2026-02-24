import "server-only";

import { getSqliteDb } from "./sqlite";

export type SqliteEmployeeAuthRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordHash: string;
  isActive: boolean;
};

export function findEmployeeForAuthByEmail(
  email: string
): SqliteEmployeeAuthRecord | null {
  const db = getSqliteDb();
  const statement = db.prepare(`
    SELECT id, name, email, role, password_hash, is_active
    FROM employees
    WHERE lower(email) = lower(?)
    LIMIT 1
  `);

  const row = statement.get(email) as
    | {
        id: string;
        name: string;
        email: string;
        role: string;
        password_hash: string;
        is_active: number;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    isActive: row.is_active === 1,
  };
}
