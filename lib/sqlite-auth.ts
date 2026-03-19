import "server-only";

import { getSqliteDb } from "./sqlite";

export type SqliteEmployeeAuthRecord = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  passwordHash: string;
  isActive: boolean;
};

export function findEmployeeForAuth(
  login: string
): SqliteEmployeeAuthRecord | null {
  const db = getSqliteDb();
  const normalizedLogin = String(login || "").trim().toLowerCase();
  const statement = db.prepare(`
    SELECT id, name, email, role, password_hash, is_active
    FROM employees
    WHERE lower(email) = ?
       OR lower(
            CASE
              WHEN instr(email, '@') > 0 THEN substr(email, 1, instr(email, '@') - 1)
              ELSE email
            END
          ) = ?
    LIMIT 1
  `);

  const row = statement.get(normalizedLogin, normalizedLogin) as
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
    username: row.email.includes("@") ? row.email.split("@")[0]! : row.email,
    role: row.role,
    passwordHash: row.password_hash,
    isActive: row.is_active === 1,
  };
}
