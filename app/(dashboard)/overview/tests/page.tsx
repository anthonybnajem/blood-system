"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { DataPagination } from "@/components/ui/data-pagination";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportRowsToExcel } from "@/lib/excel-export";
import { Loader2 } from "lucide-react";

type TestRow = {
  testId: string;
  panelId: string;
  panelName: string;
  testCode: string;
  displayName: string;
  resultType: string;
  defaultUnit?: string | null;
  active: number;
};

export default function OverviewTestsPage() {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("displayName");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          q: query,
          status,
          sortBy,
          sortOrder,
        });
        const response = await fetch(`/api/lab/tests?${params.toString()}`, {
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Failed to load tests");
        setTests(body.data || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load tests");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [query, status, sortBy, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [query, status, sortBy, sortOrder]);

  const paginatedTests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tests.slice(start, start + pageSize);
  }, [tests, page, pageSize]);

  const handleExport = () => {
    exportRowsToExcel({
      fileName: `tests-overview-${new Date().toISOString().slice(0, 10)}`,
      sheetName: "Tests",
      rows: tests.map((test) => ({
        Test: test.displayName,
        Code: test.testCode,
        Panel: test.panelName || "",
        Type: test.resultType,
        Unit: test.defaultUnit || "",
        Status: test.active ? "active" : "hidden",
        TestID: test.testId,
        PanelID: test.panelId,
      })),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tests Overview</CardTitle>
        <CardDescription>Configured lab tests from the active catalog.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        <DataTableToolbar
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search tests..."
          onExport={handleExport}
          exportDisabled={!tests.length}
        >
          <NativeSelect
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
          </NativeSelect>
          <NativeSelect
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="displayName">Sort by test</option>
            <option value="testCode">Sort by code</option>
            <option value="panelName">Sort by panel</option>
            <option value="resultType">Sort by type</option>
          </NativeSelect>
          <NativeSelect
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="asc">A-Z first</option>
            <option value="desc">Z-A first</option>
          </NativeSelect>
        </DataTableToolbar>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tests...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Panel</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!tests.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No tests found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTests.map((test) => (
                  <TableRow key={test.testId}>
                    <TableCell className="font-medium">{test.displayName}</TableCell>
                    <TableCell>{test.testCode}</TableCell>
                    <TableCell>{test.panelName || "-"}</TableCell>
                    <TableCell>{test.resultType}</TableCell>
                    <TableCell>{test.defaultUnit || "-"}</TableCell>
                    <TableCell>{test.active ? "active" : "hidden"}</TableCell>
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
            totalItems={tests.length}
            pageSizeOptions={[5, 10, 20, 50]}
            itemLabel="tests"
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
