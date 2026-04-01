"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileText, Loader2, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  buildPrintableReportHtml,
  formatDate,
  type PrintableLabReport,
} from "@/lib/lab-print-report";
import { openDesktopPrintPreview } from "@/lib/electron-utils";
import { getYupFieldErrors, reportDetailsSchema } from "@/lib/yup-validation";

type Patient = {
  patientId: string;
  fullName: string;
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


export default function PatientNewReportPage() {
  const params = useParams<{ patientId: string }>();
  const searchParams = useSearchParams();
  const patientId = typeof params.patientId === "string" ? params.patientId : "";
  const targetVisitId = searchParams.get("visitId") || "";
  const { toast } = useToast();
  const createStartedRef = useRef(false);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visitId, setVisitId] = useState("");
  const [caseNo, setCaseNo] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [branch, setBranch] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [template, setTemplate] = useState<Template>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [activeDepartment, setActiveDepartment] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initError, setInitError] = useState("");
  const [panelPage, setPanelPage] = useState(1);
  const [panelPageSize, setPanelPageSize] = useState(3);
  const [reportFieldErrors, setReportFieldErrors] = useState<Record<string, string>>({});

  const getReportValidationErrors = () =>
    getYupFieldErrors(reportDetailsSchema, {
      caseNo,
      physicianName,
      visitDate,
    });

  const validateRequiredReportFields = () => {
    const validationErrors = getReportValidationErrors();
    setReportFieldErrors(validationErrors);
    const errorMessages = Object.values(validationErrors);
    if (errorMessages.length > 0) {
      toast({
        title: "Required fields missing",
        description: errorMessages.join(", "),
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const initializePage = async () => {
    if (!patientId) return;

    setIsLoading(true);
    setInitError("");
    try {
      const patientData = await apiGet<Patient>(
        `/api/lab/patients/${encodeURIComponent(patientId)}`
      );
      setPatient(patientData);

      if (targetVisitId) {
        const payload = await apiGet<VisitEditorPayload>(
          `/api/lab/visits/${encodeURIComponent(targetVisitId)}`
        );
        setVisitId(payload.visit.visitId);
        setCaseNo(payload.visit.caseNo);
        setPhysicianName(payload.visit.physicianName || "");
        setBranch(payload.visit.branch || "");
        setVisitDate(payload.visit.visitDate);
        setTemplate(payload.template);
        setResults(payload.results);
        setActiveDepartment(payload.template[0]?.departmentId || "");
        toast({
          title: "Report loaded",
          description: `Case ${payload.visit.caseNo} is ready for review.`,
        });
      } else {
        const createdVisit = await apiPost<{ visitId: string; caseNo: string }>(
          "/api/lab/visits",
          { patientId }
        );
        const formTemplate = await apiGet<Template>(
          `/api/lab/form-template?patientId=${encodeURIComponent(patientId)}`
        );

        setVisitId(createdVisit.visitId);
        setCaseNo(createdVisit.caseNo);
        setPhysicianName("");
        setBranch("");
        setVisitDate(new Date().toISOString());
        setTemplate(formTemplate);
        setResults({});
        setActiveDepartment(formTemplate[0]?.departmentId || "");
        toast({
          title: "New report created",
          description: `Case ${createdVisit.caseNo} is ready for result entry.`,
        });
      }
    } catch (error: any) {
      setInitError(error?.message || "Could not initialize the report form");
      toast({
        title: "Report setup failed",
        description: error?.message || "Could not initialize the report form",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    createStartedRef.current = false;
  }, [patientId, targetVisitId]);

  useEffect(() => {
    if (!patientId || createStartedRef.current) return;
    createStartedRef.current = true;
    void initializePage();
  }, [patientId, targetVisitId]);

  const totalInputs = useMemo(
    () =>
      template.reduce(
        (sum, department) =>
          sum + department.panels.reduce((panelSum, panel) => panelSum + panel.tests.length, 0),
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

  const filteredTemplate = useMemo(
    () =>
      template.map((department) => ({
        ...department,
        panels: department.panels.map((panel) => ({
          ...panel,
          tests: panel.tests.filter((test) => {
            const q = testQuery.trim().toLowerCase();
            if (!q) return true;
            return (
              test.displayName.toLowerCase().includes(q) ||
              test.code.toLowerCase().includes(q)
            );
          }),
        })),
      })),
    [template, testQuery]
  );

  const activeFilteredDepartment = useMemo(
    () =>
      filteredTemplate.find((department) => department.departmentId === activeDepartment) || null,
    [filteredTemplate, activeDepartment]
  );

  const paginatedActivePanels = useMemo(() => {
    const panels = activeFilteredDepartment?.panels || [];
    const start = (panelPage - 1) * panelPageSize;
    return panels.slice(start, start + panelPageSize);
  }, [activeFilteredDepartment, panelPage, panelPageSize]);

  useEffect(() => {
    setPanelPage(1);
  }, [activeDepartment, testQuery, activeFilteredDepartment?.panels.length]);

  useEffect(() => {
    if (!testQuery.trim()) return;
    if ((activeFilteredDepartment?.panels.length || 0) > 0) return;

    const firstMatchingDepartment = filteredTemplate.find((department) => department.panels.length > 0);
    if (firstMatchingDepartment && firstMatchingDepartment.departmentId !== activeDepartment) {
      setActiveDepartment(firstMatchingDepartment.departmentId);
    }
  }, [activeDepartment, activeFilteredDepartment?.panels.length, filteredTemplate, testQuery]);

  const saveDraft = async () => {
    if (!visitId) return;
    if (!validateRequiredReportFields()) return;

    const entries = Object.entries(results).map(([testId, value]) => ({
      testId,
      value,
    }));

    setIsSaving(true);
    try {
      const metadataResponse = await fetch(`/api/lab/visits/${encodeURIComponent(visitId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseNo,
          physicianName,
          branch,
          visitDate,
        }),
      });
      const metadataBody = await metadataResponse.json().catch(() => ({}));
      if (!metadataResponse.ok) {
        throw new Error(metadataBody?.error || "Could not save report details");
      }
      setReportFieldErrors({});

      await apiPost("/api/lab/results", { visitId, entries });
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

  const openPrintableReport = async (saveCurrent = false) => {
    if (!visitId) return;
    if (!validateRequiredReportFields()) return;

    setIsSaving(true);
    try {
      if (saveCurrent) {
        const entries = Object.entries(results).map(([testId, value]) => ({
          testId,
          value,
        }));
        await apiPost("/api/lab/results", { visitId, entries });
      }

      const report = await apiGet<PrintableLabReport>(
        `/api/lab/reports/${encodeURIComponent(visitId)}`
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
        description: "Opened the printable report with last results.",
      });
    } catch (error: any) {
      toast({
        title: "Preview failed",
        description: error?.message || "Could not generate the report preview",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={`/lab-entry/patients/${encodeURIComponent(patientId)}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patient Page
          </Link>
        </Button>
      </div>
{/* 
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Report</h1>
        <p className="mt-1 text-muted-foreground">
          Enter lab results for this patient report and print the final report.
        </p>
      </div> */}

      {isLoading ? (
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing patient report form...
          </CardContent>
        </Card>
      ) : initError ? (
        <Card className="border-slate-200/80 dark:border-slate-800">
          <CardContent className="space-y-4 py-8">
            <div className="text-sm text-muted-foreground">{initError}</div>
            <Button onClick={() => void initializePage()}>
              <FileText className="mr-2 h-4 w-4" />
              Retry Report Setup
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-slate-200/80 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Result Entry</CardTitle>
              <CardDescription>
                Save while you work. Printing uses the current report and shows last saved results from previous reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(reportFieldErrors).length > 0 ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  Please complete the required report details before saving or printing.
                </div>
              ) : null}
              <div className="text-sm text-muted-foreground">
                Case: <span className="font-medium text-foreground">{caseNo}</span> | Report ID:{" "}
                <span className="font-medium text-foreground">{visitId}</span> | Filled:{" "}
                <span className="font-medium text-foreground">{filledInputs}/{totalInputs}</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="case-no">Case No.</Label>
                  <Input id="case-no" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} className={reportFieldErrors.caseNo ? "border-destructive" : undefined} />
                  {reportFieldErrors.caseNo ? <p className="text-sm text-destructive">{reportFieldErrors.caseNo}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="physician-name">Ref / M.D.</Label>
                  <Input
                    id="physician-name"
                    value={physicianName}
                    onChange={(e) => setPhysicianName(e.target.value)}
                    placeholder="Dr. M. Farah"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch / Source</Label>
                  <Input
                    id="branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Main Lab"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-date">Date &amp; Time</Label>
                  <Input
                    id="visit-date"
                    type="datetime-local"
                    value={visitDate ? new Date(visitDate).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setVisitDate(e.target.value ? new Date(e.target.value).toISOString() : "")
                    }
                    className={reportFieldErrors.visitDate ? "border-destructive" : undefined}
                  />
                  {reportFieldErrors.visitDate ? <p className="text-sm text-destructive">{reportFieldErrors.visitDate}</p> : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Search tests across all departments</Label>
                <Input
                  placeholder="Type test name/code..."
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                />
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

                {filteredTemplate.map((department) => (
                  <TabsContent key={department.departmentId} value={department.departmentId}>
                    <div className="space-y-6">
                      {(department.departmentId === activeDepartment ? paginatedActivePanels : []).map((panel) => (
                        <Card key={panel.panelId} className="border-slate-200/80 dark:border-slate-800">
                          <CardHeader>
                            <CardTitle className="text-lg">{panel.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {panel.tests.length === 0 ? (
                              <div className="text-sm text-muted-foreground">No tests match the current search.</div>
                            ) : (
                              <div className="grid gap-3 lg:grid-cols-2">
                                {panel.tests.map((test) => (
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
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {department.departmentId === activeDepartment ? (
                        <DataPagination
                          page={panelPage}
                          pageSize={panelPageSize}
                          totalItems={activeFilteredDepartment?.panels.length || 0}
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
                <Button onClick={() => void saveDraft()} disabled={isSaving || !visitId}>
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
                  onClick={() => void openPrintableReport(true)}
                  disabled={isSaving || !visitId}
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
