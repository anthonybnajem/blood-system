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

const DEFAULT_REPORT_FOOTER_TEXT =
  "Tripoli - Rue Maarad - Imm. Mir - Tel: 06 / 445 455 - 03 / 104 999 - Autorisation 677/1 - Email: labazamokaddem@hotmail.com - Results Website: www.labazamokaddem.online";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  let hours = date.getHours();
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${formatDate(value)} ${hours}:${minutes}:${seconds}${meridiem}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPrintableReportHtml(report: PrintableLabReport): string {
  const headerImageUrl = report.labInfo.headerImageUrl?.trim() || "/default-logo.png";
  const rowGroups = report.departments
    .map((department) => {
      const departmentRows = [
        `<tr><td colspan="4" class="dept-row">${escapeHtml(department.department.toUpperCase())}</td></tr>`,
      ];

      for (const panel of department.panels) {
        if (panel.name.trim()) {
          departmentRows.push(
            `<tr><td colspan="4" class="panel-row">${escapeHtml(panel.name.toUpperCase())}</td></tr>`
          );
        }

        for (const test of panel.tests) {
          const flag =
            test.abnormalFlag === "High"
              ? " HI"
              : test.abnormalFlag === "Low"
                ? " LO"
                : "";
          const resultText = `${test.value}${test.unit ? ` ${test.unit}` : ""}${flag}`;
          departmentRows.push(
            `<tr>
              <td class="test-name">${escapeHtml(test.displayName)}</td>
              <td class="result-cell${flag ? " abnormal" : ""}">${escapeHtml(resultText)}</td>
              <td>${escapeHtml(test.rangeText || report.settings.noRangePlaceholder)}</td>
              <td>${report.settings.showLastResult ? escapeHtml(test.lastResult || "") : ""}</td>
            </tr>`
          );
        }
      }

      return departmentRows.join("");
    })
    .join("");

  const refValue = report.physicianName?.trim() || report.branch?.trim() || "-";
  const labContact = [report.labInfo.phone, report.labInfo.email].filter(Boolean).join(" | ");
  const showLabHeader = Boolean(
    headerImageUrl ||
      report.labInfo.name ||
      report.labInfo.address ||
      labContact ||
      report.labInfo.headerText
  );
  const footerText = report.labInfo.footerText?.trim() || DEFAULT_REPORT_FOOTER_TEXT;
  const footerDisplayText = footerText.replace(/\s*\n+\s*/g, " - ");
  const showLabFooter = Boolean(footerText);
  const printedOn = formatDate(new Date().toISOString());

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Lab Report ${escapeHtml(report.caseNo)}</title>
    <style>
      :root { color-scheme: light; --report-ink: #000; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f3f1ec; color: var(--report-ink); font-family: "Times New Roman", Times, serif; }
      .print-shell { padding: 24px; }
      .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 14mm 6mm 16mm; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12); display: flex; flex-direction: column; }
      .toolbar { width: 210mm; margin: 0 auto 12px; display: flex; justify-content: flex-end; gap: 8px; }
      .toolbar .meta-chip { border: 1px solid var(--report-ink); padding: 8px 12px; font: 600 12px/1 Arial, sans-serif; background: #faf8f2; color: var(--report-ink); }
      .toolbar button { border: 1px solid var(--report-ink); background: #fff; color: var(--report-ink); padding: 8px 14px; font: 600 12px/1 Arial, sans-serif; cursor: pointer; }
      .report-header { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--report-ink); text-align: center; }
      .report-header-image-wrap { display: flex; justify-content: flex-start; margin-bottom: 10px; }
      .report-header-image { max-width: 100px; width: auto; height: auto; object-fit: contain; }
      .report-header h1 { margin: 0; font-size: 24px; letter-spacing: 0.06em; }
      .report-header p { margin: 4px 0 0; font-size: 12px; }
      .report-header-copy { white-space: pre-line; }
      .report-footer-copy { white-space: normal; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 16px 28px; margin-bottom: 10px; font-size: 12px; }
      .meta-block { display: grid; gap: 6px; }
      .meta-row { display: grid; grid-template-columns: 110px 12px 1fr; align-items: baseline; }
      .meta-value { font-weight: 700; text-transform: none; }
      .report-body { flex: 1; display: flex; flex-direction: column; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: auto; }
      thead th, tbody td { text-align: left; vertical-align: middle; }
      thead th { border-top: 2px solid var(--report-ink); border-bottom: 1px solid var(--report-ink); padding: 6px 5px; font-weight: 700; }
      tbody td { padding: 6px 5px; }
      .dept-row { border-top: 1px solid var(--report-ink); border-bottom: 1px solid var(--report-ink); padding: 4px 5px; text-align: left; font-weight: 700; letter-spacing: 0.04em; }
      .panel-row { padding-top: 8px; padding-bottom: 4px; font-style: italic; font-weight: 700; text-transform: uppercase; text-align: left; }
      .test-name { font-style: italic; text-align: left; }
      .result-cell { font-weight: 700; text-align: left; }
      .col-test { width: 34%; }
      .col-result { width: 18%; }
      .col-range { width: 30%; }
      .col-last { width: 18%; }
      .report-footer { margin-top: auto; padding-top: 10px; font-size: 11px; }
      .report-footer-grid { display: grid; grid-template-columns: 180px 1fr 110px; gap: 12px; align-items: start; }
      .report-footer-left { text-align: left; font-weight: 600; }
      .report-footer-center { border-top: 1px solid var(--report-ink); padding-top: 4px; text-align: center; line-height: 1.35; }
      .report-footer-right { text-align: right; }
      .report-footer-page::after { content: "Page " counter(page) " / " counter(pages); }
      @page { size: A4; margin: 10mm; }
      @media print {
        body { background: #fff; }
        .print-shell { padding: 0; }
        .toolbar { display: none; }
        .page { width: auto; min-height: calc(297mm - 20mm); margin: 0; box-shadow: none; padding: 14mm 6mm 16mm; }
      }
    </style>
  </head>
  <body>
    <div class="print-shell">
      <div class="toolbar">
        <div class="meta-chip">Printed ${report.printMeta.printCount} time${report.printMeta.printCount === 1 ? "" : "s"}${report.printMeta.printedAt ? ` | Last: ${escapeHtml(formatDateTime(report.printMeta.printedAt))}` : ""}</div>
        <button type="button" onclick="window.print()">Print</button>
      </div>
      <div class="page">
        ${showLabHeader ? `<div class="report-header">
          ${headerImageUrl ? `<div class="report-header-image-wrap">
            <img src="${escapeHtml(headerImageUrl)}" alt="Report header" class="report-header-image" />
          </div>` : ""}
          ${report.labInfo.name ? `<h1>${escapeHtml(report.labInfo.name)}</h1>` : ""}
          ${report.labInfo.address ? `<p>${escapeHtml(report.labInfo.address)}</p>` : ""}
          ${labContact ? `<p>${escapeHtml(labContact)}</p>` : ""}
          ${report.labInfo.headerText ? `<p class="report-header-copy">${escapeHtml(report.labInfo.headerText)}</p>` : ""}
        </div>` : ""}
        <div class="report-body">
          <div class="meta-grid">
            <div class="meta-block">
              <div class="meta-row"><span>Date Of Birth</span><span>:</span><span class="meta-value">${escapeHtml(formatDate(report.patient.dateOfBirth))}</span></div>
              <div class="meta-row"><span>Gender</span><span>:</span><span class="meta-value">${escapeHtml(report.patient.gender)}</span></div>
              ${report.patient.phone ? `<div class="meta-row"><span>Phone</span><span>:</span><span class="meta-value">${escapeHtml(report.patient.phone)}</span></div>` : ""}
              ${report.patient.location ? `<div class="meta-row"><span>Location</span><span>:</span><span class="meta-value">${escapeHtml(report.patient.location)}</span></div>` : ""}
            </div>
            <div class="meta-block">
              <div class="meta-row"><span>Patient</span><span>:</span><span class="meta-value">${escapeHtml(report.patient.fullName)}</span></div>
              <div class="meta-row"><span>Case No.</span><span>:</span><span class="meta-value">${escapeHtml(report.caseNo)}</span></div>
              <div class="meta-row"><span>Ref / M.D.</span><span>:</span><span class="meta-value">${escapeHtml(refValue)}</span></div>
              <div class="meta-row"><span>Date &amp; Time</span><span>:</span><span class="meta-value">${escapeHtml(formatDateTime(report.visitDate))}</span></div>
            </div>
          </div>
          <table>
            <colgroup>
              <col class="col-test" />
              <col class="col-result" />
              <col class="col-range" />
              <col class="col-last" />
            </colgroup>
            <thead>
              <tr>
                <th>Test</th>
                <th>Result</th>
                <th>Normal Range</th>
                <th>Last Result</th>
              </tr>
            </thead>
            <tbody>
              ${rowGroups || '<tr><td colspan="4" style="padding: 18px 8px; text-align: center;">No saved results to print.</td></tr>'}
            </tbody>
          </table>
        </div>
        ${showLabFooter ? `<div class="report-footer">
          <div class="report-footer-grid">
            <div class="report-footer-left">Printed on:&nbsp;&nbsp;${escapeHtml(printedOn)}</div>
            <div class="report-footer-center report-footer-copy">${escapeHtml(footerDisplayText)}</div>
            <div class="report-footer-right"><span class="report-footer-page"></span></div>
          </div>
        </div>` : ""}
      </div>
    </div>
  </body>
</html>`;
}
