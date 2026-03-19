import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import * as XLSX from "xlsx";
import { getSqliteDb } from "./sqlite";

type Department = {
  departmentId: string;
  name: string;
  ordering: number;
  active: number;
};

type Panel = {
  panelId: string;
  departmentId: string;
  name: string;
  ordering: number;
  printIfEmpty: number;
  active: number;
};

type LabTest = {
  testId: string;
  panelId: string;
  testCode: string;
  displayName: string;
  resultType: "number" | "text" | "select" | "boolean";
  defaultUnit: string | null;
  decimalPrecision: number;
  printOrder: number;
  active: number;
};

type ReferenceRange = {
  rangeId: string;
  testId: string;
  gender: "Any" | "Male" | "Female";
  ageMin: number | null;
  ageMax: number | null;
  unit: string | null;
  rangeText: string | null;
  normalLow: number | null;
  normalHigh: number | null;
  criticalLow: number | null;
  criticalHigh: number | null;
  notes: string | null;
};

type ReportSettings = {
  id: number;
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
  updatedAt: string;
};

const DEFAULT_REPORT_FOOTER_TEXT =
  "Tripoli - Rue Maarad - Imm. Mir - Tel: 06 / 445 455 - 03 / 104 999 - Autorisation 677/1 - Email: labazamokaddem@hotmail.com - Results Website: www.labazamokaddem.online";

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const normalize = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const slug = (value: string) =>
  normalize(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

function ensureDepartmentByName(name: string) {
  const db = getSqliteDb();
  const cleanName = normalize(name);
  if (!cleanName) throw new Error("Department name is required");

  const existing = db
    .prepare(
      `SELECT department_id AS departmentId FROM departments WHERE lower(name)=lower(?) LIMIT 1`
    )
    .get(cleanName) as { departmentId: string } | undefined;

  if (existing) return existing.departmentId;

  const maxOrderingRow = db
    .prepare(`SELECT COALESCE(MAX(ordering), 0) AS maxOrdering FROM departments`)
    .get() as { maxOrdering: number };

  const departmentId = id("dept");
  const ts = nowIso();
  db.prepare(
    `INSERT INTO departments (department_id, name, ordering, active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`
  ).run(departmentId, cleanName, maxOrderingRow.maxOrdering + 1, ts, ts);
  return departmentId;
}

function ensurePanelByName(departmentId: string, name: string) {
  const db = getSqliteDb();
  const cleanName = normalize(name) || "General";

  const existing = db
    .prepare(
      `SELECT panel_id AS panelId FROM panels
       WHERE department_id = ? AND lower(name)=lower(?)
       LIMIT 1`
    )
    .get(departmentId, cleanName) as { panelId: string } | undefined;

  if (existing) return existing.panelId;

  const maxOrderingRow = db
    .prepare(
      `SELECT COALESCE(MAX(ordering), 0) AS maxOrdering FROM panels WHERE department_id = ?`
    )
    .get(departmentId) as { maxOrdering: number };

  const panelId = id("panel");
  const ts = nowIso();
  db.prepare(
    `INSERT INTO panels (
      panel_id, department_id, name, ordering, print_if_empty, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0, 1, ?, ?)`
  ).run(panelId, departmentId, cleanName, maxOrderingRow.maxOrdering + 1, ts, ts);
  return panelId;
}

function ensureTestByName(panelId: string, displayName: string, defaultUnit?: string | null) {
  const db = getSqliteDb();
  const cleanName = normalize(displayName);
  if (!cleanName) return null;

  const existing = db
    .prepare(
      `SELECT test_id AS testId FROM tests
       WHERE panel_id = ? AND lower(display_name)=lower(?)
       LIMIT 1`
    )
    .get(panelId, cleanName) as { testId: string } | undefined;

  if (existing) return existing.testId;

  const maxOrderRow = db
    .prepare(
      `SELECT COALESCE(MAX(print_order), 0) AS maxOrder FROM tests WHERE panel_id = ?`
    )
    .get(panelId) as { maxOrder: number };

  const testId = id("test");
  const testCode = `${slug(cleanName)}_${testId.slice(-8)}`;
  const ts = nowIso();
  db.prepare(
    `INSERT INTO tests (
      test_id, panel_id, test_code, display_name, result_type, allowed_values,
      default_unit, decimal_precision, print_order, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'number', NULL, ?, 2, ?, 1, ?, ?)`
  ).run(
    testId,
    panelId,
    testCode,
    cleanName,
    normalize(defaultUnit || "") || null,
    maxOrderRow.maxOrder + 1,
    ts,
    ts
  );
  return testId;
}

function upsertRangeForTest(
  testId: string,
  rangeText?: string | null,
  unit?: string | null,
  notes?: string | null,
  gender: "Any" | "Male" | "Female" = "Any"
) {
  const db = getSqliteDb();
  const cleanRange = normalize(rangeText || "") || null;
  const cleanUnit = normalize(unit || "") || null;
  const cleanNotes = normalize(notes || "") || null;
  const bounds = extractNormalBounds(cleanRange);

  if (!cleanRange && !cleanUnit && !cleanNotes) return;

  const existing = db
    .prepare(
      `SELECT range_id AS rangeId FROM reference_ranges
       WHERE test_id = ? AND gender = ? AND age_min IS NULL AND age_max IS NULL
       LIMIT 1`
    )
    .get(testId, gender) as { rangeId: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE reference_ranges
       SET unit = ?, range_text = ?, normal_low = ?, normal_high = ?, notes = ?
       WHERE range_id = ?`
    ).run(
      cleanUnit,
      cleanRange,
      bounds.normalLow,
      bounds.normalHigh,
      cleanNotes,
      existing.rangeId
    );
    return;
  }

  const rangeId = id("range");
  const ts = nowIso();
  db.prepare(
    `INSERT INTO reference_ranges (
      range_id, test_id, gender, age_min, age_max, unit, range_text,
      normal_low, normal_high, critical_low, critical_high, notes, created_at, updated_at
    ) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`
  ).run(
    rangeId,
    testId,
    gender,
    cleanUnit,
    cleanRange,
    bounds.normalLow,
    bounds.normalHigh,
    cleanNotes,
    ts,
    ts
  );
}

function extractNormalBounds(rangeText: string | null): {
  normalLow: number | null;
  normalHigh: number | null;
} {
  if (!rangeText) return { normalLow: null, normalHigh: null };
  const text = rangeText.replace(/,/g, ".").trim();
  const numbers = (text.match(/-?\d+(?:\.\d+)?/g) || [])
    .map(Number)
    .filter((n) => Number.isFinite(n));

  if (!numbers.length) return { normalLow: null, normalHigh: null };

  if (text.includes("<")) {
    return { normalLow: null, normalHigh: numbers[0] ?? null };
  }
  if (text.includes(">")) {
    return { normalLow: numbers[0] ?? null, normalHigh: null };
  }
  if (numbers.length >= 2 && /[-–—]/.test(text)) {
    return { normalLow: numbers[0], normalHigh: numbers[1] };
  }

  return { normalLow: null, normalHigh: null };
}

function deleteTestWithDependencies(testId: string) {
  const db = getSqliteDb();
  db.exec("BEGIN IMMEDIATE;");
  try {
    db.prepare(`DELETE FROM results WHERE test_id = ?`).run(testId);
    db.prepare(`DELETE FROM reference_ranges WHERE test_id = ?`).run(testId);
    db.prepare(`DELETE FROM tests WHERE test_id = ?`).run(testId);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function deletePanelWithDependencies(panelId: string) {
  const db = getSqliteDb();
  const resultCountRow = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM results
       WHERE test_id IN (SELECT test_id FROM tests WHERE panel_id = ?)`
    )
    .get(panelId) as { count: number };

  if (resultCountRow.count > 0) {
    throw new Error(
      "Cannot delete this panel because seeded or saved patient results already reference its inputs."
    );
  }

  db.exec("BEGIN IMMEDIATE;");
  try {
    db.prepare(
      `DELETE FROM reference_ranges
       WHERE test_id IN (SELECT test_id FROM tests WHERE panel_id = ?)`
    ).run(panelId);
    db.prepare(`DELETE FROM tests WHERE panel_id = ?`).run(panelId);
    db.prepare(`DELETE FROM panels WHERE panel_id = ?`).run(panelId);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function deleteDepartmentWithDependencies(departmentId: string) {
  const db = getSqliteDb();
  const resultCountRow = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM results
       WHERE test_id IN (
         SELECT t.test_id
         FROM tests t
         INNER JOIN panels p ON p.panel_id = t.panel_id
         WHERE p.department_id = ?
       )`
    )
    .get(departmentId) as { count: number };

  if (resultCountRow.count > 0) {
    throw new Error(
      "Cannot delete this category because seeded or saved patient results already reference its inputs."
    );
  }

  db.exec("BEGIN IMMEDIATE;");
  try {
    db.prepare(
      `DELETE FROM reference_ranges
       WHERE test_id IN (
         SELECT t.test_id
         FROM tests t
         INNER JOIN panels p ON p.panel_id = t.panel_id
         WHERE p.department_id = ?
       )`
    ).run(departmentId);
    db.prepare(
      `DELETE FROM tests
       WHERE panel_id IN (SELECT panel_id FROM panels WHERE department_id = ?)`
    ).run(departmentId);
    db.prepare(`DELETE FROM panels WHERE department_id = ?`).run(departmentId);
    db.prepare(`DELETE FROM departments WHERE department_id = ?`).run(departmentId);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export function getLabCatalog() {
  const db = getSqliteDb();
  const departments = db
    .prepare(
      `SELECT
        department_id AS departmentId,
        name,
        ordering,
        active
       FROM departments
       ORDER BY ordering ASC, name ASC`
    )
    .all() as Department[];

  const panels = db
    .prepare(
      `SELECT
        panel_id AS panelId,
        department_id AS departmentId,
        name,
        ordering,
        print_if_empty AS printIfEmpty,
        active
       FROM panels
       ORDER BY ordering ASC, name ASC`
    )
    .all() as Panel[];

  const tests = db
    .prepare(
      `SELECT
        test_id AS testId,
        panel_id AS panelId,
        test_code AS testCode,
        display_name AS displayName,
        result_type AS resultType,
        default_unit AS defaultUnit,
        decimal_precision AS decimalPrecision,
        print_order AS printOrder,
        active
       FROM tests
       ORDER BY print_order ASC, display_name ASC`
    )
    .all() as LabTest[];

  const ranges = db
    .prepare(
      `SELECT
        range_id AS rangeId,
        test_id AS testId,
        gender,
        age_min AS ageMin,
        age_max AS ageMax,
        unit,
        range_text AS rangeText,
        normal_low AS normalLow,
        normal_high AS normalHigh,
        critical_low AS criticalLow,
        critical_high AS criticalHigh,
        notes
       FROM reference_ranges
       ORDER BY test_id ASC`
    )
    .all() as ReferenceRange[];

  const reportSettings = db
    .prepare(
      `SELECT
        id,
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
        hide_empty_departments AS hideEmptyDepartments,
        updated_at AS updatedAt
       FROM report_settings
       WHERE id = 1`
    )
    .get() as ReportSettings | undefined;

  const resolvedReportSettings = reportSettings || {
    id: 1,
    reportHeaderImageUrl: "",
    labName: "",
    labAddress: "",
    labPhone: "",
    labEmail: "",
    reportHeaderText: "",
    reportFooterText: DEFAULT_REPORT_FOOTER_TEXT,
    showLastResult: 1,
    noRangePlaceholder: "—",
    hideEmptyRows: 1,
    hideEmptyPanels: 1,
    hideEmptyDepartments: 1,
    updatedAt: nowIso(),
  };

  return {
    departments,
    panels,
    tests,
    ranges,
    reportSettings: {
      ...resolvedReportSettings,
      reportFooterText:
        String(resolvedReportSettings.reportFooterText || "").trim() || DEFAULT_REPORT_FOOTER_TEXT,
    },
  };
}

export function catalogAction(action: string, payload: any) {
  const db = getSqliteDb();

  switch (action) {
    case "create_department": {
      const departmentId = ensureDepartmentByName(payload.name);
      return { departmentId };
    }
    case "update_department": {
      db.prepare(
        `UPDATE departments
         SET name = ?, ordering = ?, active = ?
         WHERE department_id = ?`
      ).run(
        normalize(payload.name),
        Number(payload.ordering ?? 0),
        payload.active ? 1 : 0,
        payload.departmentId
      );
      return { ok: true };
    }
    case "delete_department": {
      deleteDepartmentWithDependencies(payload.departmentId);
      return { ok: true };
    }
    case "create_panel": {
      const panelId = ensurePanelByName(payload.departmentId, payload.name);
      return { panelId };
    }
    case "update_panel": {
      db.prepare(
        `UPDATE panels
         SET name = ?, ordering = ?, print_if_empty = ?, active = ?
         WHERE panel_id = ?`
      ).run(
        normalize(payload.name),
        Number(payload.ordering ?? 0),
        payload.printIfEmpty ? 1 : 0,
        payload.active ? 1 : 0,
        payload.panelId
      );
      return { ok: true };
    }
    case "delete_panel": {
      deletePanelWithDependencies(payload.panelId);
      return { ok: true };
    }
    case "create_test": {
      const testId = ensureTestByName(
        payload.panelId,
        payload.displayName,
        payload.defaultUnit
      );
      if (!testId) throw new Error("displayName is required");
      return { testId };
    }
    case "update_test": {
      db.prepare(
        `UPDATE tests
         SET display_name = ?, result_type = ?, default_unit = ?,
             decimal_precision = ?, print_order = ?, active = ?
         WHERE test_id = ?`
      ).run(
        normalize(payload.displayName),
        payload.resultType || "number",
        normalize(payload.defaultUnit || "") || null,
        Number(payload.decimalPrecision ?? 2),
        Number(payload.printOrder ?? 0),
        payload.active ? 1 : 0,
        payload.testId
      );
      return { ok: true };
    }
    case "delete_test": {
      deleteTestWithDependencies(payload.testId);
      return { ok: true };
    }
    case "create_range": {
      const rangeId = id("range");
      const ts = nowIso();
      const normalizedRange = normalize(payload.rangeText || "") || null;
      const bounds = extractNormalBounds(normalizedRange);
      db.prepare(
        `INSERT INTO reference_ranges (
          range_id, test_id, gender, age_min, age_max, unit, range_text,
          normal_low, normal_high, critical_low, critical_high, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        rangeId,
        payload.testId,
        payload.gender || "Any",
        payload.ageMin ?? null,
        payload.ageMax ?? null,
        normalize(payload.unit || "") || null,
        normalizedRange,
        payload.normalLow ?? bounds.normalLow,
        payload.normalHigh ?? bounds.normalHigh,
        payload.criticalLow ?? null,
        payload.criticalHigh ?? null,
        normalize(payload.notes || "") || null,
        ts,
        ts
      );
      return { rangeId };
    }
    case "update_range": {
      const normalizedRange = normalize(payload.rangeText || "") || null;
      const bounds = extractNormalBounds(normalizedRange);
      db.prepare(
        `UPDATE reference_ranges
         SET gender = ?, age_min = ?, age_max = ?, unit = ?, range_text = ?,
             normal_low = ?, normal_high = ?, critical_low = ?, critical_high = ?, notes = ?
         WHERE range_id = ?`
      ).run(
        payload.gender || "Any",
        payload.ageMin ?? null,
        payload.ageMax ?? null,
        normalize(payload.unit || "") || null,
        normalizedRange,
        payload.normalLow ?? bounds.normalLow,
        payload.normalHigh ?? bounds.normalHigh,
        payload.criticalLow ?? null,
        payload.criticalHigh ?? null,
        normalize(payload.notes || "") || null,
        payload.rangeId
      );
      return { ok: true };
    }
    case "delete_range": {
      db.prepare(`DELETE FROM reference_ranges WHERE range_id = ?`).run(
        payload.rangeId
      );
      return { ok: true };
    }
    case "update_report_settings": {
      db.prepare(
        `UPDATE report_settings
         SET report_header_image_url = ?, lab_name = ?, lab_address = ?, lab_phone = ?, lab_email = ?,
             report_header_text = ?, report_footer_text = ?,
             show_last_result = ?, no_range_placeholder = ?, hide_empty_rows = ?,
             hide_empty_panels = ?, hide_empty_departments = ?
         WHERE id = 1`
      ).run(
        String(payload.reportHeaderImageUrl || "").trim(),
        normalize(payload.labName || ""),
        String(payload.labAddress || "").trim(),
        normalize(payload.labPhone || ""),
        normalize(payload.labEmail || ""),
        String(payload.reportHeaderText || "").trim(),
        String(payload.reportFooterText || "").trim(),
        payload.showLastResult ? 1 : 0,
        normalize(payload.noRangePlaceholder || "") || "—",
        payload.hideEmptyRows ? 1 : 0,
        payload.hideEmptyPanels ? 1 : 0,
        payload.hideEmptyDepartments ? 1 : 0
      );
      return { ok: true };
    }
    case "import_from_excel_defaults": {
      return importFromDefaultExcelFiles();
    }
    case "import_from_zgharta_form2": {
      return importFromZghartaForm2();
    }
    default:
      throw new Error(`Unsupported catalog action: ${action}`);
  }
}

function isMetaLabel(value: string) {
  const v = value.toLowerCase();
  return (
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

function importFromDefaultExcelFiles() {
  const db = getSqliteDb();
  const dollyPath = path.join(process.cwd(), "docs", "Dolly Kasshanna1.xlsx");
  const normaPath = path.join(process.cwd(), "docs", "Norma.xlsx");

  const stats = {
    departments: 0,
    panels: 0,
    tests: 0,
    ranges: 0,
  };

  db.exec("BEGIN IMMEDIATE;");
  try {
    const dollyWb = XLSX.readFile(dollyPath);
    for (const sheetName of dollyWb.SheetNames) {
      const departmentId = ensureDepartmentByName(sheetName);
      stats.departments += 1;
      let currentPanelId = ensurePanelByName(departmentId, "General");
      let panelSwitches = 0;

      const rows = XLSX.utils.sheet_to_json(dollyWb.Sheets[sheetName], {
        header: 1,
        raw: false,
      }) as unknown[][];

      for (const row of rows) {
        const cells = (row || []).map((v) => normalize(v));
        const testCell = cells[0] || cells[2] || "";
        const resultCell = cells[3] || cells[1] || "";
        const unitCell = cells[5] || cells[4] || "";
        const rangeCell = cells[6] || "";
        const genderCell = cells[7] || "";

        if (!testCell) continue;
        if (isMetaLabel(testCell)) continue;

        const isHeading =
          /^[A-Z0-9&+\- ]{3,}$/.test(testCell) &&
          !resultCell &&
          !unitCell &&
          !rangeCell;

        if (isHeading) {
          currentPanelId = ensurePanelByName(departmentId, testCell);
          panelSwitches += 1;
          continue;
        }

        const testId = ensureTestByName(currentPanelId, testCell, unitCell);
        if (!testId) continue;
        stats.tests += 1;

        if (rangeCell || unitCell || genderCell) {
          const gender =
            /femme|female/i.test(genderCell)
              ? "Female"
              : /homme|male/i.test(genderCell)
              ? "Male"
              : "Any";
          upsertRangeForTest(testId, rangeCell, unitCell, null, gender);
          stats.ranges += 1;
        }
      }

      stats.panels += Math.max(1, panelSwitches + 1);
    }

    const normaWb = XLSX.readFile(normaPath);
    for (const sheetName of normaWb.SheetNames) {
      const departmentId = ensureDepartmentByName(sheetName);
      const panelId = ensurePanelByName(departmentId, "Norma");
      stats.departments += 1;
      stats.panels += 1;

      const rows = XLSX.utils.sheet_to_json(normaWb.Sheets[sheetName], {
        header: 1,
        raw: false,
      }) as unknown[][];

      for (const row of rows) {
        const testName = normalize(row?.[0]);
        const unit = normalize(row?.[3]);
        const rangeText = normalize(row?.[4]);
        if (!testName || isMetaLabel(testName)) continue;

        const testId = ensureTestByName(panelId, testName, unit);
        if (!testId) continue;
        stats.tests += 1;
        if (unit || rangeText) {
          upsertRangeForTest(testId, rangeText, unit, "Imported from Norma.xlsx", "Any");
          stats.ranges += 1;
        }
      }
    }

    db.exec("COMMIT;");
    return {
      ok: true,
      imported: stats,
    };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function importWorkbookAsCatalog(
  workbookPath: string,
  sourceLabel: string
): {
  departments: number;
  panels: number;
  tests: number;
  ranges: number;
  sheets: number;
} {
  const wb = XLSX.readFile(workbookPath);
  const stats = { departments: 0, panels: 0, tests: 0, ranges: 0, sheets: 0 };

  for (const sheetName of wb.SheetNames) {
    stats.sheets += 1;
    const departmentId = ensureDepartmentByName(sheetName);
    stats.departments += 1;
    let currentPanelId = ensurePanelByName(departmentId, "General");
    let lastTestId: string | null = null;
    let panelSwitches = 0;

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: null,
    }) as unknown[][];

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
          currentPanelId = ensurePanelByName(departmentId, testCell);
          panelSwitches += 1;
          continue;
        }

        const testId = ensureTestByName(currentPanelId, testCell, unitCell);
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
          upsertRangeForTest(
            testId,
            rangeCell,
            unitCell,
            `Imported from ${sourceLabel} / ${sheetName}`,
            gender
          );
          stats.ranges += 1;
        }
        continue;
      }

      // Handles rows where classification/range labels exist under prior test (e.g. Vit D status rows).
      if (lastTestId && (cells[5] || cells[6] || cells[7])) {
        const compositeRange = [cells[5], cells[6], cells[7]]
          .filter(Boolean)
          .join(" | ");
        upsertRangeForTest(
          lastTestId,
          compositeRange,
          unitCell || null,
          `Imported from ${sourceLabel} / ${sheetName}`,
          "Any"
        );
        stats.ranges += 1;
      }
    }

    stats.panels += Math.max(1, panelSwitches + 1);
  }

  return stats;
}

function importFromZghartaForm2() {
  const db = getSqliteDb();
  const zghartaPath = path.join(process.cwd(), "docs", "Zgharta Form 2.xls");

  db.exec("BEGIN IMMEDIATE;");
  try {
    const imported = importWorkbookAsCatalog(zghartaPath, "Zgharta Form 2.xls");
    db.exec("COMMIT;");
    return { ok: true, imported };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}
