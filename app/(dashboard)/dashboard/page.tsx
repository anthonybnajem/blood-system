"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  ClipboardList,
  FilePlus2,
  FlaskConical,
  History,
  RefreshCw,
  Search,
  Settings2,
  Users,
} from "lucide-react";

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
    patientId: string;
    caseNo: string;
    patientName: string;
    status: "draft" | "ready" | "verified" | "printed";
    visitDate: string;
  }>;
};

const statusVariant: Record<string, "secondary" | "outline" | "default"> = {
  draft: "secondary",
  ready: "outline",
  verified: "default",
  printed: "default",
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    setError("");
    try {
      const response = await fetch("/api/lab/dashboard-overview", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load dashboard");
      }

      setData(payload.data as DashboardOverview);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Patients",
        value: data?.totals.patients ?? 0,
        icon: Users,
        href: "/overview/patients",
      },
      {
        label: "Reports",
        value: data?.totals.visits ?? 0,
        icon: ClipboardList,
        href: "/overview/reports",
      },
      {
        label: "Tests",
        value: data?.totals.tests ?? 0,
        icon: FlaskConical,
        href: "/overview/tests",
      },
      {
        label: "Results",
        value: data?.totals.results ?? 0,
        icon: Activity,
        href: "/overview/results",
      },
    ],
    [data]
  );

  const quickActions = [
    {
      label: "Search Patients",
      description: "Find a patient or create a new patient record.",
      href: "/lab-entry/search",
      icon: Search,
    },
    {
      label: "New Report",
      description: "Open the report workspace to start or reopen report entry.",
      href: "/lab-entry",
      icon: FilePlus2,
    },
    {
      label: "Report History",
      description: "Open the reports overview page for saved report records.",
      href: "/overview/reports",
      icon: History,
    },
    {
      label: "Settings",
      description: "Backups, lab tools, and system preferences.",
      href: "/settings",
      icon: Settings2,
    },
  ];

  const workflowItems = [
    {
      label: "Draft",
      description: "Started and still being entered",
      value: data?.visitStatus.draft ?? 0,
      variant: statusVariant.draft,
      href: "/lab-entry",
    },
    {
      label: "Ready",
      description: "Waiting for review",
      value: data?.visitStatus.ready ?? 0,
      variant: statusVariant.ready,
      href: "/lab-entry",
    },
    {
      label: "Verified",
      description: "Approved and ready to print",
      value: data?.visitStatus.verified ?? 0,
      variant: statusVariant.verified,
      href: "/lab-entry",
    },
    {
      label: "Printed",
      description: "Finalized and already printed",
      value: data?.visitStatus.printed ?? 0,
      variant: statusVariant.printed,
      href: "/lab-entry/search",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Monitor report activity, patient volume, and recent lab work.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadDashboard(true)} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4${isRefreshing ? " animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 pt-6">
            <div className="text-sm text-destructive">{error}</div>
            <Button variant="outline" onClick={() => void loadDashboard(true)}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Go directly to the next operational step.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  asChild
                  variant="outline"
                  className="h-auto min-h-20 w-full justify-start rounded-xl px-4 py-4"
                >
                  <Link href={action.href}>
                    <span className="flex min-w-0 items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <span className="flex min-w-0 flex-col items-start text-left">
                        <span className="w-full whitespace-normal break-words">{action.label}</span>
                        <span className="w-full whitespace-normal break-words text-xs font-normal tracking-normal text-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                    </span>
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Core numbers from the active blood system database.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {isLoading ? (
                    <Skeleton className="mt-3 h-8 w-20" />
                  ) : (
                    <div className="mt-3 text-3xl font-semibold">{stat.value}</div>
                  )}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 ">
        {/* <Card>
          <CardHeader>
            <CardTitle>Report Workflow</CardTitle>
            <CardDescription>Current operational position of all saved reports.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {workflowItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                      <Badge variant={item.variant}>{item.value}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Most recently updated reports in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : data?.recentVisits.length ? (
              <div className="overflow-hidden rounded-xl border">
                <div className="grid grid-cols-[1.4fr_1fr_0.9fr_0.8fr] gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <div>Patient</div>
                  <div>Case No.</div>
                  <div>Updated</div>
                  <div>Status</div>
                </div>
                {data.recentVisits.map((report) => (
                  <Link
                    key={report.visitId}
                    href={`/lab-entry/patients/${encodeURIComponent(report.patientId)}/new-report?visitId=${encodeURIComponent(report.visitId)}`}
                    className="grid grid-cols-[1.4fr_1fr_0.9fr_0.8fr] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{report.patientName}</div>
                    </div>
                    <div className="truncate text-muted-foreground">{report.caseNo}</div>
                    <div className="text-muted-foreground">{formatDateTime(report.visitDate)}</div>
                    <div>
                      <Badge variant={statusVariant[report.status] ?? "secondary"}>
                        {report.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No reports yet. Start from `Search Patients` and create the first report.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
