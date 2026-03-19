"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

type ResultItem = {
  resultId: string;
  visitId: string;
  patientId: string;
  patientName: string;
  caseNo: string;
  testName: string;
  testCode: string;
  value: string;
  unit?: string | null;
  abnormalFlag?: string | null;
  updatedAt: string;
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

export default function OverviewResultsPage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [flag, setFlag] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          limit: "100",
          q: query,
          flag,
          sortBy,
          sortOrder,
        });
        const response = await fetch(`/api/lab/results/history?${params.toString()}`, {
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Failed to load results");
        setResults(body.data || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load results");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [query, flag, sortBy, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [query, flag, sortBy, sortOrder]);

  const paginatedResults = useMemo(() => {
    const start = (page - 1) * pageSize;
    return results.slice(start, start + pageSize);
  }, [results, page, pageSize]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results Overview</CardTitle>
        <CardDescription>Most recently saved result entries across all reports.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search results..."
          />
          <NativeSelect
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
          >
            <option value="">All flags</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </NativeSelect>
          <NativeSelect
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="updatedAt">Sort by updated</option>
            <option value="patientName">Sort by patient</option>
            <option value="caseNo">Sort by case</option>
            <option value="testName">Sort by test</option>
          </NativeSelect>
          <NativeSelect
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest / A-Z first</option>
          </NativeSelect>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading results...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedResults.map((result) => (
                  <TableRow key={result.resultId}>
                    <TableCell className="font-medium">{result.patientName}</TableCell>
                    <TableCell>{result.caseNo}</TableCell>
                    <TableCell>{result.testName}</TableCell>
                    <TableCell>{`${result.value}${result.unit ? ` ${result.unit}` : ""}`}</TableCell>
                    <TableCell>
                      {result.abnormalFlag ? <Badge variant="outline">{result.abnormalFlag}</Badge> : "-"}
                    </TableCell>
                    <TableCell>{formatDateTime(result.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/lab-entry/patients/${encodeURIComponent(result.patientId)}/new-report?visitId=${encodeURIComponent(result.visitId)}`}>Open</Link>
                      </Button>
                    </TableCell>
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
            totalItems={results.length}
            pageSizeOptions={[5, 10, 20, 50]}
            itemLabel="results"
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
