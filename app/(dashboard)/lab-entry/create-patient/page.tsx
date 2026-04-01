"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function CreatePatientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [duplicateMatches, setDuplicateMatches] = useState<Patient[]>([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  const fullName = buildPatientFullName(newPatient);
  const backTo = searchParams.get("backTo") || "";
  const backLabel = searchParams.get("backLabel") || "Back";
  const showBackButton = backTo.startsWith("/");

  useEffect(() => {
    void apiGet<Patient[]>("/api/lab/patients?limit=1000")
      .then(setPatients)
      .catch(() => setPatients([]));
  }, []);

  const similarFullNameMatches = useMemo(() => {
    const targetName = normalizeText(fullName);
    if (targetName.length < 6) return [];

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

        if (!exactMatch && !includesMatch && !closeDistance) return null;

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
  }, [fullName, patients]);

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
    const firstName = newPatient.firstName.trim();
    const fatherName = newPatient.fatherName.trim();
    const lastName = newPatient.lastName.trim();

    if (!firstName || !lastName) {
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
  }, [newPatient.firstName, newPatient.fatherName, newPatient.lastName]);

  const createPatient = async (goToReport = false) => {
    const nextFieldErrors = getYupFieldErrors(patientRequiredSchema, {
      ...newPatient,
      gender: newPatient.gender === "Unknown" ? undefined : newPatient.gender,
    });
    setFieldErrors(nextFieldErrors);
    const validationErrors = Object.values(nextFieldErrors);
    if (validationErrors.length > 0) {
      toast({
        title: "Required fields missing",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      setFieldErrors({});
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

      toast({
        title: "Patient created",
        description: `${createdPatient.fullName} was added successfully.`,
      });

      router.push(
        goToReport
          ? `/lab-entry/patients/${encodeURIComponent(createdPatient.patientId)}/new-report`
          : `/lab-entry/patients/${encodeURIComponent(createdPatient.patientId)}`
      );
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error?.message || "Could not create patient",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {showBackButton ? (
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={backTo}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      ) : null}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Patient</h1>
        <p className="mt-1 text-muted-foreground">
          Register a new patient, then open the patient page or jump straight into a new report.
        </p>
      </div>

      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Patient
          </CardTitle>
          <CardDescription>
            Fill in the identity first. Use the warning block below to avoid duplicate registrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(fieldErrors).length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Please complete the required fields below.
            </div>
          ) : null}
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
                  className={fieldErrors.firstName ? "border-destructive" : undefined}
                />
                {fieldErrors.firstName ? (
                  <p className="text-sm text-destructive">{fieldErrors.firstName}</p>
                ) : null}
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
                />
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
                  className={fieldErrors.lastName ? "border-destructive" : undefined}
                />
                {fieldErrors.lastName ? (
                  <p className="text-sm text-destructive">{fieldErrors.lastName}</p>
                ) : null}
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
                  {combinedDuplicateMatches.map((patient) => (
                    <div key={patient.patientId} className="rounded border border-amber-200 bg-white/70 p-2">
                      <div className="font-medium">{patient.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        DOB: {patient.dateOfBirth || "-"} | Phone: {patient.phone || "-"} | Location: {patient.location || "-"}
                      </div>
                    </div>
                  ))}
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
                    fieldErrors.gender
                      ? "border-destructive"
                      : "border-slate-300/80 dark:border-slate-700/70"
                  }`}
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {fieldErrors.gender ? (
                  <p className="text-sm text-destructive">{fieldErrors.gender}</p>
                ) : null}
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
                  className={fieldErrors.dateOfBirth ? "border-destructive" : undefined}
                />
                {fieldErrors.dateOfBirth ? (
                  <p className="text-sm text-destructive">{fieldErrors.dateOfBirth}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newPatient.phone}
                  onChange={(e) =>
                    setNewPatient((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className={fieldErrors.phone ? "border-destructive" : undefined}
                />
                {fieldErrors.phone ? (
                  <p className="text-sm text-destructive">{fieldErrors.phone}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={newPatient.location}
                  onChange={(e) =>
                    setNewPatient((prev) => ({ ...prev, location: e.target.value }))
                  }
                  className={fieldErrors.location ? "border-destructive" : undefined}
                />
                {fieldErrors.location ? (
                  <p className="text-sm text-destructive">{fieldErrors.location}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void createPatient(false)}
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Create Patient
            </Button>
            <Button type="button" onClick={() => void createPatient(true)} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Create And Start Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
