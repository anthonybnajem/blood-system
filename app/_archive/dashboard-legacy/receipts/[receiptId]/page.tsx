"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Ban,
  Edit2,
  Printer,
  Trash2,
  Receipt as ReceiptIcon,
} from "lucide-react";
import {
  usePosData,
  type Sale,
} from "@/components/pos-data-provider";
import { useReceiptSettings } from "@/components/receipt-settings-provider";
import { InvoicePrint } from "@/components/invoice-print";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  EditReceiptDialog,
  VoidReceiptDialog,
  DeleteReceiptDialog,
} from "../components/receipt-dialogs";

const fallbackName = "Walk-in customer";

export default function ReceiptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params?.receiptId
    ? decodeURIComponent(params.receiptId as string)
    : "";
  const { sales, customers, updateSale, voidSale, deleteSale, addCustomerProfile, updateCustomerProfile } =
    usePosData();
  const { settings } = useReceiptSettings();
  const currencySymbol = settings?.currencySymbol || "$";

  const sale = useMemo(
    () => sales.find((s) => s.id === receiptId),
    [sales, receiptId]
  );

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const receiptNumber = sale
    ? sale.receiptNumber ||
      `${format(new Date(sale.date), "yyMMdd")}-${sale.id.slice(0, 4).toUpperCase()}`
    : "";

  const handleEditSave = async (saleId: string, updates: Partial<Sale>) => {
    await updateSale(saleId, updates);
    setIsEditOpen(false);
  };

  const handleVoidConfirm = async (saleId: string, reason?: string) => {
    await voidSale(saleId, reason);
    setIsVoidOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!sale) return;
    await deleteSale(sale.id);
    setIsDeleteOpen(false);
    router.push("/receipts");
  };

  if (!sale) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/receipts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            
          </Link>
        </Button>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptIcon className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>Receipt not found</EmptyTitle>
            <EmptyDescription>
              This receipt may have been deleted or does not exist.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const status = sale.status || "completed";
  const customerName = sale.customerName || fallbackName;

  return (
    <div className="space-y-6 overflow-hidden min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button asChild variant="ghost" size="sm">
            <Link href="/receipts">
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Receipt #{receiptNumber}
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(sale.date), "PPpp")} • {sale.paymentMethod}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsInvoiceOpen(true)}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setIsEditOpen(true)}
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={status === "voided"}
            onClick={() => setIsVoidOpen(true)}
          >
            <Ban className="h-4 w-4" />
            Void
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Customer and payment details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-semibold">{customerName}</p>
            <p className="text-sm text-muted-foreground">
              {sale.customerEmail || "No email"}
            </p>
            <p className="text-sm text-muted-foreground">
              {sale.customerPhone || "No phone"}
            </p>
            <p className="text-sm text-muted-foreground">
              {sale.customerLocation || "No location"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Payment Method</p>
            <p className="font-semibold capitalize">{sale.paymentMethod}</p>
            {sale.notes && (
              <p className="text-sm text-muted-foreground">
                Notes: {sale.notes}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant={status === "voided" ? "destructive" : "secondary"}>
              {status}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="font-semibold">
              {currencySymbol}
              {(sale.subtotal ?? sale.total).toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Tax</p>
            <p className="font-semibold">
              {currencySymbol}
              {(sale.tax ?? 0).toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold">
              {currencySymbol}
              {sale.total.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Receipt Items</CardTitle>
          <CardDescription>Line items included in this receipt</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item, idx) => (
                <TableRow key={`${item.productId}-${idx}`}>
                  <TableCell>
                    <p className="font-medium">
                      {item.product?.name || item.productId}
                    </p>
                    {item.product?.sku && (
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.product.sku}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    {currencySymbol}
                    {item.price.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {currencySymbol}
                    {(item.price * item.quantity).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InvoicePrint
        sale={sale}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />

      <EditReceiptDialog
        sale={isEditOpen ? sale : null}
        onClose={() => setIsEditOpen(false)}
        onSave={handleEditSave}
        onSaveCustomerProfile={
          sale
            ? async (details) => {
                const profile = customers.find(
                  (c) =>
                    c.email?.toLowerCase() === details.email?.toLowerCase() ||
                    c.phone?.replace(/\D/g, "") ===
                      details.phone?.replace(/\D/g, "") ||
                    c.name.toLowerCase() ===
                      (details.name || sale.customerName || "").toLowerCase()
                );
                if (profile) {
                  await updateCustomerProfile({
                    ...profile,
                    name: details.name || profile.name,
                    email: details.email || profile.email,
                    phone: details.phone || profile.phone,
                    location: details.location || profile.location,
                  });
                } else if (details.name || details.email || details.phone) {
                  await addCustomerProfile({
                    name: details.name || sale.customerName || "",
                    email: details.email,
                    phone: details.phone,
                    location: details.location,
                  });
                }
              }
            : undefined
        }
      />

      <VoidReceiptDialog
        sale={isVoidOpen ? sale : null}
        onClose={() => setIsVoidOpen(false)}
        onConfirm={handleVoidConfirm}
      />

      <DeleteReceiptDialog
        sale={isDeleteOpen ? sale : null}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
