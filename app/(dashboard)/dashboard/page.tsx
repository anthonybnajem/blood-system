"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ClipboardList, FlaskConical, Users } from "lucide-react";

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
  recentVisits: Array<{
    visitId: string;
    caseNo: string;
    patientName: string;
    status: "draft" | "ready" | "verified" | "printed";
    visitDate: string;
  }>;
};

const statusColor: Record<string, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  ready: "outline",
  verified: "default",
  printed: "default",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/lab/dashboard-overview", {
          method: "GET",
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load dashboard");
        }

        if (active) setData(payload.data as DashboardOverview);
      } catch (err: any) {
        if (active) setError(err?.message || "Failed to load dashboard");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    return [
      {
        label: "Patients",
        value: data?.totals.patients ?? 0,
        icon: Users,
      },
      {
        label: "Visits",
        value: data?.totals.visits ?? 0,
        icon: ClipboardList,
      },
      {
        label: "Tests",
        value: data?.totals.tests ?? 0,
        icon: FlaskConical,
      },
      {
        label: "Results",
        value: data?.totals.results ?? 0,
        icon: Activity,
      },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lab Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overall operational view across patients, visits, and result workflow.
        </p>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <span className="text-3xl font-semibold">{card.value}</span>
                  )}
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visit Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span>Draft</span>
                  <Badge variant={statusColor.draft}>{data?.visitStatus.draft ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ready</span>
                  <Badge variant={statusColor.ready}>{data?.visitStatus.ready ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Verified</span>
                  <Badge variant={statusColor.verified}>{data?.visitStatus.verified ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Printed</span>
                  <Badge variant={statusColor.printed}>{data?.visitStatus.printed ?? 0}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Cases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : data?.recentVisits.length ? (
              data.recentVisits.map((visit) => (
                <div
                  key={visit.visitId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{visit.patientName}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {visit.caseNo}
                    </div>
                  </div>
                  <Badge variant={statusColor[visit.status] ?? "secondary"}>
                    {visit.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No visits yet. Create patients and visits to populate this dashboard.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
