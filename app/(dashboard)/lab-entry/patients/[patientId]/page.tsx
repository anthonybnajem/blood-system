"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Loader2, Printer, RefreshCw, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  buildPrintableReportHtml,
  formatDate,
  formatDateTime,
  type PrintableLabReport,
} from "@/lib/lab-print-report";
import { openDesktopPrintPreview } from "@/lib/electron-utils";

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
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
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

type ReportActivityItem = {
  auditId: string;
  visitId: string;
  caseNo: string;
  action: "create" | "update" | "delete" | "unlock" | "verify" | "print";
  actorName?: string | null;
  timestamp: string;
  status?: string | null;
  reason?: string | null;
};

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Request failed");
  return body.data as T;
}

async function apiDelete<T>(url: string, payload?: any): Promise<T> {
  const response = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Request failed");
  return body.data as T;
}


export default function LabEntryPatientPage() {
  const params = useParams<{ patientId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const patientId = typeof params.patientId === "string" ? params.patientId : "";

  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<VisitHistoryItem[]>([]);
  const [activity, setActivity] = useState<ReportActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [printingVisitId, setPrintingVisitId] = useState("");
  const [deletingVisitId, setDeletingVisitId] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(5);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(5);
  const [refreshingTables, setRefreshingTables] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setHistoryLoading(true);
      try {
        const [patientData, historyData, activityData] = await Promise.all([
          apiGet<Patient>(`/api/lab/patients/${encodeURIComponent(patientId)}`),
          apiGet<VisitHistoryItem[]>(`/api/lab/visits?patientId=${encodeURIComponent(patientId)}&limit=50`),
          apiGet<ReportActivityItem[]>(
            `/api/lab/report-activity?patientId=${encodeURIComponent(patientId)}&limit=100`
          ),
        ]);

        if (cancelled) return;
        setPatient(patientData);
        setHistory(historyData);
        setActivity(activityData);
      } catch (error: any) {
        if (cancelled) return;
        setPatient(null);
        setHistory([]);
        setActivity([]);
        toast({
          title: "Could not load patient",
          description: error?.message || "Failed to load patient data",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHistoryLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [patientId, toast]);

  useEffect(() => {
    setHistoryPage(1);
  }, [history.length]);

  useEffect(() => {
    setActivityPage(1);
  }, [activity.length]);

  const paginatedHistory = history.slice(
    (historyPage - 1) * historyPageSize,
    (historyPage - 1) * historyPageSize + historyPageSize
  );

  const paginatedActivity = activity.slice(
    (activityPage - 1) * activityPageSize,
    (activityPage - 1) * activityPageSize + activityPageSize
  );

  const openPrintableReport = async (targetVisitId: string) => {
    setPrintingVisitId(targetVisitId);
    try {
      const report = await apiGet<PrintableLabReport>(
        `/api/lab/reports/${encodeURIComponent(targetVisitId)}`
      );
      const reportHtml = buildPrintableReportHtml(report);
      const openedInDesktop = await openDesktopPrintPreview({
        html: reportHtml,
        title: `Lab Report ${report.caseNo}`,
        baseUrl: window.location.origin,
      });

      if (!openedInDesktop) {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          throw new Error("Could not open report preview window");
        }
        printWindow.document.open();
        printWindow.document.write(reportHtml);
        printWindow.document.close();
      }

      toast({
        title: "Report preview ready",
        description: `Opened report ${report.caseNo}.`,
      });
    } catch (error: any) {
      toast({
        title: "Preview failed",
        description: error?.message || "Could not generate the report preview",
        variant: "destructive",
      });
    } finally {
      setPrintingVisitId("");
    }
  };

  const refreshTables = async () => {
    if (!patientId) return;
    const [historyData, activityData] = await Promise.all([
      apiGet<VisitHistoryItem[]>(`/api/lab/visits?patientId=${encodeURIComponent(patientId)}&limit=50`),
      apiGet<ReportActivityItem[]>(
        `/api/lab/report-activity?patientId=${encodeURIComponent(patientId)}&limit=100`
      ),
    ]);
    setHistory(historyData);
    setActivity(activityData);
  };

  const refreshTablesFromButton = async () => {
    if (!patientId) {
      toast({
        title: "Patient unavailable",
        description: "Open a patient first.",
        variant: "destructive",
      });
      return;
    }

    setRefreshingTables(true);
    try {
      await refreshTables();
      toast({
        title: "Tables refreshed",
        description: "Report history and activity were updated.",
      });
    } catch (error: any) {
      toast({
        title: "Refresh failed",
        description: error?.message || "Could not refresh report tables",
        variant: "destructive",
      });
    } finally {
      setRefreshingTables(false);
    }
  };

  const deleteReport = async (item: VisitHistoryItem) => {
    if (!patient) return;
    const confirmed = window.confirm(`Delete report ${item.caseNo}? This will remove its saved results.`);
    if (!confirmed) return;

    setDeletingVisitId(item.visitId);
    try {
      await apiDelete(`/api/lab/visits/${encodeURIComponent(item.visitId)}`, {
        reason: "Deleted from patient report history",
      });
      await refreshTables();
      toast({
        title: "Report deleted",
        description: `Case ${item.caseNo} was removed and logged in report activity.`,
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete report",
        variant: "destructive",
      });
    } finally {
      setDeletingVisitId("");
    }
  };

  const renderActionLabel = (action: ReportActivityItem["action"]) => {
    if (action === "create") return "Created";
    if (action === "update") return "Updated";
    if (action === "delete") return "Deleted";
    if (action === "print") return "Printed";
    if (action === "verify") return "Verified";
    if (action === "unlock") return "Unlocked";
    return action;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/lab-entry/search">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Link>
        </Button>

        <Button
          type="button"
          disabled={!patient}
          onClick={() => {
            if (!patient) return;
            router.push(
              `/lab-entry/patients/${encodeURIComponent(patient.patientId)}/quick-report`
            );
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          Create New Report
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patient Page</h1>
        <p className="mt-1 text-muted-foreground">
          Review patient information and report history, or start a new report directly from here.
        </p>
      </div>

      {loading ? (
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading patient data...
          </CardContent>
        </Card>
      ) : !patient ? (
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardContent className="py-8 text-sm text-muted-foreground">
            Patient not found.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserRound className="h-5 w-5" />
                    {patient.fullName}
                  </CardTitle>
                  <CardDescription>All saved demographic data for this patient.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Patient selected",
                      description: `Selected ${patient.fullName}.`,
                    });
                    router.push(`/lab-entry/search?patientId=${encodeURIComponent(patient.patientId)}`);
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Select Patient
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Patient ID</div>
                <div className="mt-1 text-sm">{patient.patientId}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Gender</div>
                <div className="mt-1 text-sm">{patient.gender}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Date Of Birth</div>
                <div className="mt-1 text-sm">{formatDate(patient.dateOfBirth)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Phone</div>
                <div className="mt-1 text-sm">{patient.phone || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Location</div>
                <div className="mt-1 text-sm">{patient.location || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Last Updated</div>
                <div className="mt-1 text-sm">{formatDateTime(patient.updatedAt)}</div>
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notes</div>
                <div className="mt-1 text-sm">{patient.notes || "-"}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Report History</CardTitle>
                  <CardDescription>All reports saved under this patient in a table view.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={refreshingTables}
                  onClick={() => void refreshTablesFromButton()}
                >
                  {refreshingTables ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Tables
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {historyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading history...
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports created for this patient yet.</p>
              ) : (
                <div className="space-y-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Case</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead>Prints</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedHistory.map((item) => (
                        <TableRow key={item.visitId}>
                          <TableCell className="font-medium">{item.caseNo}</TableCell>
                          <TableCell>{formatDateTime(item.visitDate)}</TableCell>
                          <TableCell>{item.status}</TableCell>
                          <TableCell>
                            {item.resultCount} result{item.resultCount === 1 ? "" : "s"}
                          </TableCell>
                          <TableCell>
                            {item.printCount}
                            {item.printedAt ? ` | ${formatDateTime(item.printedAt)}` : ""}
                          </TableCell>
                          <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/lab-entry/patients/${encodeURIComponent(patient.patientId)}/new-report?visitId=${encodeURIComponent(item.visitId)}`
                                  )
                                }
                              >
                                <Clock3 className="mr-2 h-4 w-4" />
                                Open
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={printingVisitId === item.visitId}
                                onClick={() => void openPrintableReport(item.visitId)}
                              >
                                {printingVisitId === item.visitId ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Printer className="mr-2 h-4 w-4" />
                                )}
                                Print
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={deletingVisitId === item.visitId}
                                onClick={() => void deleteReport(item)}
                              >
                                {deletingVisitId === item.visitId ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Report Activity</CardTitle>
              <CardDescription>Create, update, print, and delete actions for this patient&apos;s reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {historyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading activity...
                </div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No report activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Case</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedActivity.map((item) => (
                        <TableRow key={item.auditId}>
                          <TableCell>{formatDateTime(item.timestamp)}</TableCell>
                          <TableCell className="font-medium">{item.caseNo || item.visitId}</TableCell>
                          <TableCell>{renderActionLabel(item.action)}</TableCell>
                          <TableCell>{item.status || "-"}</TableCell>
                          <TableCell>{item.actorName || "-"}</TableCell>
                          <TableCell>{item.reason || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <DataPagination
                    page={activityPage}
                    pageSize={activityPageSize}
                    totalItems={activity.length}
                    pageSizeOptions={[5, 10, 20, 50]}
                    itemLabel="events"
                    onPageChange={setActivityPage}
                    onPageSizeChange={(value) => {
                      setActivityPageSize(value);
                      setActivityPage(1);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
