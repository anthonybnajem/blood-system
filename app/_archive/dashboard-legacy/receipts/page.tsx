"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import { InvoicePrint } from "@/components/invoice-print";
import { usePosData, type Sale } from "@/components/pos-data-provider";
import { useReceiptSettings } from "@/components/receipt-settings-provider";
import { useDiscount } from "@/components/discount-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Ban,
  Edit2,
  MoreVertical,
  Printer,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EditReceiptDialog,
  VoidReceiptDialog,
  DeleteReceiptDialog,
} from "./components/receipt-dialogs";

const statusMeta: Record<
  NonNullable<Sale["status"]>,
  { label: string; badgeVariant: "default" | "secondary" | "destructive" }
> = {
  completed: { label: "Completed", badgeVariant: "default" },
  voided: { label: "Voided", badgeVariant: "destructive" },
  refunded: { label: "Refunded", badgeVariant: "secondary" },
};

const dateFilterOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export default function RecentReceiptsPage() {
  const router = useRouter();
  const { sales, updateSale, voidSale, deleteSale } = usePosData();
  const { settings } = useReceiptSettings();
  const { discounts } = useDiscount();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("30");
  const [rowsPerPage, setRowsPerPage] = useState<string>("10");
  const [page, setPage] = useState(0);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Sale | null>(null);
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter, dateFilter, rowsPerPage]);

  const filteredSales = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const limitDays = dateFilter === "all" ? null : Number(dateFilter);
    const cutoffDate =
      limitDays && Number.isFinite(limitDays)
        ? subDays(new Date(), limitDays)
        : null;

    return [...sales]
      .filter((sale) => {
        if (!query) return true;
        const receiptNumber = buildReceiptNumber(sale);
        const haystack = [
          sale.customerName,
          sale.customerEmail,
          sale.customerPhone,
          sale.paymentMethod,
          sale.notes,
          receiptNumber,
          sale.id,
          ...sale.items.map(
            (item) =>
              item.product?.name ||
              item.productId ||
              (typeof item.price === "number" ? item.price.toString() : "")
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .filter((sale) => {
        if (statusFilter === "all") return true;
        const saleStatus = sale.status || "completed";
        return saleStatus === statusFilter;
      })
      .filter((sale) => {
        if (!cutoffDate) return true;
        const saleDate = new Date(sale.date);
        return saleDate >= cutoffDate;
      })
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [sales, searchQuery, statusFilter, dateFilter]);
  const discountLookup = useMemo(
    () =>
      discounts.reduce<Record<string, string>>((acc, discount) => {
        acc[discount.id] = discount.name;
        return acc;
      }, {}),
    [discounts]
  );

  const numericRows = Number(rowsPerPage) || 10;
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / numericRows));
  const paginatedSales = filteredSales.slice(
    page * numericRows,
    page * numericRows + numericRows
  );

  const currencySymbol = settings?.currencySymbol || "$";

  const openInvoice = (sale: Sale) => {
    setSelectedSale(sale);
    setIsInvoiceOpen(true);
  };

  const closeInvoice = () => {
    setIsInvoiceOpen(false);
    setSelectedSale(null);
  };

  const handleRowNavigation = (
    event: React.MouseEvent<HTMLTableRowElement>,
    targetHref: string
  ) => {
    const targetElement = event.target as HTMLElement;
    if (event.defaultPrevented) {
      return;
    }
    if (
      targetElement.closest(".receipt-row-interactive") ||
      targetElement.closest(".receipt-menu-trigger")
    ) {
      return;
    }
    router.push(targetHref);
  };

  const handleEditSave = async (
    saleId: string,
    updates: Partial<Sale>
  ) => {
    await updateSale(saleId, updates);
    setEditTarget(null);
  };

  const handleVoid = async (saleId: string, reason?: string) => {
    await voidSale(saleId, reason);
    setVoidTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteSale(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Recent Receipts
        </h1>
        <p className="text-muted-foreground">
          Review, edit, void, or print receipts from recent sales.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0 md:flex md:items-center md:justify-between">
          {/* <CardTitle>Receipt Activity</CardTitle> */}
          <div className="w-full space-y-3 md:flex md:flex-1 md:items-center md:justify-end md:gap-3 md:space-y-0">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search receipt, customer, or notes..."
              className="w-full md:w-64"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {dateFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.length === 0 ? (
                  <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                      No receipts match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSales.map((sale) => {
                    const status = sale.status || "completed";
                    const statusInfo = statusMeta[status];
                    const detailHref = `/receipts/${encodeURIComponent(sale.id)}`;
                    return (
                      <TableRow
                        key={sale.id}
                        className="cursor-pointer"
                        onClick={(event) => handleRowNavigation(event, detailHref)}
                        role="row"
                      >
                        <TableCell>
                          <div>
                            <Link
                              href={detailHref}
                              className="font-medium text-primary hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {buildReceiptNumber(sale)}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(sale.date), "PPp")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p className="font-medium">
                              {sale.customerName || "Walk-in customer"}
                            </p>
                            {sale.customerPhone && (
                              <p className="text-muted-foreground text-xs">
                                {sale.customerPhone}
                              </p>
                            )}
                            {sale.customerEmail && (
                              <p className="text-muted-foreground text-xs">
                                {sale.customerEmail}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="line-clamp-2">
                            {sale.items
                              .map(
                                  (item) =>
                                    item.product?.name ||
                                    item.productId ||
                                    "Item"
                                )
                              .join(", ")}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>
                              {sale.items.length}{" "}
                              {sale.items.length === 1 ? "item" : "items"}
                            </span>
                            <span aria-hidden="true">•</span>
                            <span>{format(new Date(sale.date), "PP")}</span>
                          </p>
                        </div>
                      </TableCell>
                        <TableCell>
                          <div className="text-sm capitalize">
                            {sale.paymentMethod}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sale.discount && sale.discount > 0 ? (
                            <div className="text-sm">
                              -{currencySymbol}
                              {sale.discount.toFixed(2)}
                              {sale.discountId && (
                                <p className="text-xs text-muted-foreground">
                                  {discountLookup[sale.discountId] ||
                                    "Saved discount"}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {currencySymbol}
                          {sale.total.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className="receipt-row-interactive"
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                          }}
                        >
                          <Badge
                            variant={statusInfo?.badgeVariant || "secondary"}
                            className={cn(
                              status === "voided" && "bg-destructive/10 text-destructive"
                            )}
                          >
                            {statusInfo?.label || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-right receipt-row-interactive"
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                          }}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Open receipt actions"
                                className="receipt-menu-trigger"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  openInvoice(sale);
                                }}
                                className="gap-2"
                              >
                                <Printer className="h-4 w-4" />
                                View / Print
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  setEditTarget(sale);
                                }}
                                className="gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={sale.status === "voided"}
                                onSelect={(event) => {
                                  event.preventDefault();
                                  setVoidTarget(sale);
                                }}
                                className="gap-2"
                              >
                                <Ban className="h-4 w-4" />
                                Void
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive"
                                onSelect={(event) => {
                                  event.preventDefault();
                                  setDeleteTarget(sale);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              Showing{" "}
              <span className="font-medium text-foreground">
                {paginatedSales.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredSales.length}
              </span>{" "}
              receipts
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages - 1))
                  }
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSale && (
        <InvoicePrint
          sale={selectedSale}
          isOpen={isInvoiceOpen}
          onClose={closeInvoice}
        />
      )}

      <EditReceiptDialog
        sale={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEditSave}
        availableDiscounts={discounts}
      />

      <VoidReceiptDialog
        sale={voidTarget}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoid}
      />

      <DeleteReceiptDialog
        sale={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function buildReceiptNumber(sale: Sale): string {
  if (sale.receiptNumber) return sale.receiptNumber;
  const dateStr = format(new Date(sale.date), "yyMMdd");
  const shortId = sale.id.slice(0, 4).toUpperCase();
  return `${dateStr}-${shortId}`;
}
