"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { DataPagination } from "@/components/ui/data-pagination";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportWorkbookToExcel } from "@/lib/excel-export";
import { Loader2 } from "lucide-react";

type Visit = {
  visitId: string;
  patientId: string;
  patientName: string;
  patientReportCount: number;
  caseNo: string;
  physicianName?: string | null;
  branch?: string | null;
  visitDate: string;
  status: "draft" | "ready" | "verified" | "printed";
  updatedAt: string;
};

type PrintableLabReport = {
  visitId: string;
  caseNo: string;
  visitDate: string;
  physicianName?: string | null;
  branch?: string | null;
  patient: {
    patientId: string;
    fullName: string;
    gender: string;
    dateOfBirth?: string | null;
    phone?: string | null;
    location?: string | null;
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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OverviewReportsPage() {
  const [reports, setReports] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("visitDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          limit: "100",
          q: query,
          status,
          sortBy,
          sortOrder,
        });
        const response = await fetch(`/api/lab/visits?${params.toString()}`, {
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Failed to load reports");
        setReports(body.data || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load reports");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [query, status, sortBy, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [query, status, sortBy, sortOrder]);

  const paginatedReports = useMemo(() => {
    const start = (page - 1) * pageSize;
    return reports.slice(start, start + pageSize);
  }, [reports, page, pageSize]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const detailedReports = await Promise.all(
        reports.map(async (report) => {
          const response = await fetch(`/api/lab/reports/${encodeURIComponent(report.visitId)}`, {
            cache: "no-store",
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(body?.error || `Failed to load report ${report.caseNo}`);
          }
          return body.data as PrintableLabReport;
        })
      );

      exportWorkbookToExcel({
        fileName: `reports-overview-${new Date().toISOString().slice(0, 10)}`,
        sheets: [
          {
            sheetName: "Reports Summary",
            rows: reports.map((report) => ({
              Patient: report.patientName,
              PatientID: report.patientId,
              CaseNo: report.caseNo,
              Reference: report.physicianName || report.branch || "",
              VisitDate: formatDateTime(report.visitDate),
              Status: report.status,
              ReportCount: report.patientReportCount,
              VisitID: report.visitId,
              UpdatedAt: formatDateTime(report.updatedAt),
            })),
          },
          {
            sheetName: "Report Details",
            rows: detailedReports.flatMap((report) =>
              report.departments.flatMap((department) =>
                department.panels.flatMap((panel) =>
                  panel.tests.map((test) => ({
                    Patient: report.patient.fullName,
                    PatientID: report.patient.patientId,
                    CaseNo: report.caseNo,
                    VisitID: report.visitId,
                    VisitDate: formatDateTime(report.visitDate),
                    Reference: report.physicianName || report.branch || "",
                    Department: department.department,
                    Panel: panel.name,
                    Test: test.displayName,
                    Code: test.code,
                    Value: test.value,
                    Unit: test.unit,
                    Range: test.rangeText,
                    LastResult: test.lastResult || "",
                    Flag: test.abnormalFlag || "",
                    PrintCount: report.printMeta.printCount,
                    PrintedAt: report.printMeta.printedAt
                      ? formatDateTime(report.printMeta.printedAt)
                      : "",
                  }))
                )
              )
            ),
          },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports Overview</CardTitle>
        <CardDescription>Recently saved reports across all patients.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        <DataTableToolbar
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search reports..."
          onExport={() => void handleExport()}
          exportLabel={isExporting ? "Exporting..." : "Export Excel"}
          exportDisabled={!reports.length || isExporting}
        >
          <NativeSelect
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="verified">Verified</option>
            <option value="printed">Printed</option>
          </NativeSelect>
          <NativeSelect
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="visitDate">Sort by date</option>
            <option value="patientName">Sort by patient</option>
            <option value="patientReportCount">Sort by patient reports</option>
            <option value="caseNo">Sort by case</option>
            <option value="status">Sort by status</option>
          </NativeSelect>
          <NativeSelect
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest / A-Z first</option>
          </NativeSelect>
        </DataTableToolbar>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading reports...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No reports found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReports.map((report) => (
                  <TableRow key={report.visitId}>
                    <TableCell>
                      <div className="font-medium">{report.patientName}</div>
                      <div className="text-xs text-muted-foreground">{report.patientId}</div>
                    </TableCell>
                    <TableCell>{report.caseNo}</TableCell>
                    <TableCell>{report.physicianName || report.branch || "-"}</TableCell>
                    <TableCell>{formatDateTime(report.visitDate)}</TableCell>
                    <TableCell><Badge variant="outline">{report.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/lab-entry/patients/${encodeURIComponent(report.patientId)}`}>Patient</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/lab-entry/patients/${encodeURIComponent(report.patientId)}/new-report?visitId=${encodeURIComponent(report.visitId)}`}>Open</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        {!isLoading ? (
          <DataPagination
            page={page}
            pageSize={pageSize}
            totalItems={reports.length}
            pageSizeOptions={[5, 10, 20, 50]}
            itemLabel="reports"
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
