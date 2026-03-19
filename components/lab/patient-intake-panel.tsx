"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Pencil, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Patient = {
  patientId: string;
  fullName: string;
  gender: "Male" | "Female" | "Other" | "Unknown";
  dateOfBirth?: string | null;
  phone?: string | null;
  location?: string | null;
};

type Props = {
  title: string;
  description: string;
  patientSearch: string;
  onPatientSearchChange: (value: string) => void;
  selectedPatientId: string;
  filteredPatients: Patient[];
  emptySearchPatients?: Patient[];
  topSuggestion: Patient | null;
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  onOpenCreatePatient: () => void;
  onOpenEditPatient?: () => void;
  showSearchViewLink?: boolean;
  topSuggestionActionLabel?: string;
  onTopSuggestionAction?: (patient: Patient) => void;
  topSuggestionSecondaryActionLabel?: string;
  onTopSuggestionSecondaryAction?: (patient: Patient) => void;
  enableSearchPagination?: boolean;
};

export function PatientIntakePanel({
  title,
  description,
  patientSearch,
  onPatientSearchChange,
  selectedPatientId,
  filteredPatients,
  emptySearchPatients = [],
  topSuggestion,
  selectedPatient,
  onSelectPatient,
  onOpenCreatePatient,
  onOpenEditPatient,
  showSearchViewLink = true,
  topSuggestionActionLabel = "Use Patient",
  onTopSuggestionAction,
  topSuggestionSecondaryActionLabel,
  onTopSuggestionSecondaryAction,
  enableSearchPagination = true,
}: Props) {
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsPageSize, setResultsPageSize] = useState(5);

  useEffect(() => {
    setResultsPage(1);
  }, [patientSearch]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredPatients.length / resultsPageSize));
    if (resultsPage > totalPages) {
      setResultsPage(totalPages);
    }
  }, [filteredPatients.length, resultsPage, resultsPageSize]);

  const paginatedPatients = useMemo(() => {
    const start = (resultsPage - 1) * resultsPageSize;
    return filteredPatients.slice(start, start + resultsPageSize);
  }, [filteredPatients, resultsPage, resultsPageSize]);

  const visiblePatients = enableSearchPagination ? paginatedPatients : filteredPatients;

  return (
    <Card className="border-slate-200/80 dark:border-slate-800">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 ">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Patient Search</Label>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={onOpenCreatePatient}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create New Patient
                </Button>
                {showSearchViewLink ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/lab-entry/search">
                      Open Search View
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
            <Input
              placeholder="Type patient name, phone, DOB, initials..."
              value={patientSearch}
              onChange={(e) => onPatientSearchChange(e.target.value)}
            />
            {patientSearch.trim() && topSuggestion ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Best Match
                </div>
                <div className="mt-1 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{topSuggestion.fullName}</div>
                    <div className="text-sm text-muted-foreground">
                      {topSuggestion.phone || "-"} | {topSuggestion.gender} | DOB:{" "}
                      {topSuggestion.dateOfBirth || "-"}{" "}
                      {topSuggestion.location ? `| ${topSuggestion.location}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topSuggestionSecondaryActionLabel && onTopSuggestionSecondaryAction ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onTopSuggestionSecondaryAction(topSuggestion)}
                      >
                        {topSuggestionSecondaryActionLabel}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        (onTopSuggestionAction || onSelectPatient)(topSuggestion)
                      }
                    >
                      {topSuggestionActionLabel}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="rounded-md border border-slate-200/90 bg-slate-50/60 p-1 dark:border-slate-800 dark:bg-slate-900/20">
              {!patientSearch.trim() ? (
                emptySearchPatients.length > 0 ? (
                  <div className="space-y-2">
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Recent patients
                    </div>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {emptySearchPatients.map((patient) => {
                        const isSelected = patient.patientId === selectedPatientId;
                        return (
                          <button
                            key={patient.patientId}
                            type="button"
                            onClick={() => onSelectPatient(patient)}
                            className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm transition ${
                              isSelected
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-transparent bg-background/80 hover:border-slate-300 hover:bg-background dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="font-medium">{patient.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {patient.phone || "-"} | {patient.gender} | DOB: {patient.dateOfBirth || "-"}{" "}
                              {patient.location ? `| ${patient.location}` : ""}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    Start typing to search for a patient.
                  </p>
                )
              ) : filteredPatients.length > 0 ? (
                <div className="space-y-3">
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {visiblePatients.map((patient) => {
                    const isSelected = patient.patientId === selectedPatientId;
                    return (
                      <button
                        key={patient.patientId}
                        type="button"
                        onClick={() => onSelectPatient(patient)}
                        className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm transition ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-transparent bg-background/80 hover:border-slate-300 hover:bg-background dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="font-medium">{patient.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {patient.phone || "-"} | {patient.gender} | DOB: {patient.dateOfBirth || "-"}{" "}
                          {patient.location ? `| ${patient.location}` : ""}
                        </div>
                      </button>
                    );
                    })}
                  </div>
                  {enableSearchPagination ? (
                    <DataPagination
                      page={resultsPage}
                      pageSize={resultsPageSize}
                      totalItems={filteredPatients.length}
                      pageSizeOptions={[5, 10, 20]}
                      itemLabel="patients"
                      onPageChange={setResultsPage}
                      onPageSizeChange={(value) => {
                        setResultsPageSize(value);
                        setResultsPage(1);
                      }}
                    />
                  ) : null}
                </div>
              ) : (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  No patient found. Use Create Patient.
                </p>
              )}
            </div>
          </div>
         
        </div>

        {selectedPatient ? (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Selected Patient
                </div>
                <div className="mt-1 text-lg font-semibold">{selectedPatient.fullName}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedPatient.gender}
                  {selectedPatient.phone ? ` | ${selectedPatient.phone}` : ""}
                  {selectedPatient.location ? ` | ${selectedPatient.location}` : ""}
                  {" | "}DOB: {selectedPatient.dateOfBirth || "-"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectPatient(selectedPatient)}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Select
                </Button> */}
                {onOpenEditPatient ? (
                  <Button type="button" variant="outline" size="sm" onClick={onOpenEditPatient}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Patient
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
