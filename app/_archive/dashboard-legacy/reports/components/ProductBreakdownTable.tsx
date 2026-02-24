"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyDescription,
  EmptyTitle,
  EmptyMedia,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  PackageSearch,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface ProductBreakdownRow {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  avgPrice: number;
  category?: string;
  sku?: string;
}

interface ProductBreakdownTableProps {
  data: ProductBreakdownRow[];
  isLoading: boolean;
  onExport?: (rows: ProductBreakdownRow[]) => void;
}

const ROWS_PER_PAGE_OPTIONS = ["25", "50", "100"] as const;
const SORTABLE_COLUMNS: Array<{
  key: keyof ProductBreakdownRow;
  label: string;
  align?: "right";
}> = [
  { key: "name", label: "Product" },
  { key: "category", label: "Category" },
  { key: "sku", label: "SKU" },
  { key: "quantity", label: "Units", align: "right" },
  { key: "revenue", label: "Revenue", align: "right" },
  { key: "avgPrice", label: "Avg. Price", align: "right" },
];

export function ProductBreakdownTable({ data, isLoading, onExport }: ProductBreakdownTableProps) {
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState<(typeof ROWS_PER_PAGE_OPTIONS)[number]>("50");
  const [sortConfig, setSortConfig] = useState<{
    column: keyof ProductBreakdownRow;
    direction: "asc" | "desc";
  }>({ column: "revenue", direction: "desc" });
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [rowsPerPage, search, data]);

  const processedRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = data;
    if (query) {
      rows = rows.filter((row) =>
        [row.name, row.category, row.sku]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      );
    }

    rows = [...rows].sort((a, b) => {
      const { column, direction } = sortConfig;
      const dir = direction === "asc" ? 1 : -1;
      const aVal = a[column] ?? "";
      const bVal = b[column] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return dir * (aVal - bVal);
      }
      return dir * String(aVal).localeCompare(String(bVal));
    });

    return rows;
  }, [data, search, sortConfig]);

  const totalPages = Math.max(
    1,
    Math.ceil(processedRows.length / Number(rowsPerPage))
  );

  const paginatedRows = useMemo(() => {
    const size = Number(rowsPerPage);
    const start = page * size;
    return processedRows.slice(start, start + size);
  }, [processedRows, rowsPerPage, page]);

  const totals = useMemo(() => {
    return paginatedRows.reduce(
      (acc, row) => {
        acc.quantity += row.quantity;
        acc.revenue += row.revenue;
        return acc;
      },
      { quantity: 0, revenue: 0 }
    );
  }, [paginatedRows]);

  const handleSort = (column: keyof ProductBreakdownRow) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { column, direction: "desc" };
    });
  };

  const handleExport = () => {
    if (!onExport || processedRows.length === 0) return;
    onExport(processedRows);
  };

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-primary" />
            Product Breakdown
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Input
              placeholder="Search product, SKU, or category"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              value={rowsPerPage}
              onValueChange={(value) =>
                setRowsPerPage(value as (typeof ROWS_PER_PAGE_OPTIONS)[number])
              }
            >
              <SelectTrigger className="sm:w-[160px]">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {ROWS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!processedRows.length}
              className="gap-2"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {SORTABLE_COLUMNS.map((column) => (
                  <TableHead
                    key={column.key as string}
                    className={column.align === "right" ? "text-right" : undefined}
                    aria-sort={
                      sortConfig.column === column.key
                        ? sortConfig.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm font-medium"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={SORTABLE_COLUMNS.length} className="py-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Spinner className="h-6 w-6" />
                      <p className="text-sm text-muted-foreground">
                        Crunching product totals...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : processedRows.length > 0 ? (
                <>
                  {paginatedRows.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{row.category || "Uncategorized"}</TableCell>
                      <TableCell>{row.sku || "-"}</TableCell>
                      <TableCell className="text-right">{row.quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${row.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        ${row.avgPrice.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="text-right">{totals.quantity.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${totals.revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      ${totals.quantity ? (totals.revenue / totals.quantity).toFixed(2) : "0.00"}
                    </TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={SORTABLE_COLUMNS.length}
                    className="py-8"
                  >
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <PackageSearch className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>No sales in this range</EmptyTitle>
                        <EmptyDescription>
                          There are no products sold for the selected dates/filters.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {processedRows.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-t text-sm">
            <p className="text-muted-foreground">
              Showing {page * Number(rowsPerPage) + 1}–
              {Math.min(
                (page + 1) * Number(rowsPerPage),
                processedRows.length
              )}{" "}
              of {processedRows.length} products
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                disabled={page === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages - 1))
                }
                disabled={page >= totalPages - 1}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
