"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, UserRound } from "lucide-react";
import { PatientIntakePanel } from "@/components/lab/patient-intake-panel";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { formatPatientDobInput, normalizePatientDobForStorage } from "@/lib/patient-dob";
import { getYupFieldErrors, patientRequiredSchema } from "@/lib/yup-validation";

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
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
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

const RECENT_PATIENT_IDS_KEY = "lab_entry_recent_patients";

export default function LabEntrySearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentPatientIds, setRecentPatientIds] = useState<string[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [createPatientOpen, setCreatePatientOpen] = useState(false);
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [createPatientErrors, setCreatePatientErrors] = useState<Record<string, string>>({});
  const [editPatientErrors, setEditPatientErrors] = useState<Record<string, string>>({});
  const [duplicateMatches, setDuplicateMatches] = useState<Patient[]>([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicatePage, setDuplicatePage] = useState(1);
  const [duplicatePageSize, setDuplicatePageSize] = useState(5);
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

  const loadPatients = async () => {
    const data = await apiGet<Patient[]>("/api/lab/patients?limit=1000");
    setPatients(data);
  };

  useEffect(() => {
    void loadPatients();
  }, []);

  useEffect(() => {
    const patientIdFromQuery = searchParams.get("patientId") || "";
    if (!patientIdFromQuery) return;

    const patient = patients.find((item) => item.patientId === patientIdFromQuery);
    if (!patient) return;

    setSelectedPatientId(patient.patientId);
    setPatientSearch(patient.fullName);
    rememberPatient(patient.patientId);
  }, [patients, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(RECENT_PATIENT_IDS_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      setRecentPatientIds(
        Array.isArray(parsed) ? parsed.map((value) => String(value)).filter(Boolean).slice(0, 5) : []
      );
    } catch {
      setRecentPatientIds([]);
    }
  }, []);

  const rememberPatient = (patientId: string) => {
    setRecentPatientIds((current) => {
      const next = [patientId, ...current.filter((id) => id !== patientId)].slice(0, 5);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(RECENT_PATIENT_IDS_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

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

  const topSuggestion = filteredPatients[0] || null;
  const recentPatients = useMemo(
    () => {
      const fromHistory = recentPatientIds
        .map((id) => patients.find((patient) => patient.patientId === id) || null)
        .filter((patient): patient is Patient => Boolean(patient));

      return fromHistory.length > 0 ? fromHistory : patients.slice(0, 5);
    },
    [patients, recentPatientIds]
  );
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.patientId === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

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
    setDuplicatePage(1);
  }, [duplicateMatches.length]);

  const paginatedDuplicateMatches = useMemo(() => {
    const start = (duplicatePage - 1) * duplicatePageSize;
    return duplicateMatches.slice(start, start + duplicatePageSize);
  }, [duplicateMatches, duplicatePage, duplicatePageSize]);

  const openPatientDetails = (patient: Patient | null) => {
    if (!patient) {
      toast({
        title: "No patient selected",
        description: "Select a patient first.",
        variant: "destructive",
      });
      return;
    }

    rememberPatient(patient.patientId);
    toast({
      title: "Patient selected",
      description: `Opening ${patient.fullName}.`,
    });
    router.push(`/lab-entry/patients/${encodeURIComponent(patient.patientId)}`);
  };

  const startPatientReport = (patient: Patient | null) => {
    if (!patient) {
      toast({
        title: "No patient selected",
        description: "Select a patient first.",
        variant: "destructive",
      });
      return;
    }

    rememberPatient(patient.patientId);
    toast({
      title: "Starting new report",
      description: `Preparing a new report for ${patient.fullName}.`,
    });
    router.push(`/lab-entry/patients/${encodeURIComponent(patient.patientId)}/quick-report`);
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
      rememberPatient(createdPatient.patientId);
      setCreatePatientOpen(false);
      setDuplicateMatches([]);
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

  const savePatientChanges = async () => {
    const fullName = buildPatientFullName(editPatient);
    if (!editPatient.patientId) {
      return;
    }
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
      rememberPatient(updatedPatient.patientId);
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

  return (
    <div className="space-y-6">
      {/* <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/lab-entry/search">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Patients
        </Link>
      </Button> */}

      <PatientIntakePanel
        title="Patients"
        description="Use the same predictive lookup as lab entry to search, select, create, or edit patients."
        patientSearch={patientSearch}
        onPatientSearchChange={setPatientSearch}
        selectedPatientId={selectedPatientId}
        filteredPatients={filteredPatients}
        emptySearchPatients={recentPatients}
        topSuggestion={topSuggestion}
        selectedPatient={selectedPatient}
        onSelectPatient={(patient) => {
          setSelectedPatientId(patient.patientId);
          setPatientSearch(patient.fullName);
          rememberPatient(patient.patientId);
        }}
        onOpenCreatePatient={() => setCreatePatientOpen(true)}
        onOpenEditPatient={openEditPatient}
        showSearchViewLink={false}
        topSuggestionActionLabel="Details"
        topSuggestionSecondaryActionLabel={
          topSuggestion && topSuggestion.patientId !== selectedPatientId ? "Select" : undefined
        }
        onTopSuggestionAction={(patient) => {
          rememberPatient(patient.patientId);
          router.push(`/lab-entry/patients/${encodeURIComponent(patient.patientId)}`);
        }}
        onTopSuggestionSecondaryAction={(patient) => {
          setSelectedPatientId(patient.patientId);
          setPatientSearch(patient.fullName);
          rememberPatient(patient.patientId);
        }}
        enableSearchPagination={false}
      />

      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Next step</div>
            <div className="text-sm text-muted-foreground">
              After selecting or creating a patient, either open the patient page with full report history or jump straight into a new report.
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={!selectedPatient}
              onClick={() => openPatientDetails(selectedPatient)}
            >
              <UserRound className="mr-2 h-4 w-4" />
              Patient Details
            </Button>
            <Button
              type="button"
              disabled={!selectedPatient}
              onClick={() => startPatientReport(selectedPatient)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create New Report
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={createPatientOpen} onOpenChange={setCreatePatientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Patient</DialogTitle>
            <DialogDescription>Add a new patient to use in this form.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input value={newPatient.firstName} onChange={(e) => setNewPatient((prev) => ({ ...prev, firstName: e.target.value, fullName: buildPatientFullName({ ...prev, firstName: e.target.value }) }))} className={createPatientErrors.firstName ? "border-destructive" : undefined} />
                {createPatientErrors.firstName ? <p className="text-sm text-destructive">{createPatientErrors.firstName}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Father name</Label>
                <Input value={newPatient.fatherName} onChange={(e) => setNewPatient((prev) => ({ ...prev, fatherName: e.target.value, fullName: buildPatientFullName({ ...prev, fatherName: e.target.value }) }))} />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input value={newPatient.lastName} onChange={(e) => setNewPatient((prev) => ({ ...prev, lastName: e.target.value, fullName: buildPatientFullName({ ...prev, lastName: e.target.value }) }))} className={createPatientErrors.lastName ? "border-destructive" : undefined} />
                {createPatientErrors.lastName ? <p className="text-sm text-destructive">{createPatientErrors.lastName}</p> : null}
              </div>
            </div>

            {(duplicateLoading || duplicateMatches.length > 0) && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <div className="font-semibold">{duplicateLoading ? "Checking for similar patients..." : "Warning: similar patients already exist"}</div>
                {!duplicateLoading && duplicateMatches.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {paginatedDuplicateMatches.map((patient) => (
                      <div key={patient.patientId} className="rounded border border-amber-200 bg-white/70 p-2">
                        <div className="font-medium">{patient.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          DOB: {patient.dateOfBirth || "-"} | Phone: {patient.phone || "-"} | Location: {patient.location || "-"}
                        </div>
                      </div>
                    ))}
                    {/* <DataPagination
                      page={duplicatePage}
                      pageSize={duplicatePageSize}
                      totalItems={duplicateMatches.length}
                      pageSizeOptions={[5, 10, 20]}
                      itemLabel="patients"
                      onPageChange={setDuplicatePage}
                      onPageSizeChange={(value) => {
                        setDuplicatePageSize(value);
                        setDuplicatePage(1);
                      }}
                    /> */}
                  </div>
                ) : null}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {/* <div className="space-y-2">
                <Label>Full name preview</Label>
                <Input value={buildPatientFullName(newPatient)} readOnly />
              </div> */}
              <div className="space-y-2">
                <Label>Gender</Label>
                <select value={newPatient.gender} onChange={(e) => setNewPatient((prev) => ({ ...prev, gender: e.target.value as "Male" | "Female" | "Other" | "Unknown" }))} className={`h-9 w-full rounded-md border bg-slate-50/90 px-2.5 text-sm shadow-sm dark:bg-slate-900/40 ${createPatientErrors.gender ? "border-destructive" : "border-slate-300/80 dark:border-slate-700/70"}`}>
                  <option value="Unknown">Unknown</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {createPatientErrors.gender ? <p className="text-sm text-destructive">{createPatientErrors.gender}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Date of birth</Label>
                <Input value={newPatient.dateOfBirth} onChange={(e) => setNewPatient((prev) => ({ ...prev, dateOfBirth: formatPatientDobInput(e.target.value) }))} inputMode="numeric" placeholder="DD/MM/YYYY" className={createPatientErrors.dateOfBirth ? "border-destructive" : undefined} />
                {createPatientErrors.dateOfBirth ? <p className="text-sm text-destructive">{createPatientErrors.dateOfBirth}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={newPatient.phone} onChange={(e) => setNewPatient((prev) => ({ ...prev, phone: e.target.value }))} className={createPatientErrors.phone ? "border-destructive" : undefined} />
                {createPatientErrors.phone ? <p className="text-sm text-destructive">{createPatientErrors.phone}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={newPatient.location} onChange={(e) => setNewPatient((prev) => ({ ...prev, location: e.target.value }))} className={createPatientErrors.location ? "border-destructive" : undefined} />
                {createPatientErrors.location ? <p className="text-sm text-destructive">{createPatientErrors.location}</p> : null}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePatientOpen(false)}>Cancel</Button>
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
              <Input value={editPatient.firstName} onChange={(e) => setEditPatient((prev) => ({ ...prev, firstName: e.target.value, fullName: buildPatientFullName({ ...prev, firstName: e.target.value }) }))} className={editPatientErrors.firstName ? "border-destructive" : undefined} />
              {editPatientErrors.firstName ? <p className="text-sm text-destructive">{editPatientErrors.firstName}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Father name</Label>
              <Input value={editPatient.fatherName} onChange={(e) => setEditPatient((prev) => ({ ...prev, fatherName: e.target.value, fullName: buildPatientFullName({ ...prev, fatherName: e.target.value }) }))} />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input value={editPatient.lastName} onChange={(e) => setEditPatient((prev) => ({ ...prev, lastName: e.target.value, fullName: buildPatientFullName({ ...prev, lastName: e.target.value }) }))} className={editPatientErrors.lastName ? "border-destructive" : undefined} />
              {editPatientErrors.lastName ? <p className="text-sm text-destructive">{editPatientErrors.lastName}</p> : null}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {/* <div className="space-y-2">
              <Label>Full name preview</Label>
              <Input value={buildPatientFullName(editPatient)} readOnly />
            </div> */}
            <div className="space-y-2">
              <Label>Gender</Label>
              <select value={editPatient.gender} onChange={(e) => setEditPatient((prev) => ({ ...prev, gender: e.target.value as "Male" | "Female" | "Other" | "Unknown" }))} className={`h-9 w-full rounded-md border bg-slate-50/90 px-2.5 text-sm shadow-sm dark:bg-slate-900/40 ${editPatientErrors.gender ? "border-destructive" : "border-slate-300/80 dark:border-slate-700/70"}`}>
                <option value="Unknown">Unknown</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {editPatientErrors.gender ? <p className="text-sm text-destructive">{editPatientErrors.gender}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Date of birth</Label>
              <Input value={editPatient.dateOfBirth} onChange={(e) => setEditPatient((prev) => ({ ...prev, dateOfBirth: formatPatientDobInput(e.target.value) }))} inputMode="numeric" placeholder="DD/MM/YYYY" className={editPatientErrors.dateOfBirth ? "border-destructive" : undefined} />
              {editPatientErrors.dateOfBirth ? <p className="text-sm text-destructive">{editPatientErrors.dateOfBirth}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editPatient.phone} onChange={(e) => setEditPatient((prev) => ({ ...prev, phone: e.target.value }))} className={editPatientErrors.phone ? "border-destructive" : undefined} />
              {editPatientErrors.phone ? <p className="text-sm text-destructive">{editPatientErrors.phone}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={editPatient.location} onChange={(e) => setEditPatient((prev) => ({ ...prev, location: e.target.value }))} className={editPatientErrors.location ? "border-destructive" : undefined} />
              {editPatientErrors.location ? <p className="text-sm text-destructive">{editPatientErrors.location}</p> : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPatientOpen(false)}>Cancel</Button>
            <Button onClick={() => void savePatientChanges()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
