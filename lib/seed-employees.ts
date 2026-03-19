/**
 * Seed starter users for authentication.
 */

import { getDB, employeesApi, initializeDatabase } from "./db";
import { hashPassword } from "./auth-utils";
import type { Employee } from "./db";

export const TEST_EMPLOYEES = [
  {
    name: "Admin User",
    email: "admin@lab.local",
    password: "admin123",
    role: "admin" as const,
    isActive: true,
    hireDate: new Date("2026-01-01"),
    notes: "Starter admin account",
  },
  {
    name: "Manager User",
    email: "manager@lab.local",
    password: "manager123",
    role: "manager" as const,
    isActive: true,
    hireDate: new Date("2026-01-01"),
    notes: "Starter manager account",
  },
  {
    name: "Staff User",
    email: "staff@lab.local",
    password: "staff123",
    role: "staff" as const,
    isActive: true,
    hireDate: new Date("2026-01-01"),
    notes: "Starter staff account",
  },
];

export async function seedEmployees(): Promise<void> {
  try {
    let db;
    try {
      db = getDB();
      if (!db || !db.isOpen()) throw new Error("Database not open");
    } catch {
      const initialized = await initializeDatabase();
      if (!initialized) throw new Error("Database initialization failed");
      await new Promise((resolve) => setTimeout(resolve, 300));
      db = getDB();
      if (!db || !db.isOpen()) throw new Error("Database not open");
    }

    const existingEmployees = await employeesApi.getAll();

    for (const testEmployee of TEST_EMPLOYEES) {
      const exists = existingEmployees.some((e) => e.email === testEmployee.email);
      if (exists) continue;

      const hashedPassword = await hashPassword(testEmployee.password);
      const employee: Employee = {
        id: crypto.randomUUID(),
        name: testEmployee.name,
        email: testEmployee.email,
        role: testEmployee.role,
        isActive: testEmployee.isActive,
        hireDate: testEmployee.hireDate,
        password: hashedPassword,
        notes: testEmployee.notes,
      };

      await employeesApi.add(employee);
    }
  } catch (error) {
    console.error("Failed to seed employees:", error);
    throw error;
  }
}
