"use client";

import { useEffect, useState } from "react";
import { Activity, ClipboardList, FlaskConical, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardOverview = {
  totals: {
    patients: number;
    visits: number;
    tests: number;
    results: number;
  };
  visitStatus: {
    draft: number;
    ready: number;
    verified: number;
    printed: number;
  };
};

export function LabSystemStatus() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const response = await fetch("/api/lab/dashboard-overview", {
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load lab system status");
        }

        setOverview(body.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load lab system status");
      }
    };

    void loadOverview();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lab System Status</CardTitle>
        <CardDescription>
          Overview of the active lab database used for patients, reports, tests, and results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : !overview ? (
          <div className="text-sm text-muted-foreground">Loading lab system status...</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Patients
                </div>
                <div className="mt-2 text-2xl font-semibold">{overview.totals.patients}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                  Reports
                </div>
                <div className="mt-2 text-2xl font-semibold">{overview.totals.visits}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FlaskConical className="h-4 w-4" />
                  Tests
                </div>
                <div className="mt-2 text-2xl font-semibold">{overview.totals.tests}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Saved Results
                </div>
                <div className="mt-2 text-2xl font-semibold">{overview.totals.results}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">Draft Reports</div>
                <div className="mt-2 text-xl font-semibold">{overview.visitStatus.draft}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">Ready Reports</div>
                <div className="mt-2 text-xl font-semibold">{overview.visitStatus.ready}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">Verified Reports</div>
                <div className="mt-2 text-xl font-semibold">{overview.visitStatus.verified}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">Printed Reports</div>
                <div className="mt-2 text-xl font-semibold">{overview.visitStatus.printed}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
