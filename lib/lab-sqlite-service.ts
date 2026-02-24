import "server-only";

import crypto from "node:crypto";
import { getSqliteDb } from "./sqlite";

export type DashboardOverview = {
  totals: {
    patients: number;
    visits: number;
    tests: number;
    results: number;
  };
  visitStatus: {
    draft: number;
    ready: number;
    verified: number;
    printed: number;
  };
  recentVisits: Array<{
    visitId: string;
    caseNo: string;
    patientName: string;
    status: "draft" | "ready" | "verified" | "printed";
    visitDate: string;
  }>;
};

export type LabPatient = {
  patientId: string;
  fullName: string;
  gender: "Male" | "Female" | "Other" | "Unknown";
  dateOfBirth?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LabVisit = {
  visitId: string;
  patientId: string;
  patientName: string;
  caseNo: string;
  physicianName?: string | null;
  branch?: string | null;
  visitDate: string;
  status: "draft" | "ready" | "verified" | "printed";
  createdAt: string;
  updatedAt: string;
};

export type LabEntryTemplate = Array<{
  departmentId: string;
  department: string;
  panels: Array<{
    panelId: string;
    name: string;
    tests: Array<{
      testId: string;
      code: string;
      displayName: string;
      resultType: "number" | "text" | "select" | "boolean";
      unit: string;
      range: {
        min: number | null;
        max: number | null;
        text: string;
      };
      lastResult: string | null;
    }>;
  }>;
}>;

const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

function asNumberOrNull(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getDashboardOverview(): DashboardOverview {
  const db = getSqliteDb();

  const totals = db
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM patients) AS patients,
        (SELECT COUNT(*) FROM visits) AS visits,
        (SELECT COUNT(*) FROM tests) AS tests,
        (SELECT COUNT(*) FROM results) AS results
    `)
    .get() as {
    patients: number;
    visits: number;
    tests: number;
    results: number;
  };

  const statusRows = db
    .prepare(`
      SELECT status, COUNT(*) AS count
      FROM visits
      GROUP BY status
    `)
    .all() as Array<{ status: string; count: number }>;

  const visitStatus = {
    draft: 0,
    ready: 0,
    verified: 0,
    printed: 0,
  };

  for (const row of statusRows) {
    if (row.status in visitStatus) {
      visitStatus[row.status as keyof typeof visitStatus] = row.count;
    }
  }

  const recentVisits = db
    .prepare(`
      SELECT
        v.visit_id AS visitId,
        v.case_no AS caseNo,
        p.full_name AS patientName,
        v.status AS status,
        v.visit_date AS visitDate
      FROM visits v
      INNER JOIN patients p ON p.patient_id = v.patient_id
      ORDER BY datetime(v.visit_date) DESC
      LIMIT 8
    `)
    .all() as DashboardOverview["recentVisits"];

  return {
    totals,
    visitStatus,
    recentVisits,
  };
}

export function listPatients(limit = 100): LabPatient[] {
  const db = getSqliteDb();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100;
  return db
    .prepare(`
      SELECT
        patient_id AS patientId,
        full_name AS fullName,
        gender,
        date_of_birth AS dateOfBirth,
        phone,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM patients
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `)
    .all(safeLimit) as LabPatient[];
}

export function createPatient(input: {
  fullName: string;
  gender?: "Male" | "Female" | "Other" | "Unknown";
  dateOfBirth?: string | null;
  phone?: string | null;
  notes?: string | null;
}): LabPatient {
  const db = getSqliteDb();
  const patientId = newId("pat");
  const ts = nowIso();

  db.prepare(`
    INSERT INTO patients (
      patient_id, full_name, gender, date_of_birth, phone, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    patientId,
    input.fullName.trim(),
    input.gender || "Unknown",
    input.dateOfBirth || null,
    input.phone || null,
    input.notes || null,
    ts,
    ts
  );

  return (
    db
      .prepare(`
      SELECT
        patient_id AS patientId,
        full_name AS fullName,
        gender,
        date_of_birth AS dateOfBirth,
        phone,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM patients
      WHERE patient_id = ?
    `)
      .get(patientId) as LabPatient
  );
}

function generateCaseNo() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `CASE-${stamp}-${suffix}`;
}

export function listVisits(limit = 100): LabVisit[] {
  const db = getSqliteDb();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100;
  return db
    .prepare(`
      SELECT
        v.visit_id AS visitId,
        v.patient_id AS patientId,
        p.full_name AS patientName,
        v.case_no AS caseNo,
        v.physician_name AS physicianName,
        v.branch AS branch,
        v.visit_date AS visitDate,
        v.status AS status,
        v.created_at AS createdAt,
        v.updated_at AS updatedAt
      FROM visits v
      INNER JOIN patients p ON p.patient_id = v.patient_id
      ORDER BY datetime(v.visit_date) DESC
      LIMIT ?
    `)
    .all(safeLimit) as LabVisit[];
}

export function createVisit(input: {
  patientId: string;
  caseNo?: string;
  physicianName?: string | null;
  branch?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}): LabVisit {
  const db = getSqliteDb();
  const visitId = newId("vis");
  const ts = nowIso();
  const caseNo = input.caseNo?.trim() || generateCaseNo();

  const patientExists = db
    .prepare(`SELECT 1 FROM patients WHERE patient_id = ? LIMIT 1`)
    .get(input.patientId);
  if (!patientExists) {
    throw new Error("Patient not found");
  }

  db.prepare(`
    INSERT INTO visits (
      visit_id, patient_id, case_no, physician_name, branch, visit_date, status,
      created_by, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)
  `).run(
    visitId,
    input.patientId,
    caseNo,
    input.physicianName || null,
    input.branch || null,
    ts,
    input.createdBy || null,
    input.notes || null,
    ts,
    ts
  );

  return (
    db
      .prepare(`
      SELECT
        v.visit_id AS visitId,
        v.patient_id AS patientId,
        p.full_name AS patientName,
        v.case_no AS caseNo,
        v.physician_name AS physicianName,
        v.branch AS branch,
        v.visit_date AS visitDate,
        v.status AS status,
        v.created_at AS createdAt,
        v.updated_at AS updatedAt
      FROM visits v
      INNER JOIN patients p ON p.patient_id = v.patient_id
      WHERE v.visit_id = ?
      LIMIT 1
    `)
      .get(visitId) as LabVisit
  );
}

export function getLabEntryTemplate(patientId?: string): LabEntryTemplate {
  const db = getSqliteDb();

  const departments = db
    .prepare(
      `SELECT department_id AS departmentId, name, ordering
       FROM departments
       WHERE active = 1
       ORDER BY ordering ASC, name ASC`
    )
    .all() as Array<{ departmentId: string; name: string; ordering: number }>;

  const panels = db
    .prepare(
      `SELECT panel_id AS panelId, department_id AS departmentId, name, ordering
       FROM panels
       WHERE active = 1
       ORDER BY ordering ASC, name ASC`
    )
    .all() as Array<{
      panelId: string;
      departmentId: string;
      name: string;
      ordering: number;
    }>;

  const tests = db
    .prepare(
      `SELECT
        t.test_id AS testId,
        t.panel_id AS panelId,
        t.test_code AS code,
        t.display_name AS displayName,
        t.result_type AS resultType,
        COALESCE(t.default_unit, '') AS defaultUnit,
        t.print_order AS printOrder,
        rr.range_text AS rangeText,
        rr.normal_low AS rangeMin,
        rr.normal_high AS rangeMax,
        (
          SELECT r2.value
          FROM results r2
          INNER JOIN visits v2 ON v2.visit_id = r2.visit_id
          WHERE v2.patient_id = ? AND r2.test_id = t.test_id
            AND r2.value IS NOT NULL AND trim(r2.value) <> ''
          ORDER BY datetime(v2.visit_date) DESC, datetime(r2.updated_at) DESC
          LIMIT 1
        ) AS lastResult
       FROM tests t
       LEFT JOIN reference_ranges rr ON rr.test_id = t.test_id
         AND rr.gender = 'Any' AND rr.age_min IS NULL AND rr.age_max IS NULL
       WHERE t.active = 1
       ORDER BY t.print_order ASC, t.display_name ASC`
    )
    .all(patientId || "") as Array<{
    testId: string;
    panelId: string;
    code: string;
    displayName: string;
    resultType: "number" | "text" | "select" | "boolean";
    defaultUnit: string;
    printOrder: number;
    rangeText: string | null;
    rangeMin: number | null;
    rangeMax: number | null;
    lastResult: string | null;
  }>;

  return departments
    .map((department) => {
      const departmentPanels = panels
        .filter((p) => p.departmentId === department.departmentId)
        .map((panel) => {
          const panelTests = tests
            .filter((t) => t.panelId === panel.panelId)
            .map((test) => ({
              testId: test.testId,
              code: test.code,
              displayName: test.displayName,
              resultType: test.resultType,
              unit: test.defaultUnit || "",
              range: {
                min: asNumberOrNull(test.rangeMin),
                max: asNumberOrNull(test.rangeMax),
                text: test.rangeText || "",
              },
              lastResult: test.lastResult || null,
            }));

          return {
            panelId: panel.panelId,
            name: panel.name,
            tests: panelTests,
          };
        })
        .filter((panel) => panel.tests.length > 0);

      return {
        departmentId: department.departmentId,
        department: department.name,
        panels: departmentPanels,
      };
    })
    .filter((department) => department.panels.length > 0);
}

export function saveVisitResults(input: {
  visitId: string;
  entries: Array<{
    testId: string;
    value: string;
    unit?: string | null;
  }>;
  enteredBy?: string | null;
}) {
  const db = getSqliteDb();

  const visit = db
    .prepare(`SELECT status FROM visits WHERE visit_id = ? LIMIT 1`)
    .get(input.visitId) as { status: string } | undefined;
  if (!visit) throw new Error("Visit not found");
  if (visit.status === "verified" || visit.status === "printed") {
    throw new Error("Visit is locked. Only draft/ready visits can be edited.");
  }

  const ts = nowIso();

  db.exec("BEGIN IMMEDIATE;");
  try {
    const upsertResult = db.prepare(`
      INSERT INTO results (
        result_id, visit_id, test_id, value, unit, range_snapshot, abnormal_flag,
        entered_by, entered_at, updated_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(visit_id, test_id) DO UPDATE SET
        value = excluded.value,
        unit = excluded.unit,
        range_snapshot = excluded.range_snapshot,
        abnormal_flag = excluded.abnormal_flag,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    `);

    const deleteResult = db.prepare(`
      DELETE FROM results
      WHERE visit_id = ? AND test_id = ?
    `);

    for (const entry of input.entries) {
      const value = String(entry.value ?? "").trim();
      if (!entry.testId) continue;

      if (!value) {
        deleteResult.run(input.visitId, entry.testId);
        continue;
      }

      const testMeta = db
        .prepare(
          `SELECT t.default_unit AS defaultUnit, rr.range_text AS rangeText,
                  rr.normal_low AS normalLow, rr.normal_high AS normalHigh
           FROM tests t
           LEFT JOIN reference_ranges rr ON rr.test_id = t.test_id
             AND rr.gender = 'Any' AND rr.age_min IS NULL AND rr.age_max IS NULL
           WHERE t.test_id = ?
           LIMIT 1`
        )
        .get(entry.testId) as
        | {
            defaultUnit: string | null;
            rangeText: string | null;
            normalLow: number | null;
            normalHigh: number | null;
          }
        | undefined;

      const numericValue = Number(value);
      const isNumeric = Number.isFinite(numericValue);
      let abnormalFlag: string | null = null;
      if (isNumeric) {
        const low = asNumberOrNull(testMeta?.normalLow);
        const high = asNumberOrNull(testMeta?.normalHigh);
        if (low !== null && numericValue < low) abnormalFlag = "Low";
        if (high !== null && numericValue > high) abnormalFlag = "High";
        if (!abnormalFlag) abnormalFlag = "Normal";
      }

      upsertResult.run(
        newId("res"),
        input.visitId,
        entry.testId,
        value,
        (entry.unit || testMeta?.defaultUnit || "").trim() || null,
        testMeta?.rangeText || null,
        abnormalFlag,
        input.enteredBy || null,
        ts,
        input.enteredBy || null,
        ts
      );
    }

    db.prepare(`UPDATE visits SET updated_at = ? WHERE visit_id = ?`).run(
      ts,
      input.visitId
    );

    db.exec("COMMIT;");
    return { ok: true };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}
