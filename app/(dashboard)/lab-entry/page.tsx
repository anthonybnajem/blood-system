"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Save, UserPlus } from "lucide-react";

type Patient = {
  patientId: string;
  fullName: string;
  gender: "Male" | "Female" | "Other" | "Unknown";
  dateOfBirth?: string | null;
  phone?: string | null;
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

export default function LabEntryPage() {
  const { toast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [template, setTemplate] = useState<Template>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [visitId, setVisitId] = useState("");
  const [caseNo, setCaseNo] = useState("");
  const [activeDepartment, setActiveDepartment] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [addResultInputOpen, setAddResultInputOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [newPatient, setNewPatient] = useState({
    fullName: "",
    gender: "Unknown" as "Male" | "Female" | "Other" | "Unknown",
    dateOfBirth: "",
    phone: "",
  });
  const [visitMeta, setVisitMeta] = useState({
    physicianName: "",
    branch: "",
    notes: "",
  });
  const [newResultInput, setNewResultInput] = useState({
    panelId: "",
    displayName: "",
    resultType: "number" as "number" | "text" | "select" | "boolean",
    unit: "",
    rangeText: "",
  });

  const loadPatients = async (): Promise<Patient[]> => {
    const data = await apiGet<Patient[]>("/api/lab/patients?limit=500");
    setPatients(data);
    if (!selectedPatientId && data[0]?.patientId) {
      setSelectedPatientId(data[0].patientId);
    }
    return data;
  };

  const createVisitForm = async () => {
    setIsLoading(true);
    try {
      const data = await loadPatients();
      const patientId = selectedPatientId || data[0]?.patientId || "";

      if (!patientId) throw new Error("Please select a patient");

      const createdVisit = await apiPost<{
        visitId: string;
        caseNo: string;
      }>("/api/lab/visits", {
        patientId,
        physicianName: visitMeta.physicianName || null,
        branch: visitMeta.branch || null,
        notes: visitMeta.notes || null,
      });

      setVisitId(createdVisit.visitId);
      setCaseNo(createdVisit.caseNo);

      const formTemplate = await apiGet<Template>(
        `/api/lab/form-template?patientId=${encodeURIComponent(patientId)}`
      );
      setTemplate(formTemplate);
      setActiveDepartment(formTemplate[0]?.departmentId || "");
      setResults({});

      toast({
        title: "Visit form created",
        description: `Case ${createdVisit.caseNo} is ready for data entry.`,
      });
    } catch (error: any) {
      toast({
        title: "Could not create form",
        description: error?.message || "Failed to initialize lab form",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createClient = async () => {
    if (!newPatient.fullName.trim()) {
      toast({
        title: "Client name required",
        description: "Please enter full name",
        variant: "destructive",
      });
      return;
    }
    const createdPatient = await apiPost<Patient>("/api/lab/patients", {
      fullName: newPatient.fullName,
      gender: newPatient.gender,
      dateOfBirth: newPatient.dateOfBirth || null,
      phone: newPatient.phone || null,
    });
    await loadPatients();
    setSelectedPatientId(createdPatient.patientId);
    setPatientSearch(createdPatient.fullName);
    setCreateClientOpen(false);
    setNewPatient({
      fullName: "",
      gender: "Unknown",
      dateOfBirth: "",
      phone: "",
    });
    toast({
      title: "Client created",
      description: `${createdPatient.fullName} added and selected.`,
    });
  };

  const saveDraft = async () => {
    if (!visitId) {
      toast({
        title: "No active visit",
        description: "Create a visit form first.",
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
      toast({
        title: "Saved",
        description: "Lab results saved to draft visit.",
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

  const totalInputs = useMemo(
    () =>
      template.reduce(
        (sum, department) =>
          sum +
          department.panels.reduce((pSum, panel) => pSum + panel.tests.length, 0),
        0
      ),
    [template]
  );

  const filledInputs = useMemo(
    () => Object.values(results).filter((v) => String(v).trim().length > 0).length,
    [results]
  );

  const departmentStats = useMemo(() => {
    return template.map((department) => {
      const tests = department.panels.flatMap((p) => p.tests);
      const total = tests.length;
      const filled = tests.filter((t) => String(results[t.testId] || "").trim()).length;
      return {
        departmentId: department.departmentId,
        total,
        filled,
      };
    });
  }, [template, results]);

  const filteredPatients = useMemo(() => {
    const qRaw = patientSearch.trim();
    if (!qRaw) return patients;

    const q = normalizeText(qRaw);
    const qTokens = q.split(" ").filter(Boolean);
    const qCompact = q.replace(/\s+/g, "");

    const scored = patients
      .map((p) => {
        const fullName = normalizeText(p.fullName || "");
        const nameTokens = fullName.split(" ").filter(Boolean);
        const phone = normalizeText(p.phone || "");
        const gender = normalizeText(p.gender || "");
        const dob = normalizeText(p.dateOfBirth || "");

        let score = 0;

        if (fullName.includes(q)) score += 120;
        if (phone && phone.includes(q)) score += 90;
        if (gender.includes(q) || dob.includes(q)) score += 40;

        for (const token of qTokens) {
          for (const nameToken of nameTokens) {
            if (nameToken.startsWith(token)) score += 36;
            else if (nameToken.includes(token)) score += 24;
            else if (token.length >= 3 && isSubsequence(token, nameToken)) score += 14;
            else if (token.length >= 4) {
              const dist = levenshteinDistance(token, nameToken);
              if (dist <= 1) score += 18;
              else if (dist === 2) score += 10;
            }
          }
        }

        const compactName = fullName.replace(/\s+/g, "");
        if (qCompact.length >= 3 && isSubsequence(qCompact, compactName)) score += 12;

        return { patient: p, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.patient.fullName.localeCompare(b.patient.fullName))
      .map((row) => row.patient);

    return scored;
  }, [patients, patientSearch]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.patientId === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  const patientOptions = useMemo(() => {
    if (!selectedPatient) return filteredPatients;
    const exists = filteredPatients.some(
      (p) => p.patientId === selectedPatient.patientId
    );
    return exists ? filteredPatients : [selectedPatient, ...filteredPatients];
  }, [filteredPatients, selectedPatient]);

  const activeDepartmentPanels = useMemo(
    () => template.find((d) => d.departmentId === activeDepartment)?.panels || [],
    [template, activeDepartment]
  );

  useEffect(() => {
    void loadPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatientId && filteredPatients[0]?.patientId) {
      setSelectedPatientId(filteredPatients[0].patientId);
    }
  }, [selectedPatientId, filteredPatients]);

  useEffect(() => {
    if (
      patientSearch.trim() &&
      filteredPatients.length === 1 &&
      filteredPatients[0]!.patientId !== selectedPatientId
    ) {
      setSelectedPatientId(filteredPatients[0]!.patientId);
    }
  }, [patientSearch, filteredPatients, selectedPatientId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Lab Entry</h1>
        <p className="mt-1 text-muted-foreground">
          Patient information + category tabs + dynamic test inputs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Lab Entry Form</CardTitle>
          <CardDescription>
            Patient info, visit details, and lab entry inputs in one form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2 space-y-2">
              <Label>Client Search</Label>
              <Input
                placeholder="Search by name or phone..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              <div className="rounded-md border border-slate-200/90 bg-slate-50/60 p-1 dark:border-slate-800 dark:bg-slate-900/20">
                {filteredPatients.length > 0 ? (
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {filteredPatients.slice(0, 12).map((p) => {
                      const isSelected = p.patientId === selectedPatientId;
                      return (
                        <button
                          key={p.patientId}
                          type="button"
                          onClick={() => {
                            setSelectedPatientId(p.patientId);
                            setPatientSearch(p.fullName);
                          }}
                          className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm transition ${
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-transparent bg-background/80 hover:border-slate-300 hover:bg-background dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="font-medium">{p.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.phone || "-"} | {p.gender} | DOB: {p.dateOfBirth || "-"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No client found. Use Create Client.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCreateClientOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Client
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Client</Label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300/80 bg-slate-50/90 px-2.5 text-sm shadow-sm dark:border-slate-700/70 dark:bg-slate-900/40"
            >
              <option value="">Select client</option>
              {patientOptions.map((p) => (
                <option key={p.patientId} value={p.patientId}>
                  {p.fullName} {p.phone ? `• ${p.phone}` : ""} ({p.gender})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {filteredPatients.length} result{filteredPatients.length === 1 ? "" : "s"} (click a row above to select)
            </p>
          </div>

          {selectedPatient && (
            <div className="rounded-md border border-slate-200/80 bg-slate-50/60 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/20">
              <div className="font-medium">{selectedPatient.fullName}</div>
              <div className="text-muted-foreground">
                Gender: {selectedPatient.gender} {selectedPatient.phone ? `| Phone: ${selectedPatient.phone}` : ""}
              </div>
              <div className="text-muted-foreground">
                DOB: {selectedPatient.dateOfBirth || "-"}
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Physician</Label>
              <Input
                value={visitMeta.physicianName}
                onChange={(e) =>
                  setVisitMeta((prev) => ({ ...prev, physicianName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input
                value={visitMeta.branch}
                onChange={(e) =>
                  setVisitMeta((prev) => ({ ...prev, branch: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={visitMeta.notes}
                onChange={(e) =>
                  setVisitMeta((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <Button onClick={() => void createVisitForm()} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing Form...
              </>
            ) : (
              "Create Visit Form"
            )}
          </Button>

          <div className="my-2 h-px w-full bg-border" />

          {visitId ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Case: <span className="font-medium text-foreground">{caseNo}</span> | Visit:{" "}
                <span className="font-medium text-foreground">{visitId}</span> | Filled:{" "}
                <span className="font-medium text-foreground">
                  {filledInputs}/{totalInputs}
                </span>
              </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2 space-y-2">
                <Label>Search test in current category</Label>
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
                {template.map((department) => (
                  (() => {
                    const stat = departmentStats.find(
                      (s) => s.departmentId === department.departmentId
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
                  })()
                ))}
              </TabsList>

              {template.map((department) => (
                <TabsContent key={department.departmentId} value={department.departmentId}>
                  <div className="space-y-6">
                    {department.panels.map((panel) => (
                      <Card key={panel.panelId} className="border-slate-200/80 dark:border-slate-800">
                        <CardHeader>
                          <CardTitle className="text-lg">{panel.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 lg:grid-cols-2">
                            {panel.tests
                              .filter((test) => {
                                const q = testQuery.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  test.displayName.toLowerCase().includes(q) ||
                                  test.code.toLowerCase().includes(q)
                                );
                              })
                              .map((test) => (
                                <div
                                  key={test.testId}
                                  className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/20"
                                >
                                  <div className="mb-2 text-sm font-semibold">
                                    {test.displayName}
                                  </div>
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
                                        : "-")}{" "}
                                    | Last: {test.lastResult || "-"}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <Button onClick={() => void saveDraft()} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a visit form to start entering category data.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Client</DialogTitle>
            <DialogDescription>Add new client/patient to use in this form.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                value={newPatient.fullName}
                onChange={(e) =>
                  setNewPatient((prev) => ({ ...prev, fullName: e.target.value }))
                }
              />
            </div>
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
                className="h-9 w-full rounded-md border border-slate-300/80 bg-slate-50/90 px-2.5 text-sm shadow-sm dark:border-slate-700/70 dark:bg-slate-900/40"
              >
                <option value="Unknown">Unknown</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date of birth</Label>
              <Input
                type="date"
                value={newPatient.dateOfBirth}
                onChange={(e) =>
                  setNewPatient((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newPatient.phone}
                onChange={(e) =>
                  setNewPatient((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateClientOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createClient()}>Create</Button>
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
                className="h-9 w-full rounded-md border border-slate-300/80 bg-slate-50/90 px-2.5 text-sm shadow-sm dark:border-slate-700/70 dark:bg-slate-900/40"
              >
                <option value="">Select panel</option>
                {activeDepartmentPanels.map((p) => (
                  <option key={p.panelId} value={p.panelId}>
                    {p.name}
                  </option>
                ))}
              </select>
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
              />
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
                if (!newResultInput.panelId || !newResultInput.displayName.trim()) {
                  toast({
                    title: "Missing fields",
                    description: "Panel and input name are required.",
                    variant: "destructive",
                  });
                  return;
                }
                try {
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
