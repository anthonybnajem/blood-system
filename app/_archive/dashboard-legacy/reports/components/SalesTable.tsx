"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { BarChart, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { formatQuantityWithLabel } from "@/lib/product-measurements";
import type { Product } from "@/lib/db";

interface SalesTableProps {
  sales: any[];
  isLoading: boolean;
  onPrintInvoice: (sale: any) => void;
  onExport?: () => void;
  onExportPdf?: () => void;
  exportPdfLoading?: boolean;
}

export function SalesTable({
  sales,
  isLoading,
  onPrintInvoice,
  onExport,
  onExportPdf,
  exportPdfLoading,
}: SalesTableProps) {
  const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [rowsPerPage, sales]);

  const totalPages = Math.max(
    1,
    Math.ceil((sales?.length || 0) / rowsPerPage)
  );

  const paginatedSales = useMemo(() => {
    const start = page * rowsPerPage;
    return sales.slice(start, start + rowsPerPage);
  }, [sales, page, rowsPerPage]);

  const showingFrom = page * rowsPerPage + 1;
  const showingTo = Math.min((page + 1) * rowsPerPage, sales.length);

  return (
    <Card className="mt-6 border-2 shadow-sm">
      <CardHeader className="pb-3 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Sales Transactions
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(value) => setRowsPerPage(Number(value))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {ROWS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onExport}
                disabled={!sales.length}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
            {onExportPdf && (
              <Button
              
                variant="default"
                size="sm"
                className="gap-2"
                onClick={onExportPdf}
                disabled
                // disabled={!sales.length || exportPdfLoading}
              >
                {exportPdfLoading ? "Preparing..." : "Export PDF"}
              </Button>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {sales.length > 0 ? (
            <>
              Showing {showingFrom}–{showingTo} of {sales.length} transactions
            </>
          ) : (
            "No transactions for the selected filters"
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Spinner className="h-6 w-6" />
                      <p className="text-sm text-muted-foreground">
                        Loading sales data...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sales.length > 0 ? (
                paginatedSales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      {format(new Date(sale.date), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {sale.id.slice(0, 8)}
                      </code>
                    </TableCell>
                    <TableCell>
                      {sale.customerName || (
                        <span className="text-muted-foreground">
                          Walk-in Customer
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {sale.items.slice(0, 3).map((item: any, idx: number) => {
                          const quantityLabel = item.product
                            ? formatQuantityWithLabel(item.product as Product, item.quantity)
                            : typeof item.quantity === "number"
                            ? item.quantity
                            : Number(item.quantity) || 0;
                          return (
                            <div
                              key={`${sale.id}-${idx}`}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate">
                                  {item.product?.name || item.name || item.productId || `Item ${idx + 1}`}
                                </p>
                                {item.product?.sku && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    SKU: {item.product.sku}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {quantityLabel}
                              </span>
                            </div>
                          );
                        })}
                        {sale.items.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{sale.items.length - 3} more
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {sale.paymentMethod === "credit"
                          ? "Credit Card"
                          : sale.paymentMethod === "cash"
                          ? "Cash"
                          : "Mobile Payment"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-lg">
                      ${sale.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      Coming Soon!
                      {/* <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPrintInvoice(sale)}
                        className="gap-2"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print
                      </Button> */}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-8">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <BarChart className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>No sales data available</EmptyTitle>
                        <EmptyDescription>
                          No sales data found for the selected period. Try
                          adjusting your date range or filters.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {sales.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-t text-sm">
              <p className="text-muted-foreground">
                Page {page + 1} of {totalPages}
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
        </div>
      </CardContent>
    </Card>
  );
}
