import * as XLSX from "xlsx";

function sanitizeSheetName(value: string) {
  return value.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31) || "Sheet1";
}

function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim() || "export";
}

export function exportRowsToExcel(options: {
  fileName: string;
  sheetName: string;
  rows: Array<Record<string, unknown>>;
}) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(options.rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(options.sheetName));
  XLSX.writeFile(workbook, `${sanitizeFileName(options.fileName)}.xlsx`);
}

export function exportWorkbookToExcel(options: {
  fileName: string;
  sheets: Array<{
    sheetName: string;
    rows: Array<Record<string, unknown>>;
  }>;
}) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of options.sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheet.sheetName));
  }
  XLSX.writeFile(workbook, `${sanitizeFileName(options.fileName)}.xlsx`);
}
