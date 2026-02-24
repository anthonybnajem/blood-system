#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import XLSX from "xlsx";

const dbPath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(process.cwd(), "data", "app.sqlite");
const workbookPath = path.join(process.cwd(), "docs", "Zgharta Form 2.xls");

if (!fs.existsSync(workbookPath)) {
  throw new Error(`Workbook not found: ${workbookPath}`);
}

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

const nowIso = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const slug = (value) =>
  normalize(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

function isMetaLabel(value) {
  const v = normalize(value).toLowerCase();
  return (
    !v ||
    v.includes("patient") ||
    v.includes("case no") ||
    v.includes("physician") ||
    v.includes("date") ||
    v.includes("gender") ||
    v.includes("page") ||
    v.includes("vers.") ||
    v.includes("lab -") ||
    v === "test" ||
    v === "result" ||
    v.includes("normal range") ||
    v.includes("last result")
  );
}

function parseBounds(rangeText) {
  const text = normalize(rangeText).replace(/,/g, ".");
  const nums = (text.match(/-?\d+(?:\.\d+)?/g) || [])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return { low: null, high: null };
  if (text.includes("<")) return { low: null, high: nums[0] ?? null };
  if (text.includes(">")) return { low: nums[0] ?? null, high: null };
  if (nums.length >= 2 && /[-–—]/.test(text)) return { low: nums[0], high: nums[1] };
  return { low: null, high: null };
}

function ensureDepartment(name) {
  const clean = normalize(name);
  const existing = db
    .prepare("SELECT department_id AS id FROM departments WHERE lower(name)=lower(?) LIMIT 1")
    .get(clean);
  if (existing?.id) return existing.id;

  const max = db
    .prepare("SELECT COALESCE(MAX(ordering), 0) AS m FROM departments")
    .get().m;
  const departmentId = id("dept");
  const ts = nowIso();
  db.prepare(
    `INSERT INTO departments (department_id, name, ordering, active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`
  ).run(departmentId, clean, max + 1, ts, ts);
  return departmentId;
}

function ensurePanel(departmentId, name) {
  const clean = normalize(name) || "General";
  const existing = db
    .prepare(
      `SELECT panel_id AS id FROM panels
       WHERE department_id = ? AND lower(name)=lower(?) LIMIT 1`
    )
    .get(departmentId, clean);
  if (existing?.id) return existing.id;

  const max = db
    .prepare("SELECT COALESCE(MAX(ordering), 0) AS m FROM panels WHERE department_id = ?")
    .get(departmentId).m;
  const panelId = id("panel");
  const ts = nowIso();
  db.prepare(
    `INSERT INTO panels
     (panel_id, department_id, name, ordering, print_if_empty, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 1, ?, ?)`
  ).run(panelId, departmentId, clean, max + 1, ts, ts);
  return panelId;
}

function ensureTest(panelId, displayName, defaultUnit) {
  const clean = normalize(displayName);
  if (!clean) return null;
  const existing = db
    .prepare(
      `SELECT test_id AS id FROM tests
       WHERE panel_id = ? AND lower(display_name)=lower(?) LIMIT 1`
    )
    .get(panelId, clean);
  if (existing?.id) return existing.id;

  const max = db
    .prepare("SELECT COALESCE(MAX(print_order), 0) AS m FROM tests WHERE panel_id = ?")
    .get(panelId).m;
  const testId = id("test");
  const ts = nowIso();
  db.prepare(
    `INSERT INTO tests
     (test_id, panel_id, test_code, display_name, result_type, allowed_values,
      default_unit, decimal_precision, print_order, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'number', NULL, ?, 2, ?, 1, ?, ?)`
  ).run(
    testId,
    panelId,
    `${slug(clean)}_${testId.slice(-8)}`,
    clean,
    normalize(defaultUnit) || null,
    max + 1,
    ts,
    ts
  );
  return testId;
}

function upsertRange(testId, rangeText, unit, gender = "Any") {
  const cleanRange = normalize(rangeText) || null;
  const cleanUnit = normalize(unit) || null;
  if (!cleanRange && !cleanUnit) return;

  const bounds = parseBounds(cleanRange || "");
  const existing = db
    .prepare(
      `SELECT range_id AS id FROM reference_ranges
       WHERE test_id = ? AND gender = ? AND age_min IS NULL AND age_max IS NULL LIMIT 1`
    )
    .get(testId, gender);

  if (existing?.id) {
    db.prepare(
      `UPDATE reference_ranges
       SET unit = ?, range_text = ?, normal_low = ?, normal_high = ?
       WHERE range_id = ?`
    ).run(cleanUnit, cleanRange, bounds.low, bounds.high, existing.id);
    return;
  }

  const rangeId = id("range");
  const ts = nowIso();
  db.prepare(
    `INSERT INTO reference_ranges
     (range_id, test_id, gender, age_min, age_max, unit, range_text,
      normal_low, normal_high, critical_low, critical_high, notes, created_at, updated_at)
     VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`
  ).run(
    rangeId,
    testId,
    gender,
    cleanUnit,
    cleanRange,
    bounds.low,
    bounds.high,
    "Imported from Zgharta Form 2.xls",
    ts,
    ts
  );
}

const wb = XLSX.readFile(workbookPath);
const stats = { sheets: 0, departments: 0, panels: 0, tests: 0, ranges: 0 };

db.exec("BEGIN IMMEDIATE;");
try {
  for (const sheetName of wb.SheetNames) {
    stats.sheets += 1;
    const departmentId = ensureDepartment(sheetName);
    stats.departments += 1;
    let panelId = ensurePanel(departmentId, "General");
    let panelCount = 1;

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: null,
    });

    let lastTestId = null;

    for (const row of rows) {
      const cells = (row || []).map((v) => normalize(v));
      const testCell = cells[0] || cells[2] || "";
      const resultCell = cells[3] || cells[1] || "";
      const unitCell = cells[5] || cells[4] || "";
      const rangeCell = cells[6] || "";
      const genderCell = cells[7] || "";

      if (testCell && !isMetaLabel(testCell)) {
        const isHeading =
          /^[A-Z0-9&+\- ]{3,}$/.test(testCell) &&
          !resultCell &&
          !unitCell &&
          !rangeCell;
        if (isHeading) {
          panelId = ensurePanel(departmentId, testCell);
          panelCount += 1;
          continue;
        }

        const testId = ensureTest(panelId, testCell, unitCell);
        if (!testId) continue;
        lastTestId = testId;
        stats.tests += 1;
        const gender =
          /femme|female/i.test(genderCell)
            ? "Female"
            : /homme|male/i.test(genderCell)
            ? "Male"
            : "Any";
        if (rangeCell || unitCell || genderCell) {
          upsertRange(testId, rangeCell, unitCell, gender);
          stats.ranges += 1;
        }
        continue;
      }

      if (lastTestId && (cells[5] || cells[6] || cells[7])) {
        const compositeRange = [cells[5], cells[6], cells[7]]
          .filter(Boolean)
          .join(" | ");
        upsertRange(lastTestId, compositeRange, unitCell || "", "Any");
        stats.ranges += 1;
      }
    }

    stats.panels += panelCount;
  }

  db.exec("COMMIT;");
  console.log(
    `Imported Zgharta Form 2.xls -> sheets=${stats.sheets}, departments=${stats.departments}, panels=${stats.panels}, tests=${stats.tests}, ranges=${stats.ranges}`
  );
} catch (error) {
  db.exec("ROLLBACK;");
  throw error;
} finally {
  db.close();
}
