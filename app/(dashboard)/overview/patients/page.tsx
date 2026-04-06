"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { DataPagination } from "@/components/ui/data-pagination";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportWorkbookToExcel } from "@/lib/excel-export";
import { Loader2 } from "lucide-react";

type Patient = {
  patientId: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender: string;
  phone?: string | null;
  location?: string | null;
  createdAt?: string;
  updatedAt: string;
};

type VisitHistoryItem = {
  visitId: string;
  caseNo: string;
  physicianName?: string | null;
  branch?: string | null;
  visitDate: string;
  status: string;
  resultCount: number;
  printCount: number;
  printedAt?: string | null;
  updatedAt: string;
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

export default function OverviewPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
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
          sortBy,
          sortOrder,
        });
        const response = await fetch(`/api/lab/patients?${params.toString()}`, {
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Failed to load patients");
        setPatients(body.data || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load patients");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [query, sortBy, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [query, sortBy, sortOrder]);

  const paginatedPatients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return patients.slice(start, start + pageSize);
  }, [patients, page, pageSize]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const patientReports = await Promise.all(
        patients.map(async (patient) => {
          const response = await fetch(
            `/api/lab/visits?patientId=${encodeURIComponent(patient.patientId)}&limit=100`,
            { cache: "no-store" }
          );
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(body?.error || `Failed to load reports for ${patient.fullName}`);
          }
          return {
            patient,
            reports: (body.data || []) as VisitHistoryItem[],
          };
        })
      );

      exportWorkbookToExcel({
        fileName: `patients-overview-${new Date().toISOString().slice(0, 10)}`,
        sheets: [
          {
            sheetName: "Patients",
            rows: patients.map((patient) => ({
              Name: patient.fullName,
              PatientID: patient.patientId,
              Gender: patient.gender,
              DateOfBirth: patient.dateOfBirth || "",
              Phone: patient.phone || "",
              Location: patient.location || "",
              CreatedAt: patient.createdAt ? formatDateTime(patient.createdAt) : "",
              UpdatedAt: formatDateTime(patient.updatedAt),
            })),
          },
          {
            sheetName: "Report Summaries",
            rows: patientReports.flatMap(({ patient, reports }) =>
              reports.map((report) => ({
                Patient: patient.fullName,
                PatientID: patient.patientId,
                CaseNo: report.caseNo,
                VisitID: report.visitId,
                VisitDate: formatDateTime(report.visitDate),
                Status: report.status,
                Reference: report.physicianName || report.branch || "",
                ResultCount: report.resultCount,
                PrintCount: report.printCount,
                PrintedAt: report.printedAt ? formatDateTime(report.printedAt) : "",
                UpdatedAt: formatDateTime(report.updatedAt),
              }))
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
        <CardTitle>Patients Overview</CardTitle>
        <CardDescription>Recently updated patients in the blood system.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        <DataTableToolbar
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search patients..."
          onExport={() => void handleExport()}
          exportLabel={isExporting ? "Exporting..." : "Export Excel"}
          exportDisabled={!patients.length || isExporting}
        >
          <NativeSelect
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="updatedAt">Sort by updated</option>
            <option value="fullName">Sort by name</option>
            <option value="gender">Sort by gender</option>
            <option value="location">Sort by location</option>
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
            Loading patients...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No patients found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPatients.map((patient) => (
                  <TableRow key={patient.patientId}>
                    <TableCell className="font-medium">{patient.fullName}</TableCell>
                    <TableCell>{patient.gender}</TableCell>
                    <TableCell>{patient.phone || "-"}</TableCell>
                    <TableCell>{patient.location || "-"}</TableCell>
                    <TableCell>{formatDateTime(patient.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/lab-entry/patients/${encodeURIComponent(patient.patientId)}`}>Open</Link>
                      </Button>
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
            totalItems={patients.length}
            pageSizeOptions={[5, 10, 20, 50]}
            itemLabel="patients"
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
