import "server-only";

import crypto from "node:crypto";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { getSqliteDb } from "./sqlite";
import { buildPrintableReportHtml } from "./lab-print-report";

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
    patientId: string;
    caseNo: string;
    patientName: string;
    status: "draft" | "ready" | "verified" | "printed";
    visitDate: string;
  }>;
};

export type LabPatient = {
  patientId: string;
  fullName: string;
  firstName?: string | null;
  fatherName?: string | null;
  lastName?: string | null;
  gender: "Male" | "Female" | "Other" | "Unknown";
  dateOfBirth?: string | null;
  phone?: string | null;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LabVisit = {
  visitId: string;
  patientId: string;
  patientName: string;
  patientReportCount: number;
  caseNo: string;
  physicianName?: string | null;
  branch?: string | null;
  visitDate: string;
  status: "draft" | "ready" | "verified" | "printed";
  createdAt: string;
  updatedAt: string;
};

export type PatientVisitHistoryItem = {
  visitId: string;
  caseNo: string;
  physicianName?: string | null;
  branch?: string | null;
  visitDate: string;
  status: "draft" | "ready" | "verified" | "printed";
  resultCount: number;
  printCount: number;
  printedAt?: string | null;
  updatedAt: string;
};

export type PatientReportActivityItem = {
  auditId: string;
  visitId: string;
  caseNo: string;
  action: "create" | "update" | "delete" | "unlock" | "verify" | "print";
  actorName?: string | null;
  timestamp: string;
  status?: string | null;
  reason?: string | null;
};

export type RecentResultItem = {
  resultId: string;
  visitId: string;
  patientId: string;
  patientName: string;
  caseNo: string;
  testName: string;
  testCode: string;
  value: string;
  unit?: string | null;
  abnormalFlag?: string | null;
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

export type PrintableLabReport = {
  visitId: string;
  caseNo: string;
  visitDate: string;
  physicianName?: string | null;
  branch?: string | null;
  labInfo: {
    headerImageUrl: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    headerText: string;
    footerText: string;
  };
  patient: {
    patientId: string;
    fullName: string;
    gender: "Male" | "Female" | "Other" | "Unknown";
    dateOfBirth?: string | null;
    phone?: string | null;
    location?: string | null;
  };
  settings: {
    showLastResult: boolean;
    noRangePlaceholder: string;
  };
  printMeta: {
    printCount: number;
    printedAt?: string | null;
  };
  departments: Array<{
    departmentId: string;
    department: string;
    panels: Array<{
      panelId: string;
      name: string;
      tests: Array<{
        testId: string;
        code: string;
        displayName: string;
        value: string;
        unit: string;
        rangeText: string;
        lastResult: string | null;
        abnormalFlag: string | null;
      }>;
    }>;
  }>;
};

export type DemoLabSeedSummary = {
  patients: number;
  visits: number;
  results: number;
  testsUsed: number;
};

export type LabSystemExport = {
  version: "blood-system-export-v1";
  exportDate: string;
  summary: {
    employees: number;
    patients: number;
    visits: number;
    results: number;
    tests: number;
  };
  tables: {
    employees: Array<Record<string, unknown>>;
    users: Array<Record<string, unknown>>;
    departments: Array<Record<string, unknown>>;
    panels: Array<Record<string, unknown>>;
    tests: Array<Record<string, unknown>>;
    reference_ranges: Array<Record<string, unknown>>;
    report_settings: Array<Record<string, unknown>>;
    patients: Array<Record<string, unknown>>;
    visits: Array<Record<string, unknown>>;
    results: Array<Record<string, unknown>>;
    audit_log: Array<Record<string, unknown>>;
  };
};

const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const LAB_SYSTEM_EXPORT_VERSION = "blood-system-export-v1" as const;

function sanitizeFileSegment(value: string) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "item";
}

function buildLabSystemWorkbook(exportData: LabSystemExport) {
  const workbook = XLSX.utils.book_new();

  for (const [sheetName, rows] of Object.entries(exportData.tables)) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeFileSegment(sheetName).slice(0, 31));
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function writeAuditLog(
  db: ReturnType<typeof getSqliteDb>,
  input: {
    entityType: string;
    entityId: string;
    action: "create" | "update" | "delete" | "unlock" | "verify" | "print";
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    userId?: string | null;
    reason?: string | null;
    timestamp?: string;
  }
) {
  db.prepare(
    `INSERT INTO audit_log (
      audit_id, entity_type, entity_id, action, before_json, after_json, user_id, "timestamp", reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId("audit"),
    input.entityType,
    input.entityId,
    input.action,
    input.before ? JSON.stringify(input.before) : null,
    input.after ? JSON.stringify(input.after) : null,
    input.userId || null,
    input.timestamp || nowIso(),
    input.reason || null
  );
}

const LAB_SYSTEM_TABLE_COLUMNS = {
  employees: [
    "id",
    "name",
    "email",
    "role",
    "password_hash",
    "is_active",
    "created_at",
    "updated_at",
  ],
  users: [
    "user_id",
    "full_name",
    "username",
    "email",
    "password_hash",
    "role",
    "active",
    "created_at",
    "updated_at",
  ],
  departments: [
    "department_id",
    "name",
    "ordering",
    "active",
    "created_at",
    "updated_at",
  ],
  panels: [
    "panel_id",
    "department_id",
    "name",
    "ordering",
    "print_if_empty",
    "active",
    "created_at",
    "updated_at",
  ],
  tests: [
    "test_id",
    "panel_id",
    "test_code",
    "display_name",
    "result_type",
    "allowed_values",
    "default_unit",
    "decimal_precision",
    "print_order",
    "active",
    "created_at",
    "updated_at",
  ],
  reference_ranges: [
    "range_id",
    "test_id",
    "gender",
    "age_min",
    "age_max",
    "unit",
    "range_text",
    "normal_low",
    "normal_high",
    "critical_low",
    "critical_high",
    "notes",
    "created_at",
    "updated_at",
  ],
  report_settings: [
    "id",
    "show_last_result",
    "no_range_placeholder",
    "hide_empty_rows",
    "hide_empty_panels",
    "hide_empty_departments",
    "updated_at",
  ],
  patients: [
    "patient_id",
    "full_name",
    "first_name",
    "father_name",
    "last_name",
    "gender",
    "date_of_birth",
    "phone",
    "location",
    "notes",
    "created_at",
    "updated_at",
  ],
  visits: [
    "visit_id",
    "patient_id",
    "case_no",
    "physician_name",
    "branch",
    "visit_date",
    "status",
    "created_by",
    "verified_by",
    "verified_at",
    "printed_at",
    "notes",
    "created_at",
    "updated_at",
  ],
  results: [
    "result_id",
    "visit_id",
    "test_id",
    "value",
    "unit",
    "range_snapshot",
    "abnormal_flag",
    "entered_by",
    "entered_at",
    "updated_by",
    "updated_at",
  ],
  audit_log: [
    "audit_id",
    "entity_type",
    "entity_id",
    "action",
    "before_json",
    "after_json",
    "user_id",
    "timestamp",
    "reason",
  ],
} as const;

type LabSystemTableName = keyof typeof LAB_SYSTEM_TABLE_COLUMNS;

function asNumberOrNull(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeNamePart(value?: string | null) {
  return String(value || "").trim();
}

function buildPatientFullName(input: {
  fullName?: string | null;
  firstName?: string | null;
  fatherName?: string | null;
  lastName?: string | null;
}) {
  const parts = [
    normalizeNamePart(input.firstName),
    normalizeNamePart(input.fatherName),
    normalizeNamePart(input.lastName),
  ].filter(Boolean);
  return parts.join(" ").trim() || normalizeNamePart(input.fullName);
}

function randomInteger(min: number, max: number) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function pickRandom<T>(items: T[]): T {
  return items[randomInteger(0, items.length - 1)] as T;
}

function shiftIsoDate(baseIso: string, daysOffset: number) {
  const date = new Date(baseIso);
  date.setUTCDate(date.getUTCDate() + daysOffset);
  return date.toISOString();
}

function parseAllowedValues(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function listTableRows(table: LabSystemTableName) {
  const db = getSqliteDb();
  return db.prepare(`SELECT * FROM ${table}`).all() as Array<Record<string, unknown>>;
}

function insertRows(table: LabSystemTableName, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return;
  }

  const db = getSqliteDb();
  const columns = LAB_SYSTEM_TABLE_COLUMNS[table];
  const placeholders = columns.map(() => "?").join(", ");
  const statement = db.prepare(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
  );

  for (const row of rows) {
    const values = columns.map((column) => {
      const value = row[column];
      return value === undefined ? null : value;
    });
    statement.run(...(values as any[]));
  }
}

function buildNumericResult(low: number | null, high: number | null) {
  if (low !== null && high !== null && high > low) {
    const span = high - low;
    const mode = Math.random();

    if (mode < 0.12) {
      return {
        value: (low - span * (0.08 + Math.random() * 0.22)).toFixed(2),
        abnormalFlag: "Low" as const,
      };
    }

    if (mode > 0.88) {
      return {
        value: (high + span * (0.08 + Math.random() * 0.22)).toFixed(2),
        abnormalFlag: "High" as const,
      };
    }

    return {
      value: (low + span * (0.12 + Math.random() * 0.76)).toFixed(2),
      abnormalFlag: "Normal" as const,
    };
  }

  return {
    value: String(randomInteger(5, 180)),
    abnormalFlag: null,
  };
}

function buildSeedResultValue(test: {
  resultType: "number" | "text" | "select" | "boolean";
  allowedValues: string | null;
  normalLow: number | null;
  normalHigh: number | null;
}) {
  if (test.resultType === "number") {
    return buildNumericResult(
      asNumberOrNull(test.normalLow),
      asNumberOrNull(test.normalHigh)
    );
  }

  if (test.resultType === "boolean") {
    return {
      value: Math.random() > 0.2 ? "Negative" : "Positive",
      abnormalFlag: null,
    };
  }

  if (test.resultType === "select") {
    const values = parseAllowedValues(test.allowedValues);
    return {
      value: values.length > 0 ? pickRandom(values) : pickRandom(["Normal", "Borderline", "High"]),
      abnormalFlag: null,
    };
  }

  return {
    value: pickRandom(["Normal", "Clear", "Reactive", "Non Reactive", "Trace"]),
    abnormalFlag: null,
  };
}

function ensureDemoCatalogSeed() {
  const db = getSqliteDb();
  const existing = db
    .prepare(`SELECT COUNT(*) AS count FROM tests WHERE active = 1`)
    .get() as { count: number };

  if (existing.count > 0) {
    return;
  }

  const now = nowIso();
  const departmentInsert = db.prepare(`
    INSERT INTO departments (
      department_id, name, ordering, active, created_at, updated_at
    ) VALUES (?, ?, ?, 1, ?, ?)
  `);
  const panelInsert = db.prepare(`
    INSERT INTO panels (
      panel_id, department_id, name, ordering, print_if_empty, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0, 1, ?, ?)
  `);
  const testInsert = db.prepare(`
    INSERT INTO tests (
      test_id, panel_id, test_code, display_name, result_type, allowed_values,
      default_unit, decimal_precision, print_order, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 2, ?, 1, ?, ?)
  `);
  const rangeInsert = db.prepare(`
    INSERT INTO reference_ranges (
      range_id, test_id, gender, age_min, age_max, unit, range_text,
      normal_low, normal_high, critical_low, critical_high, notes, created_at, updated_at
    ) VALUES (?, ?, 'Any', NULL, NULL, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
  `);

  const catalog = [
    {
      department: "Biochemistry",
      panels: [
        {
          name: "Metabolic Panel",
          tests: [
            { code: "GLU", name: "Glucose", unit: "g/L", low: 0.7, high: 1.1, rangeText: "0.7 - 1.1" },
            { code: "CREA", name: "Creatinine", unit: "mg/L", low: 6, high: 11, rangeText: "6 - 11" },
            { code: "UREA", name: "Urea", unit: "g/L", low: 0.15, high: 0.45, rangeText: "0.15 - 0.45" },
          ],
        },
        {
          name: "Lipid Panel",
          tests: [
            { code: "CHOL", name: "Total Cholesterol", unit: "g/L", low: 0, high: 2, rangeText: "< 2" },
            { code: "TRIG", name: "Triglycerides", unit: "g/L", low: 0.5, high: 1.5, rangeText: "0.5 - 1.5" },
            { code: "HDL", name: "HDL Cholesterol", unit: "g/L", low: 0.4, high: 0.7, rangeText: "0.4 - 0.7" },
          ],
        },
      ],
    },
    {
      department: "Hematology",
      panels: [
        {
          name: "CBC",
          tests: [
            { code: "HGB", name: "Hemoglobin", unit: "g/dL", low: 12, high: 16, rangeText: "12 - 16" },
            { code: "WBC", name: "White Blood Cells", unit: "10^3/uL", low: 4, high: 10, rangeText: "4 - 10" },
            { code: "PLT", name: "Platelets", unit: "10^3/uL", low: 150, high: 450, rangeText: "150 - 450" },
          ],
        },
      ],
    },
    {
      department: "Endocrinology",
      panels: [
        {
          name: "Thyroid Panel",
          tests: [
            { code: "TSH", name: "TSH us", unit: "micIU/ml", low: 0.27, high: 4.2, rangeText: "0.27 - 4.2" },
            { code: "FT4", name: "Free T4", unit: "ng/dL", low: 0.8, high: 1.9, rangeText: "0.8 - 1.9" },
          ],
        },
      ],
    },
  ];

  db.exec("BEGIN IMMEDIATE;");
  try {
    catalog.forEach((department, departmentIndex) => {
      const departmentId = newId("dept");
      departmentInsert.run(departmentId, department.department, departmentIndex + 1, now, now);

      department.panels.forEach((panel, panelIndex) => {
        const panelId = newId("panel");
        panelInsert.run(panelId, departmentId, panel.name, panelIndex + 1, now, now);

        panel.tests.forEach((test, testIndex) => {
          const testId = newId("test");
          testInsert.run(
            testId,
            panelId,
            test.code,
            test.name,
            "number",
            null,
            test.unit,
            testIndex + 1,
            now,
            now
          );
          rangeInsert.run(
            newId("range"),
            testId,
            test.unit,
            test.rangeText,
            test.low,
            test.high,
            "Auto-generated demo catalog",
            now,
            now
          );
        });
      });
    });

    db.exec(`
      INSERT OR IGNORE INTO report_settings (
        id, show_last_result, no_range_placeholder, hide_empty_rows,
        hide_empty_panels, hide_empty_departments, updated_at
      ) VALUES (1, 1, '—', 1, 1, 1, '${now}')
    `);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
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
        p.patient_id AS patientId,
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
        first_name AS firstName,
        father_name AS fatherName,
        last_name AS lastName,
        gender,
        date_of_birth AS dateOfBirth,
        phone,
        location,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM patients
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `)
    .all(safeLimit) as LabPatient[];
}

export function getPatientById(patientId: string): LabPatient | null {
  const db = getSqliteDb();
  return (
    (db
      .prepare(`
        SELECT
          patient_id AS patientId,
          full_name AS fullName,
          first_name AS firstName,
          father_name AS fatherName,
          last_name AS lastName,
          gender,
          date_of_birth AS dateOfBirth,
          phone,
          location,
          notes,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM patients
        WHERE patient_id = ?
        LIMIT 1
      `)
      .get(patientId) as LabPatient | undefined) ?? null
  );
}

export function createPatient(input: {
  fullName: string;
  firstName?: string | null;
  fatherName?: string | null;
  lastName?: string | null;
  gender?: "Male" | "Female" | "Other" | "Unknown";
  dateOfBirth?: string | null;
  phone?: string | null;
  location?: string | null;
  notes?: string | null;
}): LabPatient {
  const db = getSqliteDb();
  const patientId = newId("pat");
  const ts = nowIso();
  const fullName = buildPatientFullName(input);

  db.prepare(`
    INSERT INTO patients (
      patient_id, full_name, first_name, father_name, last_name, gender, date_of_birth, phone, location, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    patientId,
    fullName,
    normalizeNamePart(input.firstName) || null,
    normalizeNamePart(input.fatherName) || null,
    normalizeNamePart(input.lastName) || null,
    input.gender || "Unknown",
    input.dateOfBirth || null,
    input.phone || null,
    input.location || null,
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
        first_name AS firstName,
        father_name AS fatherName,
        last_name AS lastName,
        gender,
        date_of_birth AS dateOfBirth,
        phone,
        location,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM patients
      WHERE patient_id = ?
    `)
      .get(patientId) as LabPatient
  );
}

export function updatePatient(input: {
  patientId: string;
  fullName: string;
  firstName?: string | null;
  fatherName?: string | null;
  lastName?: string | null;
  gender?: "Male" | "Female" | "Other" | "Unknown";
  dateOfBirth?: string | null;
  phone?: string | null;
  location?: string | null;
  notes?: string | null;
}): LabPatient {
  const db = getSqliteDb();
  const fullName = buildPatientFullName(input);

  const existing = db
    .prepare(`SELECT 1 FROM patients WHERE patient_id = ? LIMIT 1`)
    .get(input.patientId);

  if (!existing) {
    throw new Error("Patient not found");
  }

  db.prepare(
    `UPDATE patients
     SET full_name = ?, first_name = ?, father_name = ?, last_name = ?, gender = ?, date_of_birth = ?, phone = ?, location = ?, notes = ?
     WHERE patient_id = ?`
  ).run(
    fullName,
    normalizeNamePart(input.firstName) || null,
    normalizeNamePart(input.fatherName) || null,
    normalizeNamePart(input.lastName) || null,
    input.gender || "Unknown",
    input.dateOfBirth || null,
    input.phone || null,
    input.location || null,
    input.notes || null,
    input.patientId
  );

  return (
    db
      .prepare(`
      SELECT
        patient_id AS patientId,
        full_name AS fullName,
        first_name AS firstName,
        father_name AS fatherName,
        last_name AS lastName,
        gender,
        date_of_birth AS dateOfBirth,
        phone,
        location,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM patients
      WHERE patient_id = ?
    `)
      .get(input.patientId) as LabPatient
  );
}

export function findPotentialDuplicatePatients(input: {
  firstName?: string | null;
  fatherName?: string | null;
  lastName?: string | null;
  excludePatientId?: string | null;
  limit?: number;
}): LabPatient[] {
  const db = getSqliteDb();
  const firstName = normalizeNamePart(input.firstName).toLowerCase();
  const fatherName = normalizeNamePart(input.fatherName).toLowerCase();
  const lastName = normalizeNamePart(input.lastName).toLowerCase();
  const limit = Number.isFinite(input.limit) ? Math.min(Math.max(input.limit || 5, 1), 20) : 5;

  if (!firstName || !lastName) {
    return [];
  }

  return db
    .prepare(`
      SELECT
        patient_id AS patientId,
        full_name AS fullName,
        first_name AS firstName,
        father_name AS fatherName,
        last_name AS lastName,
        gender,
        date_of_birth AS dateOfBirth,
        phone,
        location,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM patients
      WHERE lower(COALESCE(first_name, '')) = ?
        AND lower(COALESCE(last_name, '')) = ?
        AND (? = '' OR lower(COALESCE(father_name, '')) = ?)
        AND (? = '' OR patient_id <> ?)
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `)
    .all(
      firstName,
      lastName,
      fatherName,
      fatherName,
      input.excludePatientId || "",
      input.excludePatientId || "",
      limit
    ) as LabPatient[];
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
        (
          SELECT COUNT(*)
          FROM visits pv
          WHERE pv.patient_id = v.patient_id
        ) AS patientReportCount,
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

export function listRecentResults(limit = 100): RecentResultItem[] {
  const db = getSqliteDb();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100;
  return db
    .prepare(`
      SELECT
        r.result_id AS resultId,
        r.visit_id AS visitId,
        v.patient_id AS patientId,
        p.full_name AS patientName,
        v.case_no AS caseNo,
        t.display_name AS testName,
        t.test_code AS testCode,
        r.value AS value,
        r.unit AS unit,
        r.abnormal_flag AS abnormalFlag,
        r.updated_at AS updatedAt
      FROM results r
      INNER JOIN visits v ON v.visit_id = r.visit_id
      INNER JOIN patients p ON p.patient_id = v.patient_id
      INNER JOIN tests t ON t.test_id = r.test_id
      ORDER BY datetime(r.updated_at) DESC, datetime(v.visit_date) DESC
      LIMIT ?
    `)
    .all(safeLimit) as RecentResultItem[];
}

export function listVisitsByPatient(patientId: string, limit = 20): PatientVisitHistoryItem[] {
  const db = getSqliteDb();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
  return db
    .prepare(`
      SELECT
        v.visit_id AS visitId,
        v.case_no AS caseNo,
        v.physician_name AS physicianName,
        v.branch AS branch,
        v.visit_date AS visitDate,
        v.status AS status,
        COUNT(r.result_id) AS resultCount,
        COALESCE(v.print_count, 0) AS printCount,
        v.printed_at AS printedAt,
        v.updated_at AS updatedAt
      FROM visits v
      LEFT JOIN results r ON r.visit_id = v.visit_id
      WHERE v.patient_id = ?
      GROUP BY v.visit_id, v.case_no, v.physician_name, v.branch, v.visit_date, v.status, v.print_count, v.printed_at, v.updated_at
      ORDER BY datetime(v.visit_date) DESC
      LIMIT ?
    `)
    .all(patientId, safeLimit) as PatientVisitHistoryItem[];
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

  writeAuditLog(db, {
    entityType: "visit",
    entityId: visitId,
    action: "create",
    after: {
      visitId,
      patientId: input.patientId,
      caseNo,
      physicianName: input.physicianName || null,
      branch: input.branch || null,
      status: "draft",
      visitDate: ts,
    },
    userId: input.createdBy || null,
    timestamp: ts,
  });

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
    .prepare(
      `SELECT
        visit_id AS visitId,
        patient_id AS patientId,
        case_no AS caseNo,
        status
       FROM visits
       WHERE visit_id = ? LIMIT 1`
    )
    .get(input.visitId) as
    | {
        visitId: string;
        patientId: string;
        caseNo: string;
        status: string;
      }
    | undefined;
  if (!visit) throw new Error("Visit not found");

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

    const nextStatus = visit.status === "verified" || visit.status === "printed" ? "ready" : visit.status;

    if (visit.status === "verified" || visit.status === "printed") {
      db.prepare(
        `UPDATE visits
         SET status = 'ready',
             verified_by = NULL,
             verified_at = NULL,
             updated_at = ?
         WHERE visit_id = ?`
      ).run(ts, input.visitId);
    } else {
      db.prepare(`UPDATE visits SET updated_at = ? WHERE visit_id = ?`).run(
        ts,
        input.visitId
      );
    }

    writeAuditLog(db, {
      entityType: "visit",
      entityId: input.visitId,
      action: "update",
      before: {
        visitId: visit.visitId,
        patientId: visit.patientId,
        caseNo: visit.caseNo,
        status: visit.status,
      },
      after: {
        visitId: visit.visitId,
        patientId: visit.patientId,
        caseNo: visit.caseNo,
        status: nextStatus,
        savedResults: input.entries.filter((entry) => String(entry.value ?? "").trim()).length,
      },
      userId: input.enteredBy || null,
      timestamp: ts,
    });

    db.exec("COMMIT;");
    return { ok: true };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export function updateVisitMetadata(input: {
  visitId: string;
  caseNo: string;
  physicianName?: string | null;
  branch?: string | null;
  visitDate?: string | null;
  updatedBy?: string | null;
}) {
  const db = getSqliteDb();
  const existing = db
    .prepare(
      `SELECT
        visit_id AS visitId,
        patient_id AS patientId,
        case_no AS caseNo,
        physician_name AS physicianName,
        branch,
        visit_date AS visitDate,
        status
       FROM visits
       WHERE visit_id = ?
       LIMIT 1`
    )
    .get(input.visitId) as
    | {
        visitId: string;
        patientId: string;
        caseNo: string;
        physicianName: string | null;
        branch: string | null;
        visitDate: string;
        status: string;
      }
    | undefined;

  if (!existing) throw new Error("Visit not found");

  const nextCaseNo = String(input.caseNo || "").trim();
  if (!nextCaseNo) throw new Error("Case No. is required");

  const duplicate = db
    .prepare(`SELECT visit_id AS visitId FROM visits WHERE case_no = ? AND visit_id <> ? LIMIT 1`)
    .get(nextCaseNo, input.visitId) as { visitId: string } | undefined;
  if (duplicate) throw new Error("Case No. is already used by another report");

  const nextVisitDate = String(input.visitDate || "").trim();
  if (!nextVisitDate || Number.isNaN(new Date(nextVisitDate).getTime())) {
    throw new Error("A valid Date & Time is required");
  }

  const nextPhysicianName = String(input.physicianName || "").trim() || null;
  const nextBranch = String(input.branch || "").trim() || null;
  const ts = nowIso();

  db.prepare(
    `UPDATE visits
     SET case_no = ?,
         physician_name = ?,
         branch = ?,
         visit_date = ?,
         updated_at = ?
     WHERE visit_id = ?`
  ).run(nextCaseNo, nextPhysicianName, nextBranch, nextVisitDate, ts, input.visitId);

  writeAuditLog(db, {
    entityType: "visit",
    entityId: input.visitId,
    action: "update",
    before: {
      visitId: existing.visitId,
      patientId: existing.patientId,
      caseNo: existing.caseNo,
      physicianName: existing.physicianName,
      branch: existing.branch,
      visitDate: existing.visitDate,
      status: existing.status,
    },
    after: {
      visitId: existing.visitId,
      patientId: existing.patientId,
      caseNo: nextCaseNo,
      physicianName: nextPhysicianName,
      branch: nextBranch,
      visitDate: nextVisitDate,
      status: existing.status,
    },
    userId: input.updatedBy || null,
    timestamp: ts,
  });

  return { ok: true };
}

export function getVisitEditorData(visitId: string): {
  visit: LabVisit;
  results: Record<string, string>;
  template: LabEntryTemplate;
} {
  const db = getSqliteDb();
  const visit = db
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
    .get(visitId) as LabVisit | undefined;

  if (!visit) {
    throw new Error("Visit not found");
  }

  const rows = db
    .prepare(`
      SELECT test_id AS testId, COALESCE(value, '') AS value
      FROM results
      WHERE visit_id = ?
    `)
    .all(visitId) as Array<{ testId: string; value: string }>;

  const results = Object.fromEntries(rows.map((row) => [row.testId, row.value]));

  return {
    visit,
    results,
    template: getLabEntryTemplate(visit.patientId),
  };
}

export function getPrintableLabReport(visitId: string): PrintableLabReport {
  const db = getSqliteDb();

  const visit = db
    .prepare(
      `SELECT
        v.visit_id AS visitId,
        v.case_no AS caseNo,
        v.visit_date AS visitDate,
        v.physician_name AS physicianName,
        v.branch AS branch,
        COALESCE(v.print_count, 0) AS printCount,
        v.printed_at AS printedAt,
        p.patient_id AS patientId,
        p.full_name AS fullName,
        p.gender AS gender,
        p.date_of_birth AS dateOfBirth,
        p.phone AS phone,
        p.location AS location
       FROM visits v
       INNER JOIN patients p ON p.patient_id = v.patient_id
       WHERE v.visit_id = ?
       LIMIT 1`
    )
    .get(visitId) as
    | {
        visitId: string;
        caseNo: string;
        visitDate: string;
        physicianName: string | null;
        branch: string | null;
        printCount: number;
        printedAt: string | null;
        patientId: string;
        fullName: string;
        gender: "Male" | "Female" | "Other" | "Unknown";
        dateOfBirth: string | null;
        phone: string | null;
        location: string | null;
      }
    | undefined;

  if (!visit) {
    throw new Error("Visit not found");
  }

  const reportSettings = db
    .prepare(
      `SELECT
        report_header_image_url AS reportHeaderImageUrl,
        lab_name AS labName,
        lab_address AS labAddress,
        lab_phone AS labPhone,
        lab_email AS labEmail,
        report_header_text AS reportHeaderText,
        report_footer_text AS reportFooterText,
        show_last_result AS showLastResult,
        no_range_placeholder AS noRangePlaceholder,
        hide_empty_rows AS hideEmptyRows,
        hide_empty_panels AS hideEmptyPanels,
        hide_empty_departments AS hideEmptyDepartments
       FROM report_settings
       WHERE id = 1`
    )
    .get() as
      | {
        reportHeaderImageUrl: string;
        labName: string;
        labAddress: string;
        labPhone: string;
        labEmail: string;
        reportHeaderText: string;
        reportFooterText: string;
        showLastResult: number;
        noRangePlaceholder: string;
        hideEmptyRows: number;
        hideEmptyPanels: number;
        hideEmptyDepartments: number;
      }
    | undefined;

  const rows = db
    .prepare(
      `SELECT
        d.department_id AS departmentId,
        d.name AS department,
        d.ordering AS departmentOrder,
        p.panel_id AS panelId,
        p.name AS panelName,
        p.ordering AS panelOrder,
        p.print_if_empty AS printIfEmpty,
        t.test_id AS testId,
        t.test_code AS code,
        t.display_name AS displayName,
        t.print_order AS printOrder,
        COALESCE(r.value, '') AS value,
        COALESCE(r.unit, t.default_unit, '') AS unit,
        COALESCE(r.range_snapshot, rr.range_text, '') AS rangeText,
        r.abnormal_flag AS abnormalFlag,
        (
          SELECT r2.value
          FROM results r2
          INNER JOIN visits v2 ON v2.visit_id = r2.visit_id
          WHERE v2.patient_id = v.patient_id
            AND r2.test_id = t.test_id
            AND v2.visit_id <> v.visit_id
            AND r2.value IS NOT NULL
            AND trim(r2.value) <> ''
          ORDER BY datetime(v2.visit_date) DESC, datetime(r2.updated_at) DESC
          LIMIT 1
        ) AS lastResult
       FROM visits v
       INNER JOIN panels p ON p.active = 1
       INNER JOIN departments d ON d.department_id = p.department_id AND d.active = 1
       INNER JOIN tests t ON t.panel_id = p.panel_id AND t.active = 1
       LEFT JOIN results r ON r.visit_id = v.visit_id AND r.test_id = t.test_id
       LEFT JOIN reference_ranges rr ON rr.test_id = t.test_id
         AND rr.gender = 'Any' AND rr.age_min IS NULL AND rr.age_max IS NULL
       WHERE v.visit_id = ?
       ORDER BY d.ordering ASC, d.name ASC, p.ordering ASC, p.name ASC, t.print_order ASC, t.display_name ASC`
    )
    .all(visitId) as Array<{
    departmentId: string;
    department: string;
    departmentOrder: number;
    panelId: string;
    panelName: string;
    panelOrder: number;
    printIfEmpty: number;
    testId: string;
    code: string;
    displayName: string;
    printOrder: number;
    value: string;
    unit: string;
    rangeText: string;
    abnormalFlag: string | null;
    lastResult: string | null;
  }>;

  const hideEmptyRows = (reportSettings?.hideEmptyRows ?? 1) === 1;
  const hideEmptyPanels = (reportSettings?.hideEmptyPanels ?? 1) === 1;
  const hideEmptyDepartments = (reportSettings?.hideEmptyDepartments ?? 1) === 1;
  const noRangePlaceholder = reportSettings?.noRangePlaceholder || "—";

  const departments = new Map<string, PrintableLabReport["departments"][number]>();

  for (const row of rows) {
    const hasValue = row.value.trim().length > 0;
    if (hideEmptyRows && !hasValue) continue;

    let department = departments.get(row.departmentId);
    if (!department) {
      department = {
        departmentId: row.departmentId,
        department: row.department,
        panels: [],
      };
      departments.set(row.departmentId, department);
    }

    let panel = department.panels.find((item) => item.panelId === row.panelId);
    if (!panel) {
      panel = {
        panelId: row.panelId,
        name: row.panelName,
        tests: [],
      };
      department.panels.push(panel);
    }

    panel.tests.push({
      testId: row.testId,
      code: row.code,
      displayName: row.displayName,
      value: row.value,
      unit: row.unit || "",
      rangeText: row.rangeText?.trim() || noRangePlaceholder,
      lastResult: row.lastResult || null,
      abnormalFlag: row.abnormalFlag,
    });
  }

  const filteredDepartments = Array.from(departments.values())
    .map((department) => ({
      ...department,
      panels: department.panels.filter((panel) => !hideEmptyPanels || panel.tests.length > 0),
    }))
    .filter((department) => !hideEmptyDepartments || department.panels.length > 0);

  return {
    visitId: visit.visitId,
    caseNo: visit.caseNo,
    visitDate: visit.visitDate,
    physicianName: visit.physicianName,
    branch: visit.branch,
    labInfo: {
      headerImageUrl: reportSettings?.reportHeaderImageUrl || "",
      name: reportSettings?.labName || "",
      address: reportSettings?.labAddress || "",
      phone: reportSettings?.labPhone || "",
      email: reportSettings?.labEmail || "",
      headerText: reportSettings?.reportHeaderText || "",
      footerText: reportSettings?.reportFooterText || "",
    },
    patient: {
      patientId: visit.patientId,
      fullName: visit.fullName,
      gender: visit.gender,
      dateOfBirth: visit.dateOfBirth,
      phone: visit.phone,
      location: visit.location,
    },
    settings: {
      showLastResult: (reportSettings?.showLastResult ?? 1) === 1,
      noRangePlaceholder,
    },
    printMeta: {
      printCount: visit.printCount,
      printedAt: visit.printedAt,
    },
    departments: filteredDepartments,
  };
}

export function recordVisitPrint(input: { visitId: string; printedBy?: string | null }) {
  const db = getSqliteDb();
  const ts = nowIso();

  db.exec("BEGIN IMMEDIATE;");
  try {
    const existing = db
      .prepare(
        `SELECT
          visit_id AS visitId,
          patient_id AS patientId,
          case_no AS caseNo,
          status,
          COALESCE(print_count, 0) AS printCount
         FROM visits
         WHERE visit_id = ? LIMIT 1`
      )
      .get(input.visitId) as
      | {
          visitId: string;
          patientId: string;
          caseNo: string;
          status: string;
          printCount: number;
        }
      | undefined;

    if (!existing) {
      throw new Error("Visit not found");
    }

    db.prepare(
      `UPDATE visits
       SET status = 'printed',
           printed_at = ?,
           print_count = COALESCE(print_count, 0) + 1,
           updated_at = ?
       WHERE visit_id = ?`
    ).run(ts, ts, input.visitId);

    writeAuditLog(db, {
      entityType: "visit",
      entityId: input.visitId,
      action: "print",
      before: {
        visitId: existing.visitId,
        patientId: existing.patientId,
        caseNo: existing.caseNo,
        status: existing.status,
        printCount: existing.printCount,
      },
      after: {
        visitId: existing.visitId,
        patientId: existing.patientId,
        caseNo: existing.caseNo,
        status: "printed",
        printCount: existing.printCount + 1,
        printedAt: ts,
      },
      userId: input.printedBy || null,
      timestamp: ts,
    });

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return (
    db
      .prepare(
        `SELECT
          visit_id AS visitId,
          COALESCE(print_count, 0) AS printCount,
          printed_at AS printedAt
         FROM visits
         WHERE visit_id = ?
         LIMIT 1`
      )
      .get(input.visitId) as {
      visitId: string;
      printCount: number;
      printedAt: string | null;
    }
  );
}

export function deleteVisit(input: { visitId: string; deletedBy?: string | null; reason?: string | null }) {
  const db = getSqliteDb();
  const ts = nowIso();

  db.exec("BEGIN IMMEDIATE;");
  try {
    const existing = db
      .prepare(
        `SELECT
          visit_id AS visitId,
          patient_id AS patientId,
          case_no AS caseNo,
          physician_name AS physicianName,
          branch,
          visit_date AS visitDate,
          status,
          COALESCE(print_count, 0) AS printCount,
          printed_at AS printedAt,
          updated_at AS updatedAt
         FROM visits
         WHERE visit_id = ?
         LIMIT 1`
      )
      .get(input.visitId) as
      | {
          visitId: string;
          patientId: string;
          caseNo: string;
          physicianName: string | null;
          branch: string | null;
          visitDate: string;
          status: string;
          printCount: number;
          printedAt: string | null;
          updatedAt: string;
        }
      | undefined;

    if (!existing) {
      throw new Error("Visit not found");
    }

    db.prepare(`DELETE FROM results WHERE visit_id = ?`).run(input.visitId);
    db.prepare(`DELETE FROM visits WHERE visit_id = ?`).run(input.visitId);

    writeAuditLog(db, {
      entityType: "visit",
      entityId: input.visitId,
      action: "delete",
      before: existing,
      userId: input.deletedBy || null,
      reason: input.reason || null,
      timestamp: ts,
    });

    db.exec("COMMIT;");
    return {
      visitId: existing.visitId,
      patientId: existing.patientId,
      caseNo: existing.caseNo,
    };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export function listPatientReportActivity(patientId: string, limit = 50): PatientReportActivityItem[] {
  const db = getSqliteDb();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50;

  return db
    .prepare(
      `SELECT
        a.audit_id AS auditId,
        a.entity_id AS visitId,
        COALESCE(
          json_extract(a.after_json, '$.caseNo'),
          json_extract(a.before_json, '$.caseNo'),
          ''
        ) AS caseNo,
        a.action AS action,
        COALESCE(u.full_name, u.username, 'System') AS actorName,
        a.timestamp AS timestamp,
        COALESCE(
          json_extract(a.after_json, '$.status'),
          json_extract(a.before_json, '$.status')
        ) AS status,
        a.reason AS reason
       FROM audit_log a
       LEFT JOIN users u ON u.user_id = a.user_id
       WHERE a.entity_type = 'visit'
         AND COALESCE(
           json_extract(a.after_json, '$.patientId'),
           json_extract(a.before_json, '$.patientId')
         ) = ?
       ORDER BY datetime(a.timestamp) DESC
       LIMIT ?`
    )
    .all(patientId, safeLimit) as PatientReportActivityItem[];
}

export function seedDemoLabData(input: {
  patientCount?: number;
  createdBy?: string | null;
}): DemoLabSeedSummary {
  const db = getSqliteDb();
  ensureDemoCatalogSeed();
  const patientCount = Number.isFinite(input.patientCount)
    ? Math.min(Math.max(Math.trunc(input.patientCount || 0), 1), 5000)
    : 1000;

  const tests = db
    .prepare(
      `SELECT
        t.test_id AS testId,
        t.result_type AS resultType,
        t.allowed_values AS allowedValues,
        COALESCE(t.default_unit, '') AS defaultUnit,
        rr.range_text AS rangeText,
        rr.normal_low AS normalLow,
        rr.normal_high AS normalHigh
       FROM tests t
       LEFT JOIN reference_ranges rr ON rr.test_id = t.test_id
         AND rr.gender = 'Any' AND rr.age_min IS NULL AND rr.age_max IS NULL
       WHERE t.active = 1
       ORDER BY t.print_order ASC, t.display_name ASC`
    )
    .all() as Array<{
    testId: string;
    resultType: "number" | "text" | "select" | "boolean";
    allowedValues: string | null;
    defaultUnit: string;
    rangeText: string | null;
    normalLow: number | null;
    normalHigh: number | null;
  }>;

  const patientInsert = db.prepare(`
    INSERT INTO patients (
      patient_id, full_name, first_name, father_name, last_name, gender, date_of_birth,
      phone, location, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const visitInsert = db.prepare(`
    INSERT INTO visits (
      visit_id, patient_id, case_no, physician_name, branch, visit_date, status,
      created_by, verified_by, verified_at, printed_at, print_count, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const resultInsert = db.prepare(`
    INSERT INTO results (
      result_id, visit_id, test_id, value, unit, range_snapshot, abnormal_flag,
      entered_by, entered_at, updated_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const firstNames = [
    "Adam", "Nour", "Maya", "Elias", "Lea", "Karim", "Lina", "Tarek", "Rami", "Sara",
    "Mira", "Jad", "Rita", "Samir", "Dina", "Nadine", "Fadi", "Hadi", "Mazen", "Yara",
  ];
  const fatherNames = [
    "Joseph", "Michel", "Hassan", "Ahmad", "Ibrahim", "Nabil", "Khalil", "Antoine", "Kamel", "Salim",
  ];
  const lastNames = [
    "Haddad", "Khoury", "Farah", "Aoun", "Nassar", "Saad", "Harb", "Saliba", "Hanna", "Tawk",
  ];
  const locations = ["Beirut", "Tripoli", "Zgharta", "Jounieh", "Byblos", "Batroun", "Bcharre"];
  const branches = ["Main Lab", "North Branch", "Downtown", "Emergency"];
  const physicians = [
    "Dr. N. Haddad",
    "Dr. M. Farah",
    "Dr. R. Saad",
    "Dr. L. Khoury",
    "Dr. A. Hanna",
  ];
  const testsPerVisit = Math.min(Math.max(Math.min(tests.length, 12), 6), tests.length);

  let visitCount = 0;
  let resultCount = 0;

  db.exec("BEGIN IMMEDIATE;");
  try {
    for (let index = 0; index < patientCount; index += 1) {
      const firstName = firstNames[index % firstNames.length]!;
      const fatherName = fatherNames[index % fatherNames.length]!;
      const lastName = `${lastNames[index % lastNames.length]} ${String(index + 1).padStart(4, "0")}`;
      const fullName = `${firstName} ${fatherName} ${lastName}`;
      const patientId = newId("pat");
      const createdAt = shiftIsoDate(nowIso(), -randomInteger(3, 540));
      const gender = index % 2 === 0 ? "Male" : "Female";

      patientInsert.run(
        patientId,
        fullName,
        firstName,
        fatherName,
        lastName,
        gender,
        `${randomInteger(1950, 2018)}-${String(randomInteger(1, 12)).padStart(2, "0")}-${String(randomInteger(1, 28)).padStart(2, "0")}`,
        `70${String(100000 + index).slice(-6)}`,
        locations[index % locations.length]!,
        "Seeded demo patient",
        createdAt,
        createdAt
      );

      const visitRuns = index % 5 === 0 ? 2 : 1;
      for (let visitOffset = 0; visitOffset < visitRuns; visitOffset += 1) {
        const visitId = newId("vis");
        const visitDate = shiftIsoDate(
          createdAt,
          visitOffset === 0 && visitRuns === 2 ? randomInteger(1, 45) : randomInteger(46, 240)
        );
        const status =
          visitOffset === visitRuns - 1
            ? pickRandom(["ready", "verified", "printed", "printed"])
            : pickRandom(["verified", "printed"]);
        const caseNo = `CASE-${new Date(visitDate).toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${String(index + 1).padStart(4, "0")}-${visitOffset + 1}`;
        const verifiedAt =
          status === "verified" || status === "printed" ? shiftIsoDate(visitDate, 0) : null;
        const printedAt = status === "printed" ? shiftIsoDate(visitDate, 0) : null;

        visitInsert.run(
          visitId,
          patientId,
          caseNo,
          physicians[(index + visitOffset) % physicians.length]!,
          branches[(index + visitOffset) % branches.length]!,
          visitDate,
          status,
          input.createdBy || null,
          status === "verified" || status === "printed" ? input.createdBy || null : null,
          verifiedAt,
          printedAt,
          status === "printed" ? 1 : 0,
          "Seeded demo visit with report data",
          visitDate,
          visitDate
        );
        visitCount += 1;

        const start = (index * 3 + visitOffset * testsPerVisit) % tests.length;
        const selectedTests = Array.from({ length: testsPerVisit }, (_, testIndex) => {
          return tests[(start + testIndex) % tests.length]!;
        });

        for (const test of selectedTests) {
          const seedValue = buildSeedResultValue(test);
          resultInsert.run(
            newId("res"),
            visitId,
            test.testId,
            seedValue.value,
            test.defaultUnit || null,
            test.rangeText || null,
            seedValue.abnormalFlag,
            input.createdBy || null,
            visitDate,
            input.createdBy || null,
            visitDate
          );
          resultCount += 1;
        }
      }
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return {
    patients: patientCount,
    visits: visitCount,
    results: resultCount,
    testsUsed: testsPerVisit,
  };
}

export function exportLabSystemData(): LabSystemExport {
  const tables: LabSystemExport["tables"] = {
    employees: listTableRows("employees"),
    users: listTableRows("users"),
    departments: listTableRows("departments"),
    panels: listTableRows("panels"),
    tests: listTableRows("tests"),
    reference_ranges: listTableRows("reference_ranges"),
    report_settings: listTableRows("report_settings"),
    patients: listTableRows("patients"),
    visits: listTableRows("visits"),
    results: listTableRows("results"),
    audit_log: listTableRows("audit_log"),
  };

  return {
    version: LAB_SYSTEM_EXPORT_VERSION,
    exportDate: nowIso(),
    summary: {
      employees: tables.employees.length,
      patients: tables.patients.length,
      visits: tables.visits.length,
      results: tables.results.length,
      tests: tables.tests.length,
    },
    tables,
  };
}

export async function exportLabSystemArchive() {
  const exportData = exportLabSystemData();
  const zip = new JSZip();
  const exportStamp = exportData.exportDate.replace(/[:.]/g, "-");

  zip.file("manifest.json", JSON.stringify({
    version: exportData.version,
    exportDate: exportData.exportDate,
    summary: exportData.summary,
    contents: [
      "raw-data/export.json",
      "raw-data/all-tables.xlsx",
      "patients/<patient>/patient.json",
      "patients/<patient>/reports/<case>/report.json",
      "patients/<patient>/reports/<case>/printable-report.html",
    ],
  }, null, 2));

  zip.file("raw-data/export.json", JSON.stringify(exportData, null, 2));
  zip.file("raw-data/all-tables.xlsx", buildLabSystemWorkbook(exportData));

  const patientRows = exportData.tables.patients;
  const visitRows = exportData.tables.visits;
  const resultsRows = exportData.tables.results;

  const patientsFolder = zip.folder("patients");

  for (const patient of patientRows) {
    const patientId = String(patient.patient_id || "");
    const patientName = sanitizeFileSegment(String(patient.full_name || patientId || "patient"));
    const patientFolder = patientsFolder?.folder(`${patientName}__${sanitizeFileSegment(patientId)}`);
    if (!patientFolder) continue;

    const patientVisits = visitRows.filter((visit) => String(visit.patient_id || "") === patientId);
    const patientVisitIds = new Set(patientVisits.map((visit) => String(visit.visit_id || "")));
    const patientResults = resultsRows.filter((result) =>
      patientVisitIds.has(String(result.visit_id || ""))
    );

    patientFolder.file("patient.json", JSON.stringify({
      patient,
      visits: patientVisits,
      results: patientResults,
    }, null, 2));

    const reportsFolder = patientFolder.folder("reports");

    for (const visit of patientVisits) {
      const visitId = String(visit.visit_id || "");
      if (!visitId) continue;

      const caseNo = sanitizeFileSegment(String(visit.case_no || visitId));
      const reportFolder = reportsFolder?.folder(`${caseNo}__${sanitizeFileSegment(visitId)}`);
      if (!reportFolder) continue;

      const printableReport = getPrintableLabReport(visitId);
      reportFolder.file("report.json", JSON.stringify(printableReport, null, 2));
      reportFolder.file("printable-report.html", buildPrintableReportHtml(printableReport));
    }
  }

  return {
    fileName: `blood-system-export-${exportStamp}.zip`,
    bytes: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
  };
}

export function importLabSystemData(payload: LabSystemExport) {
  if (!payload || payload.version !== LAB_SYSTEM_EXPORT_VERSION) {
    throw new Error("Invalid blood system export file.");
  }

  const db = getSqliteDb();
  const tables = payload.tables;

  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec("DELETE FROM audit_log");
    db.exec("DELETE FROM results");
    db.exec("DELETE FROM visits");
    db.exec("DELETE FROM patients");
    db.exec("DELETE FROM report_settings");
    db.exec("DELETE FROM reference_ranges");
    db.exec("DELETE FROM tests");
    db.exec("DELETE FROM panels");
    db.exec("DELETE FROM departments");
    db.exec("DELETE FROM users");
    db.exec("DELETE FROM employees");

    insertRows("employees", tables.employees || []);
    insertRows("users", tables.users || []);
    insertRows("departments", tables.departments || []);
    insertRows("panels", tables.panels || []);
    insertRows("tests", tables.tests || []);
    insertRows("reference_ranges", tables.reference_ranges || []);
    insertRows("report_settings", tables.report_settings || []);
    insertRows("patients", tables.patients || []);
    insertRows("visits", tables.visits || []);
    insertRows("results", tables.results || []);
    insertRows("audit_log", tables.audit_log || []);

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return {
    employees: tables.employees?.length ?? 0,
    patients: tables.patients?.length ?? 0,
    visits: tables.visits?.length ?? 0,
    results: tables.results?.length ?? 0,
  };
}

export function resetLabSystemData() {
  const db = getSqliteDb();

  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec("DELETE FROM audit_log");
    db.exec("DELETE FROM results");
    db.exec("DELETE FROM visits");
    db.exec("DELETE FROM patients");
    db.exec("DELETE FROM report_settings");
    db.exec("DELETE FROM reference_ranges");
    db.exec("DELETE FROM tests");
    db.exec("DELETE FROM panels");
    db.exec("DELETE FROM departments");
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return getDashboardOverview();
}
