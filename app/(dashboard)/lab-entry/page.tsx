"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PatientIntakePanel } from "@/components/lab/patient-intake-panel";
import { useToast } from "@/components/ui/use-toast";
import { formatPatientDobInput, normalizePatientDobForStorage } from "@/lib/patient-dob";
import { getYupFieldErrors, labInputSchema, patientRequiredSchema } from "@/lib/yup-validation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock3, FileText, Loader2, Plus, Printer, RefreshCw, Save } from "lucide-react";

type Patient = {
  patientId: string;
  fullName: string;
  firstName?: string | null;
  fatherName?: string | null;
  lastName?: string | null;
  gender: "Male" | "Female" | "Other" | "Unknown";
  dateOfBirth?: string | null;
  phone?: string | null;
  location?: string | null;
};

type Template = Array<{
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
      range: { min: number | null; max: number | null; text: string };
      lastResult: string | null;
    }>;
  }>;
}>;

type PrintableLabReport = {
  visitId: string;
  caseNo: string;
  visitDate: string;
  physicianName?: string | null;
  branch?: string | null;
  labInfo: {
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

type VisitHistoryItem = {
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

type VisitEditorPayload = {
  visit: {
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
  results: Record<string, string>;
  template: Template;
};

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Request failed");
  return body.data as T;
}

async function apiPost<T>(url: string, payload: any): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Request failed");
  return (body.data ?? body) as T;
}

async function apiPut<T>(url: string, payload: any): Promise<T> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Request failed");
  return (body.data ?? body) as T;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

function isSubsequence(query: string, text: string): boolean {
  let qi = 0;
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (query[qi] === text[ti]) qi++;
  }
  return qi === query.length;
}

function getInitials(value: string): string {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
}

function buildPatientFullName(input: {
  fullName?: string | null;
  firstName?: string | null;
  fatherName?: string | null;
  lastName?: string | null;
}) {
  const parts = [input.firstName, input.fatherName, input.lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.join(" ").trim() || String(input.fullName || "").trim();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatDateTime(value?: string | null): string {
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPrintableReportHtml(report: PrintableLabReport): string {
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
  const showLabHeader =
    Boolean(report.labInfo.name || report.labInfo.address || labContact || report.labInfo.headerText);
  const showLabFooter = Boolean(report.labInfo.footerText);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Lab Report ${escapeHtml(report.caseNo)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: #f3f1ec;
        color: #111;
        font-family: "Times New Roman", Times, serif;
      }
      .print-shell {
        padding: 24px;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #fff;
        padding: 14mm 10mm 16mm;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
      }
      .toolbar {
        width: 210mm;
        margin: 0 auto 12px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .toolbar button {
        border: 1px solid #222;
        background: #fff;
        padding: 8px 14px;
        font: 600 12px/1 Arial, sans-serif;
        cursor: pointer;
      }
      .toolbar .meta-chip {
        border: 1px solid #222;
        padding: 8px 12px;
        font: 600 12px/1 Arial, sans-serif;
        background: #faf8f2;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 16px 28px;
        margin-bottom: 10px;
        font-size: 12px;
      }
      .report-header {
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid #222;
        text-align: center;
      }
      .report-header h1 {
        margin: 0;
        font-size: 24px;
        letter-spacing: 0.06em;
      }
      .report-header p {
        margin: 4px 0 0;
        font-size: 12px;
      }
      .meta-block {
        display: grid;
        gap: 6px;
      }
      .meta-row {
        display: grid;
        grid-template-columns: 110px 12px 1fr;
        align-items: baseline;
      }
      .meta-label {
        font-weight: 400;
      }
      .meta-value {
        font-weight: 700;
        text-transform: none;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      thead th {
        border-top: 2px solid #222;
        border-bottom: 1px solid #222;
        padding: 6px 5px;
        text-align: center;
        font-weight: 700;
      }
      tbody td {
        padding: 4px 5px;
        vertical-align: top;
      }
      .dept-row {
        border-top: 1px solid #222;
        border-bottom: 1px solid #222;
        padding: 3px 5px;
        text-align: center;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      .panel-row {
        padding-top: 8px;
        padding-bottom: 4px;
        font-style: italic;
        font-weight: 700;
        text-transform: uppercase;
      }
      .test-name {
        width: 33%;
        padding-left: 18px;
        font-style: italic;
      }
      .result-cell {
        width: 22%;
        font-weight: 700;
      }
      .abnormal {
        letter-spacing: 0.02em;
      }
      .report-footer {
        margin-top: 18px;
        padding-top: 10px;
        border-top: 1px solid #222;
        text-align: center;
        font-size: 11px;
      }
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          background: #fff;
        }
        .print-shell {
          padding: 0;
        }
        .toolbar {
          display: none;
        }
        .page {
          width: auto;
          min-height: auto;
          margin: 0;
          box-shadow: none;
          padding: 0;
        }
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
          ${report.labInfo.name ? `<h1>${escapeHtml(report.labInfo.name)}</h1>` : ""}
          ${report.labInfo.address ? `<p>${escapeHtml(report.labInfo.address)}</p>` : ""}
          ${labContact ? `<p>${escapeHtml(labContact)}</p>` : ""}
          ${report.labInfo.headerText ? `<p>${escapeHtml(report.labInfo.headerText)}</p>` : ""}
        </div>` : ""}
        <div class="meta-grid">
          <div class="meta-block">
            <div class="meta-row"><span class="meta-label">Date Of Birth</span><span>:</span><span class="meta-value">${escapeHtml(formatDate(report.patient.dateOfBirth))}</span></div>
            <div class="meta-row"><span class="meta-label">Gender</span><span>:</span><span class="meta-value">${escapeHtml(report.patient.gender)}</span></div>
            ${report.patient.phone ? `<div class="meta-row"><span class="meta-label">Phone</span><span>:</span><span class="meta-value">${escapeHtml(report.patient.phone)}</span></div>` : ""}
            ${report.patient.location ? `<div class="meta-row"><span class="meta-label">Location</span><span>:</span><span class="meta-value">${escapeHtml(report.patient.location)}</span></div>` : ""}
          </div>
          <div class="meta-block">
            <div class="meta-row"><span class="meta-label">Patient</span><span>:</span><span class="meta-value">${escapeHtml(report.patient.fullName)}</span></div>
            <div class="meta-row"><span class="meta-label">Case No.</span><span>:</span><span class="meta-value">${escapeHtml(report.caseNo)}</span></div>
            <div class="meta-row"><span class="meta-label">Ref / M.D.</span><span>:</span><span class="meta-value">${escapeHtml(refValue)}</span></div>
            <div class="meta-row"><span class="meta-label">Date &amp; Time</span><span>:</span><span class="meta-value">${escapeHtml(formatDateTime(report.visitDate))}</span></div>
          </div>
        </div>

        <table>
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
        ${showLabFooter ? `<div class="report-footer">${escapeHtml(report.labInfo.footerText)}</div>` : ""}
      </div>
    </div>
    <script>
      (() => {
        let recorded = false;
        async function recordPrint() {
          if (recorded) return;
          recorded = true;
          try {
            await fetch("/api/lab/reports/${encodeURIComponent(report.visitId)}/print", {
              method: "POST",
              headers: { "Content-Type": "application/json" }
            });
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(
                { type: "lab-report-printed", visitId: "${escapeHtml(report.visitId)}" },
                window.location.origin
              );
            }
          } catch {}
        }
        window.addEventListener("beforeprint", () => {
          void recordPrint();
        });
      })();
    </script>
  </body>
</html>`;
}

export default function LabEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const handledCreateVisitQueryRef = useRef("");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [history, setHistory] = useState<VisitHistoryItem[]>([]);
  const [template, setTemplate] = useState<Template>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<Patient[]>([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(5);
  const [duplicatePage, setDuplicatePage] = useState(1);
  const [duplicatePageSize, setDuplicatePageSize] = useState(5);
  const [panelPage, setPanelPage] = useState(1);
  const [panelPageSize, setPanelPageSize] = useState(3);
  const [currentStep, setCurrentStep] = useState<"patient" | "report" | "results">("patient");
  const [historyRefreshLoading, setHistoryRefreshLoading] = useState(false);
  const [visitId, setVisitId] = useState("");
  const [caseNo, setCaseNo] = useState("");
  const [activeDepartment, setActiveDepartment] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [createPatientOpen, setCreatePatientOpen] = useState(false);
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [createPatientErrors, setCreatePatientErrors] = useState<Record<string, string>>({});
  const [editPatientErrors, setEditPatientErrors] = useState<Record<string, string>>({});
  const [newResultInputErrors, setNewResultInputErrors] = useState<Record<string, string>>({});
  const [addResultInputOpen, setAddResultInputOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [newPatient, setNewPatient] = useState({
    fullName: "",
    firstName: "",
    fatherName: "",
    lastName: "",
    gender: "Unknown" as "Male" | "Female" | "Other" | "Unknown",
    dateOfBirth: "",
    phone: "",
    location: "",
  });
  const [editPatient, setEditPatient] = useState({
    patientId: "",
    fullName: "",
    firstName: "",
    fatherName: "",
    lastName: "",
    gender: "Unknown" as "Male" | "Female" | "Other" | "Unknown",
    dateOfBirth: "",
    phone: "",
    location: "",
  });
  const [newResultInput, setNewResultInput] = useState({
    panelId: "",
    displayName: "",
    resultType: "number" as "number" | "text" | "select" | "boolean",
    unit: "",
    rangeText: "",
  });

  const loadPatients = async (): Promise<Patient[]> => {
    const data = await apiGet<Patient[]>("/api/lab/patients?limit=1000");
    setPatients(data);
    return data;
  };

  const loadHistory = async (patientId: string) => {
    if (!patientId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await apiGet<VisitHistoryItem[]>(
        `/api/lab/visits?patientId=${encodeURIComponent(patientId)}&limit=25`
      );
      setHistory(data);
    } catch (error: any) {
      setHistory([]);
      toast({
        title: "History unavailable",
        description: error?.message || "Could not load patient history",
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshHistory = async () => {
    if (!selectedPatientId) {
      toast({
        title: "No patient selected",
        description: "Select a patient first.",
        variant: "destructive",
      });
      return;
    }

    setHistoryRefreshLoading(true);
    try {
      await loadHistory(selectedPatientId);
      toast({
        title: "History refreshed",
        description: "Report history was updated.",
      });
    } finally {
      setHistoryRefreshLoading(false);
    }
  };

  const loadVisitIntoEditor = async (targetVisitId: string) => {
    setIsLoading(true);
    try {
      const payload = await apiGet<VisitEditorPayload>(
        `/api/lab/visits/${encodeURIComponent(targetVisitId)}`
      );
      setVisitId(payload.visit.visitId);
      setCaseNo(payload.visit.caseNo);
      setSelectedPatientId(payload.visit.patientId);
      setPatientSearch(payload.visit.patientName);
      setTemplate(payload.template);
      setResults(payload.results);
      setActiveDepartment(payload.template[0]?.departmentId || "");
      setCurrentStep("results");
      toast({
        title: "Report loaded",
        description: `Case ${payload.visit.caseNo} is open in the editor.`,
      });
    } catch (error: any) {
      toast({
        title: "Load failed",
        description: error?.message || "Could not open report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createVisitForm = async (patientIdOverride?: string) => {
    const targetPatientId = patientIdOverride || selectedPatientId;

    if (!targetPatientId) {
      toast({
        title: "Select a patient first",
        description: "Choose or create the patient before starting a new report.",
        variant: "destructive",
      });
      return;
    }

    router.push(
      `/lab-entry/patients/${encodeURIComponent(targetPatientId)}/quick-report`
    );
  };

  const createPatient = async () => {
    const fullName = buildPatientFullName(newPatient);
    const nextFieldErrors = getYupFieldErrors(patientRequiredSchema, {
      ...newPatient,
      gender: newPatient.gender === "Unknown" ? undefined : newPatient.gender,
    });
    setCreatePatientErrors(nextFieldErrors);
    const validationErrors = Object.values(nextFieldErrors);
    if (validationErrors.length > 0) {
      toast({
        title: "Required fields missing",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatePatientErrors({});
      const createdPatient = await apiPost<Patient>("/api/lab/patients", {
        fullName,
        firstName: newPatient.firstName,
        fatherName: newPatient.fatherName,
        lastName: newPatient.lastName,
        gender: newPatient.gender,
        dateOfBirth: normalizePatientDobForStorage(newPatient.dateOfBirth) || null,
        phone: newPatient.phone || null,
        location: newPatient.location || null,
      });
      await loadPatients();
      setSelectedPatientId(createdPatient.patientId);
      setPatientSearch(createdPatient.fullName);
      setCurrentStep("report");
      setCreatePatientOpen(false);
      setNewPatient({
        fullName: "",
        firstName: "",
        fatherName: "",
        lastName: "",
        gender: "Unknown",
        dateOfBirth: "",
        phone: "",
        location: "",
      });
      setDuplicateMatches([]);
      toast({
        title: "Patient created",
        description: `${createdPatient.fullName} added and selected.`,
      });
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error?.message || "Could not create patient",
        variant: "destructive",
      });
    }
  };

  const openEditPatient = () => {
    if (!selectedPatient) return;
    setEditPatient({
      patientId: selectedPatient.patientId,
      fullName: selectedPatient.fullName,
      firstName: selectedPatient.firstName || "",
      fatherName: selectedPatient.fatherName || "",
      lastName: selectedPatient.lastName || "",
      gender: selectedPatient.gender,
      dateOfBirth: formatPatientDobInput(selectedPatient.dateOfBirth),
      phone: selectedPatient.phone || "",
      location: selectedPatient.location || "",
    });
    setEditPatientOpen(true);
  };

  const savePatientChanges = async () => {
    if (!editPatient.patientId) return;
    const fullName = buildPatientFullName(editPatient);
    const nextFieldErrors = getYupFieldErrors(patientRequiredSchema, {
      ...editPatient,
      gender: editPatient.gender === "Unknown" ? undefined : editPatient.gender,
    });
    setEditPatientErrors(nextFieldErrors);
    const validationErrors = Object.values(nextFieldErrors);
    if (validationErrors.length > 0) {
      toast({
        title: "Required fields missing",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    try {
      setEditPatientErrors({});
      const updatedPatient = await apiPut<Patient>("/api/lab/patients", {
        patientId: editPatient.patientId,
        fullName,
        firstName: editPatient.firstName,
        fatherName: editPatient.fatherName,
        lastName: editPatient.lastName,
        gender: editPatient.gender,
        dateOfBirth: normalizePatientDobForStorage(editPatient.dateOfBirth) || null,
        phone: editPatient.phone || null,
        location: editPatient.location || null,
      });
      await loadPatients();
      setSelectedPatientId(updatedPatient.patientId);
      setPatientSearch(updatedPatient.fullName);
      setEditPatientOpen(false);
      toast({
        title: "Patient updated",
        description: `${updatedPatient.fullName} details were updated.`,
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update patient",
        variant: "destructive",
      });
    }
  };

  const saveDraft = async () => {
    if (!visitId) {
      toast({
        title: "No active report",
        description: "Create or open a report first.",
        variant: "destructive",
      });
      return;
    }

    const entries = Object.entries(results).map(([testId, value]) => ({
      testId,
      value,
    }));

    setIsSaving(true);
    try {
      await apiPost("/api/lab/results", { visitId, entries });
      if (selectedPatientId) await loadHistory(selectedPatientId);
      toast({
        title: "Report saved",
        description: "Results were saved under this patient report.",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Could not save results",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openPrintableReport = async (targetVisitId: string, saveCurrent = false) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Preview failed",
        description: "Could not open report preview window",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>Preparing report...</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh;font-family:Arial,sans-serif;background:#f5f1ea;color:#111;}</style></head><body><div>Preparing report preview...</div></body></html>`);
    printWindow.document.close();

    setIsSaving(true);
    try {
      if (saveCurrent && visitId) {
        const entries = Object.entries(results).map(([testId, value]) => ({
          testId,
          value,
        }));
        await apiPost("/api/lab/results", { visitId, entries });
      }

      const report = await apiGet<PrintableLabReport>(
        `/api/lab/reports/${encodeURIComponent(targetVisitId)}`
      );

      printWindow.document.open();
      printWindow.document.write(buildPrintableReportHtml(report));
      printWindow.document.close();

      toast({
        title: "Report preview ready",
        description: "Opened the printable report with last results.",
      });
    } catch (error: any) {
      printWindow.document.open();
      printWindow.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>Report preview failed</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh;font-family:Arial,sans-serif;background:#fff;color:#111;}.message{max-width:560px;padding:24px;text-align:center;}.title{font-size:18px;font-weight:700;margin-bottom:8px;}</style></head><body><div class="message"><div class="title">Could not generate the report preview.</div><div>${escapeHtml(error?.message || "Unknown error")}</div></div></body></html>`);
      printWindow.document.close();
      toast({
        title: "Preview failed",
        description: error?.message || "Could not generate the report preview",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalInputs = useMemo(
    () =>
      template.reduce(
        (sum, department) =>
          sum + department.panels.reduce((pSum, panel) => pSum + panel.tests.length, 0),
        0
      ),
    [template]
  );

  const filledInputs = useMemo(
    () => Object.values(results).filter((value) => String(value).trim().length > 0).length,
    [results]
  );

  const departmentStats = useMemo(
    () =>
      template.map((department) => {
        const tests = department.panels.flatMap((panel) => panel.tests);
        const total = tests.length;
        const filled = tests.filter((test) => String(results[test.testId] || "").trim()).length;
        return { departmentId: department.departmentId, total, filled };
      }),
    [template, results]
  );

  const filteredPatients = useMemo(() => {
    const qRaw = patientSearch.trim();
    if (!qRaw) return [];

    const q = normalizeText(qRaw);
    const qTokens = q.split(" ").filter(Boolean);
    const qCompact = q.replace(/\s+/g, "");

    return patients
      .map((patient) => {
        const fullName = normalizeText(patient.fullName || "");
        const nameTokens = fullName.split(" ").filter(Boolean);
        const compactName = fullName.replace(/\s+/g, "");
        const phone = normalizeText(patient.phone || "");
        const location = normalizeText(patient.location || "");
        const gender = normalizeText(patient.gender || "");
        const dob = normalizeText(patient.dateOfBirth || "");
        const initials = getInitials(patient.fullName || "");

        let score = 0;

        if (fullName === q) score += 500;
        if (compactName === qCompact && qCompact.length >= 3) score += 420;
        if (fullName.startsWith(q)) score += 220;
        if (fullName.includes(q)) score += 140;
        if (phone && phone.includes(qRaw.replace(/\s+/g, ""))) score += 190;
        if (location && location.includes(q)) score += 70;
        if (dob && dob.includes(q)) score += 80;
        if (gender.includes(q)) score += 30;
        if (initials && initials.startsWith(qCompact)) score += 100;

        for (const token of qTokens) {
          for (const nameToken of nameTokens) {
            if (nameToken === token) score += 100;
            else if (nameToken.startsWith(token)) score += 55;
            else if (nameToken.includes(token)) score += 30;
            else if (token.length >= 3 && isSubsequence(token, nameToken)) score += 16;
            else if (token.length >= 4) {
              const dist = levenshteinDistance(token, nameToken);
              if (dist <= 1) score += 24;
              else if (dist === 2) score += 12;
            }
          }
        }

        if (qCompact.length >= 3 && isSubsequence(qCompact, compactName)) score += 18;

        return { patient, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.patient.fullName.localeCompare(b.patient.fullName))
      .slice(0, 12)
      .map((row) => row.patient);
  }, [patients, patientSearch]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.patientId === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  const activeDepartmentPanels = useMemo(
    () => template.find((department) => department.departmentId === activeDepartment)?.panels || [],
    [template, activeDepartment]
  );

  const filteredTemplate = useMemo(
    () =>
      template.map((department) => ({
        ...department,
        panels: department.panels
          .map((panel) => ({
          ...panel,
          tests: panel.tests.filter((test) => {
            const q = testQuery.trim().toLowerCase();
            if (!q) return true;
            return (
              test.displayName.toLowerCase().includes(q) ||
              test.code.toLowerCase().includes(q)
            );
          }),
          }))
          .filter((panel) => panel.tests.length > 0 || !testQuery.trim()),
      })),
    [template, testQuery]
  );

  const activeFilteredDepartmentPanels = useMemo(
    () =>
      filteredTemplate.find((department) => department.departmentId === activeDepartment)?.panels || [],
    [filteredTemplate, activeDepartment]
  );

  const paginatedActiveDepartmentPanels = useMemo(() => {
    const start = (panelPage - 1) * panelPageSize;
    return activeFilteredDepartmentPanels.slice(start, start + panelPageSize);
  }, [activeFilteredDepartmentPanels, panelPage, panelPageSize]);

  const topSuggestion = filteredPatients[0] || null;
  const newPatientFullName = buildPatientFullName(newPatient);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.patientId);
    setPatientSearch(patient.fullName);
    setCurrentStep("report");
  };

  const similarFullNameMatches = useMemo(() => {
    const targetName = normalizeText(newPatientFullName);
    if (!createPatientOpen || targetName.length < 6) {
      return [];
    }

    return patients
      .map((patient) => {
        const candidateName = normalizeText(patient.fullName || "");
        if (!candidateName) return null;

        const exactMatch = candidateName === targetName;
        const includesMatch =
          candidateName.includes(targetName) || targetName.includes(candidateName);
        const distance = levenshteinDistance(targetName, candidateName);
        const maxLength = Math.max(targetName.length, candidateName.length);
        const closeDistance = maxLength > 0 && distance <= Math.max(2, Math.floor(maxLength * 0.12));

        if (!exactMatch && !includesMatch && !closeDistance) {
          return null;
        }

        let score = 0;
        if (exactMatch) score += 1000;
        if (includesMatch) score += 700;
        if (closeDistance) score += Math.max(0, 300 - distance * 60);

        return { patient, score };
      })
      .filter((item): item is { patient: Patient; score: number } => Boolean(item))
      .sort((a, b) => b.score - a.score || a.patient.fullName.localeCompare(b.patient.fullName))
      .slice(0, 5)
      .map((item) => item.patient);
  }, [createPatientOpen, newPatientFullName, patients]);

  const combinedDuplicateMatches = useMemo(() => {
    const seen = new Set<string>();
    const merged: Patient[] = [];

    for (const patient of [...duplicateMatches, ...similarFullNameMatches]) {
      if (seen.has(patient.patientId)) continue;
      seen.add(patient.patientId);
      merged.push(patient);
    }

    return merged;
  }, [duplicateMatches, similarFullNameMatches]);

  useEffect(() => {
    void loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      void loadHistory(selectedPatientId);
    } else {
      setHistory([]);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    const firstName = newPatient.firstName.trim();
    const fatherName = newPatient.fatherName.trim();
    const lastName = newPatient.lastName.trim();

    if (!createPatientOpen || !firstName || !lastName) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      setDuplicateLoading(true);
      try {
        const data = await apiGet<Patient[]>(
          `/api/lab/patients?duplicates=1&firstName=${encodeURIComponent(firstName)}&fatherName=${encodeURIComponent(fatherName)}&lastName=${encodeURIComponent(lastName)}&limit=5`
        );
        setDuplicateMatches(data);
      } catch {
        setDuplicateMatches([]);
      } finally {
        setDuplicateLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [createPatientOpen, newPatient.firstName, newPatient.fatherName, newPatient.lastName]);

  useEffect(() => {
    setHistoryPage(1);
  }, [history.length, selectedPatientId]);

  useEffect(() => {
    setDuplicatePage(1);
  }, [combinedDuplicateMatches.length]);

  useEffect(() => {
    setPanelPage(1);
  }, [activeDepartment, testQuery, activeFilteredDepartmentPanels.length]);

  useEffect(() => {
    if (!testQuery.trim()) return;
    if (activeFilteredDepartmentPanels.length > 0) return;

    const firstMatchingDepartment = filteredTemplate.find((department) => department.panels.length > 0);
    if (firstMatchingDepartment && firstMatchingDepartment.departmentId !== activeDepartment) {
      setActiveDepartment(firstMatchingDepartment.departmentId);
    }
  }, [activeDepartment, activeFilteredDepartmentPanels.length, filteredTemplate, testQuery]);

  const paginatedHistory = history.slice(
    (historyPage - 1) * historyPageSize,
    (historyPage - 1) * historyPageSize + historyPageSize
  );

  const paginatedCombinedDuplicateMatches = combinedDuplicateMatches.slice(
    (duplicatePage - 1) * duplicatePageSize,
    (duplicatePage - 1) * duplicatePageSize + duplicatePageSize
  );

  useEffect(() => {
    const patientIdFromQuery = searchParams.get("patientId") || "";
    if (!patientIdFromQuery) {
      return;
    }

    const existingPatient = patients.find((patient) => patient.patientId === patientIdFromQuery);
    if (existingPatient) {
      if (selectedPatientId !== existingPatient.patientId) {
        setSelectedPatientId(existingPatient.patientId);
      }
      if (!patientSearch.trim()) {
        setPatientSearch(existingPatient.fullName);
      }
      return;
    }

    let cancelled = false;
    const loadPatientFromQuery = async () => {
      try {
        const patient = await apiGet<Patient>(
          `/api/lab/patients/${encodeURIComponent(patientIdFromQuery)}`
        );
        if (cancelled) return;
        setPatients((current) => {
          if (current.some((item) => item.patientId === patient.patientId)) {
            return current;
          }
          return [patient, ...current];
        });
        setSelectedPatientId(patient.patientId);
        if (!patientSearch.trim()) {
          setPatientSearch(patient.fullName);
        }
      } catch (error: any) {
        if (cancelled) return;
        toast({
          title: "Patient unavailable",
          description: error?.message || "Could not load the selected patient",
          variant: "destructive",
        });
      }
    };

    void loadPatientFromQuery();
    return () => {
      cancelled = true;
    };
  }, [patients, patientSearch, searchParams, selectedPatientId, toast]);

  useEffect(() => {
    const patientIdFromQuery = searchParams.get("patientId") || "";
    const shouldCreateVisit = searchParams.get("createVisit") === "1";
    const createVisitKey = shouldCreateVisit ? `${patientIdFromQuery}:${selectedPatientId}` : "";

    if (
      !shouldCreateVisit ||
      !patientIdFromQuery ||
      selectedPatientId !== patientIdFromQuery ||
      handledCreateVisitQueryRef.current === createVisitKey
    ) {
      return;
    }

    handledCreateVisitQueryRef.current = createVisitKey;
    void createVisitForm(patientIdFromQuery);
  }, [searchParams, selectedPatientId]);

  const showCreatePatientFieldError = (name: string) =>
    createPatientErrors[name] ? <p className="text-sm text-destructive">{createPatientErrors[name]}</p> : null;

  const showEditPatientFieldError = (name: string) =>
    editPatientErrors[name] ? <p className="text-sm text-destructive">{editPatientErrors[name]}</p> : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lab Reports</h1>
        <p className="mt-1 text-muted-foreground">
          Find the patient, start or reopen a report, enter results, then print the final report.
        </p>
      </div>

      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { id: "patient" as const, label: "Find Patient" },
              { id: "report" as const, label: "Choose Report" },
              { id: "results" as const, label: "Enter Results" },
            ].map((step, index) => {
              const active = currentStep === step.id;
              const unlocked =
                step.id === "patient" ||
                (step.id === "report" && Boolean(selectedPatientId)) ||
                (step.id === "results" && Boolean(visitId));
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => setCurrentStep(step.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/10"
                      : unlocked
                        ? "border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/30"
                        : "cursor-not-allowed border-slate-200/60 bg-slate-50/30 opacity-60 dark:border-slate-800 dark:bg-slate-900/10"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Step {index + 1}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{step.label}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {currentStep === "patient" ? (
      <PatientIntakePanel
        title="Step 1. Find Or Create Patient"
        description="Search behaves like a predictive patient lookup. Start typing name, phone, date of birth, or initials."
        patientSearch={patientSearch}
        onPatientSearchChange={(value) => {
          setPatientSearch(value);
          if (selectedPatientId) {
            setSelectedPatientId("");
          }
        }}
        selectedPatientId={selectedPatientId}
        filteredPatients={filteredPatients}
        topSuggestion={topSuggestion}
        selectedPatient={selectedPatient}
        onSelectPatient={handleSelectPatient}
        onTopSuggestionAction={handleSelectPatient}
        onOpenCreatePatient={() => setCreatePatientOpen(true)}
        onOpenEditPatient={openEditPatient}
      />
      ) : null}

      {currentStep === "report" ? (
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Step 2. Start A New Report</CardTitle>
            <CardDescription>
              Start a new report for today, or reopen an older report from the history panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-start">
              <Button type="button" variant="outline" onClick={() => setCurrentStep("patient")}>
                Back To Patient
              </Button>
            </div>
            <Button onClick={() => void createVisitForm()} disabled={isLoading || !selectedPatientId}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing Report...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Create New Report
                </>
              )}
            </Button>

            {visitId ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                <div className="font-semibold">
                  Active Report: {caseNo}
                </div>
                <div className="mt-1 text-muted-foreground">
                  Report ID: {visitId} | Filled {filledInputs}/{totalInputs}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active report yet. Select a patient and create a new report, or open one from history.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Patient Report History</CardTitle>
                <CardDescription>
                  Previous reports stay saved under the patient. Open one to review or reprint it.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedPatientId || historyRefreshLoading}
                onClick={() => void refreshHistory()}
              >
                {historyRefreshLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh History
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedPatientId ? (
              <p className="text-sm text-muted-foreground">Select a patient to view report history.</p>
            ) : historyLoading ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No previous reports for this patient yet.</p>
            ) : (
              <div className="space-y-3">
                {paginatedHistory.map((item) => (
                  <div
                    key={item.visitId}
                    className={`rounded-lg border p-3 ${
                      item.visitId === visitId
                        ? "border-primary bg-primary/5"
                        : "border-slate-200/80 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{item.caseNo}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(item.visitDate)} | {item.resultCount} result
                          {item.resultCount === 1 ? "" : "s"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Printed {item.printCount} time{item.printCount === 1 ? "" : "s"}
                          {item.printedAt ? ` | Last print ${formatDateTime(item.printedAt)}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.physicianName || item.branch || item.status}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void loadVisitIntoEditor(item.visitId)}
                        >
                          <Clock3 className="mr-2 h-4 w-4" />
                          Open
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void openPrintableReport(item.visitId)}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <DataPagination
                  page={historyPage}
                  pageSize={historyPageSize}
                  totalItems={history.length}
                  pageSizeOptions={[5, 10, 20, 50]}
                  itemLabel="reports"
                  onPageChange={setHistoryPage}
                  onPageSizeChange={(value) => {
                    setHistoryPageSize(value);
                    setHistoryPage(1);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      ) : null}

      {currentStep === "results" ? (
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardHeader>
            <CardTitle>Step 3. Enter Results And Print</CardTitle>
            <CardDescription>
            Save the report while you work. Print generates the final report and includes each test’s last saved result from previous reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {visitId ? (
            <div className="space-y-4">
              <div className="flex justify-start">
                <Button type="button" variant="outline" onClick={() => setCurrentStep("report")}>
                  Back To Report
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Case: <span className="font-medium text-foreground">{caseNo}</span> | Report ID:{" "}
                <span className="font-medium text-foreground">{visitId}</span> | Filled:{" "}
                <span className="font-medium text-foreground">{filledInputs}/{totalInputs}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Search tests across all departments</Label>
                <Input
                  placeholder="Type test name/code..."
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setAddResultInputOpen(true)}
                  disabled={!activeDepartmentPanels.length}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Result Input
                </Button>
              </div>
              </div>

              <Tabs value={activeDepartment} onValueChange={setActiveDepartment}>
                <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
                  {template.map((department) => {
                    const stat = departmentStats.find(
                      (item) => item.departmentId === department.departmentId
                    );
                    const filled = stat?.filled ?? 0;
                    const total = stat?.total ?? 0;
                    return (
                      <TabsTrigger
                        key={department.departmentId}
                        value={department.departmentId}
                        className="rounded-lg border border-slate-300/70 bg-slate-50/90 px-2.5 py-1.5 text-left data-[state=active]:border-primary data-[state=active]:bg-primary/10 dark:border-slate-700 dark:bg-slate-900/40"
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-medium">{department.department}</span>
                          <span className="text-xs text-muted-foreground">
                            {filled}/{total} filled
                          </span>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {template.map((department) => (
                  <TabsContent key={department.departmentId} value={department.departmentId}>
                    <div className="space-y-6">
                      {(department.departmentId === activeDepartment ? paginatedActiveDepartmentPanels : []).map(
                        (panel: (typeof paginatedActiveDepartmentPanels)[number]) => (
                        <Card key={panel.panelId} className="border-slate-200/80 dark:border-slate-800">
                          <CardHeader>
                            <CardTitle className="text-lg">{panel.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-3 lg:grid-cols-2">
                              {panel.tests.map((test: (typeof panel.tests)[number]) => (
                                  <div
                                    key={test.testId}
                                    className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/20"
                                  >
                                    <div className="mb-2 text-sm font-semibold">{test.displayName}</div>
                                    <div className="flex items-center gap-3">
                                      {test.resultType === "boolean" ? (
                                        <select
                                          value={results[test.testId] ?? ""}
                                          onChange={(e) =>
                                            setResults((prev) => ({
                                              ...prev,
                                              [test.testId]: e.target.value,
                                            }))
                                          }
                                          className="h-9 w-40 rounded-md border border-slate-300/80 bg-slate-50/90 px-2.5 text-sm shadow-sm dark:border-slate-700/70 dark:bg-slate-900/40"
                                        >
                                          <option value="">-</option>
                                          <option value="Positive">Positive</option>
                                          <option value="Negative">Negative</option>
                                        </select>
                                      ) : (
                                        <Input
                                          className="h-9 w-40 text-sm"
                                          value={results[test.testId] ?? ""}
                                          type={test.resultType === "number" ? "number" : "text"}
                                          onChange={(e) =>
                                            setResults((prev) => ({
                                              ...prev,
                                              [test.testId]: e.target.value,
                                            }))
                                          }
                                        />
                                      )}
                                    </div>
                                    <div className="mt-2 text-sm text-muted-foreground">
                                      Unit: {test.unit || "-"} | Range:{" "}
                                      {test.range.text ||
                                        (test.range.min !== null || test.range.max !== null
                                          ? `${test.range.min ?? "-"} - ${test.range.max ?? "-"}`
                                          : "-")}
                                      {test.lastResult ? ` | Last: ${test.lastResult}` : ""}
                                    </div>
                                    </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {department.departmentId === activeDepartment ? (
                        <DataPagination
                          page={panelPage}
                          pageSize={panelPageSize}
                          totalItems={activeFilteredDepartmentPanels.length}
                          pageSizeOptions={[1, 2, 3, 5, 10]}
                          itemLabel="panels"
                          onPageChange={setPanelPage}
                          onPageSizeChange={(value) => {
                            setPanelPageSize(value);
                            setPanelPage(1);
                          }}
                        />
                      ) : null}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void saveDraft()} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Report
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void openPrintableReport(visitId, true)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing Report...
                    </>
                  ) : (
                    <>
                      <Printer className="mr-2 h-4 w-4" />
                      Print Final Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create or open a report to start entering category data.
            </p>
          )}
        </CardContent>
      </Card>
      ) : null}

      <Dialog open={createPatientOpen} onOpenChange={setCreatePatientOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Patient</DialogTitle>
            <DialogDescription>
              Enter the patient identity first, then add the optional demographic details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200/80 p-4 dark:border-slate-800">
              <div className="mb-3">
                <div className="text-sm font-semibold">Identity</div>
                <div className="text-xs text-muted-foreground">
                  Use the same name format patients are usually registered with.
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input
                    value={newPatient.firstName}
                    onChange={(e) =>
                      setNewPatient((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                        fullName: buildPatientFullName({ ...prev, firstName: e.target.value }),
                      }))
                    }
                    className={createPatientErrors.firstName ? "border-destructive" : undefined}
                  />
                  {showCreatePatientFieldError("firstName")}
                </div>
                <div className="space-y-2">
                  <Label>Father name</Label>
                  <Input
                    value={newPatient.fatherName}
                    onChange={(e) =>
                      setNewPatient((prev) => ({
                        ...prev,
                        fatherName: e.target.value,
                        fullName: buildPatientFullName({ ...prev, fatherName: e.target.value }),
                      }))
                    }
                    className={createPatientErrors.lastName ? "border-destructive" : undefined}
                  />
                  {showCreatePatientFieldError("lastName")}
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input
                    value={newPatient.lastName}
                    onChange={(e) =>
                      setNewPatient((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                        fullName: buildPatientFullName({ ...prev, lastName: e.target.value }),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {(duplicateLoading || combinedDuplicateMatches.length > 0) && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <div className="font-semibold">
                  {duplicateLoading
                    ? "Checking for similar patients..."
                    : "Warning: this patient may already exist"}
                </div>
                {!duplicateLoading && combinedDuplicateMatches.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    <div className="text-xs">
                      A very similar full name was found. Review these patients before creating a new one.
                    </div>
                    {paginatedCombinedDuplicateMatches.map((patient) => (
                      <div key={patient.patientId} className="rounded border border-amber-200 bg-white/70 p-2">
                        <div className="font-medium">{patient.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          DOB: {patient.dateOfBirth || "-"} | Phone: {patient.phone || "-"} | Location: {patient.location || "-"}
                        </div>
                      </div>
                    ))}
                    <DataPagination
                      page={duplicatePage}
                      pageSize={duplicatePageSize}
                      totalItems={combinedDuplicateMatches.length}
                      pageSizeOptions={[5, 10, 20]}
                      itemLabel="patients"
                      onPageChange={setDuplicatePage}
                      onPageSizeChange={(value) => {
                        setDuplicatePageSize(value);
                        setDuplicatePage(1);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            )}

            <div className="rounded-lg border border-slate-200/80 p-4 dark:border-slate-800">
              <div className="mb-3">
                <div className="text-sm font-semibold">Details</div>
                <div className="text-xs text-muted-foreground">
                  Optional fields to help distinguish patients with similar names.
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) =>
                      setNewPatient((prev) => ({
                        ...prev,
                        gender: e.target.value as "Male" | "Female" | "Other" | "Unknown",
                      }))
                    }
                    className={`h-9 w-full rounded-md border bg-slate-50/90 px-2.5 text-sm shadow-sm dark:bg-slate-900/40 ${
                      createPatientErrors.gender
                        ? "border-destructive"
                        : "border-slate-300/80 dark:border-slate-700/70"
                    }`}
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {showCreatePatientFieldError("gender")}
                </div>
                <div className="space-y-2">
                  <Label>Date of birth</Label>
                  <Input
                    value={newPatient.dateOfBirth}
                    onChange={(e) =>
                      setNewPatient((prev) => ({
                        ...prev,
                        dateOfBirth: formatPatientDobInput(e.target.value),
                      }))
                    }
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    className={createPatientErrors.dateOfBirth ? "border-destructive" : undefined}
                  />
                  {showCreatePatientFieldError("dateOfBirth")}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newPatient.phone}
                    onChange={(e) =>
                      setNewPatient((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className={createPatientErrors.phone ? "border-destructive" : undefined}
                  />
                  {showCreatePatientFieldError("phone")}
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={newPatient.location}
                    onChange={(e) =>
                      setNewPatient((prev) => ({ ...prev, location: e.target.value }))
                    }
                    className={createPatientErrors.location ? "border-destructive" : undefined}
                  />
                  {showCreatePatientFieldError("location")}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePatientOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createPatient()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editPatientOpen} onOpenChange={setEditPatientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>Update the selected patient details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input
                value={editPatient.firstName}
                onChange={(e) =>
                  setEditPatient((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                    fullName: buildPatientFullName({ ...prev, firstName: e.target.value }),
                  }))
                }
                className={editPatientErrors.firstName ? "border-destructive" : undefined}
              />
              {showEditPatientFieldError("firstName")}
            </div>
            <div className="space-y-2">
              <Label>Father name</Label>
              <Input
                value={editPatient.fatherName}
                onChange={(e) =>
                  setEditPatient((prev) => ({
                    ...prev,
                    fatherName: e.target.value,
                    fullName: buildPatientFullName({ ...prev, fatherName: e.target.value }),
                  }))
                }
                className={editPatientErrors.lastName ? "border-destructive" : undefined}
              />
              {showEditPatientFieldError("lastName")}
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input
                value={editPatient.lastName}
                onChange={(e) =>
                  setEditPatient((prev) => ({
                    ...prev,
                    lastName: e.target.value,
                    fullName: buildPatientFullName({ ...prev, lastName: e.target.value }),
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {/* <div className="space-y-2">
              <Label>Full name preview</Label>
              <Input
                value={buildPatientFullName(editPatient)}
                readOnly
              />
            </div> */}
            <div className="space-y-2">
              <Label>Gender</Label>
              <select
                value={editPatient.gender}
                onChange={(e) =>
                  setEditPatient((prev) => ({
                    ...prev,
                    gender: e.target.value as "Male" | "Female" | "Other" | "Unknown",
                  }))
                }
                className={`h-9 w-full rounded-md border bg-slate-50/90 px-2.5 text-sm shadow-sm dark:bg-slate-900/40 ${
                  editPatientErrors.gender
                    ? "border-destructive"
                    : "border-slate-300/80 dark:border-slate-700/70"
                }`}
              >
                <option value="Unknown">Unknown</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {showEditPatientFieldError("gender")}
            </div>
            <div className="space-y-2">
              <Label>Date of birth</Label>
              <Input
                value={editPatient.dateOfBirth}
                onChange={(e) =>
                  setEditPatient((prev) => ({
                    ...prev,
                    dateOfBirth: formatPatientDobInput(e.target.value),
                  }))
                }
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                className={editPatientErrors.dateOfBirth ? "border-destructive" : undefined}
              />
              {showEditPatientFieldError("dateOfBirth")}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editPatient.phone}
                onChange={(e) =>
                  setEditPatient((prev) => ({ ...prev, phone: e.target.value }))
                }
                className={editPatientErrors.phone ? "border-destructive" : undefined}
              />
              {showEditPatientFieldError("phone")}
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={editPatient.location}
                onChange={(e) =>
                  setEditPatient((prev) => ({ ...prev, location: e.target.value }))
                }
                className={editPatientErrors.location ? "border-destructive" : undefined}
              />
              {showEditPatientFieldError("location")}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPatientOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void savePatientChanges()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addResultInputOpen} onOpenChange={setAddResultInputOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Result Input</DialogTitle>
            <DialogDescription>
              Add a new input field to the current category for this and future forms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Panel</Label>
              <select
                value={newResultInput.panelId}
                onChange={(e) =>
                  setNewResultInput((prev) => ({ ...prev, panelId: e.target.value }))
                }
                className={`h-9 w-full rounded-md border bg-slate-50/90 px-2.5 text-sm shadow-sm dark:bg-slate-900/40 ${
                  newResultInputErrors.panelId
                    ? "border-destructive"
                    : "border-slate-300/80 dark:border-slate-700/70"
                }`}
              >
                <option value="">Select panel</option>
                {activeDepartmentPanels.map((p) => (
                  <option key={p.panelId} value={p.panelId}>
                    {p.name}
                  </option>
                ))}
              </select>
              {newResultInputErrors.panelId ? (
                <p className="text-sm text-destructive">{newResultInputErrors.panelId}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Input Name</Label>
              <Input
                value={newResultInput.displayName}
                onChange={(e) =>
                  setNewResultInput((prev) => ({
                    ...prev,
                    displayName: e.target.value,
                    }))
                }
                className={newResultInputErrors.displayName ? "border-destructive" : undefined}
              />
              {newResultInputErrors.displayName ? (
                <p className="text-sm text-destructive">{newResultInputErrors.displayName}</p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  value={newResultInput.resultType}
                  onChange={(e) =>
                    setNewResultInput((prev) => ({
                      ...prev,
                      resultType: e.target.value as "number" | "text" | "select" | "boolean",
                    }))
                  }
                  className="h-9 w-full rounded-md border border-slate-300/80 bg-slate-50/90 px-2.5 text-sm shadow-sm dark:border-slate-700/70 dark:bg-slate-900/40"
                >
                  <option value="number">number</option>
                  <option value="text">text</option>
                  <option value="select">select</option>
                  <option value="boolean">boolean</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={newResultInput.unit}
                  onChange={(e) =>
                    setNewResultInput((prev) => ({ ...prev, unit: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Range Text</Label>
                <Input
                  value={newResultInput.rangeText}
                  onChange={(e) =>
                    setNewResultInput((prev) => ({
                      ...prev,
                      rangeText: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddResultInputOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const nextFieldErrors = getYupFieldErrors(labInputSchema, {
                  panelId: newResultInput.panelId,
                  displayName: newResultInput.displayName,
                  resultType: newResultInput.resultType,
                });
                setNewResultInputErrors(nextFieldErrors);
                const validationErrors = Object.values(nextFieldErrors);
                if (validationErrors.length > 0) {
                  toast({
                    title: "Required fields missing",
                    description: validationErrors.join(", "),
                    variant: "destructive",
                  });
                  return;
                }
                try {
                  setNewResultInputErrors({});
                  const created = await apiPost<{ testId: string }>("/api/lab/catalog", {
                    action: "create_test",
                    payload: {
                      panelId: newResultInput.panelId,
                      displayName: newResultInput.displayName,
                      defaultUnit: newResultInput.unit,
                    },
                  });
                  await apiPost("/api/lab/catalog", {
                    action: "update_test",
                    payload: {
                      testId: created.testId,
                      displayName: newResultInput.displayName,
                      resultType: newResultInput.resultType,
                      defaultUnit: newResultInput.unit,
                      decimalPrecision: 2,
                      printOrder: 0,
                      active: true,
                    },
                  });
                  if (newResultInput.unit || newResultInput.rangeText) {
                    await apiPost("/api/lab/catalog", {
                      action: "create_range",
                      payload: {
                        testId: created.testId,
                        gender: "Any",
                        unit: newResultInput.unit || null,
                        rangeText: newResultInput.rangeText || null,
                      },
                    });
                  }
                  const patientId = selectedPatientId;
                  if (patientId) {
                    const formTemplate = await apiGet<Template>(
                      `/api/lab/form-template?patientId=${encodeURIComponent(patientId)}`
                    );
                    setTemplate(formTemplate);
                  }
                  setNewResultInput({
                    panelId: "",
                    displayName: "",
                    resultType: "number",
                    unit: "",
                    rangeText: "",
                  });
                  setAddResultInputOpen(false);
                  toast({
                    title: "Input added",
                    description: "New result input is now available in the form.",
                  });
                } catch (error: any) {
                  toast({
                    title: "Add failed",
                    description: error?.message || "Could not add input",
                    variant: "destructive",
                  });
                }
              }}
            >
              Add Input
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
