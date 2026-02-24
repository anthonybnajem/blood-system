"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Users, UserCircle2 } from "lucide-react";
import { format } from "date-fns";
import { usePosData } from "@/components/pos-data-provider";
import { useReceiptSettings } from "@/components/receipt-settings-provider";
import { useDiscount } from "@/components/discount-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildCustomersFromSales } from "../utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CustomerDetailPage() {
  const params = useParams();
  const customerIdParam = decodeURIComponent(
    (params?.customerId as string) || ""
  );
  const {
    sales,
    customers: customerProfiles,
    updateSale,
    updateCustomerProfile,
  } = usePosData();
  const { settings } = useReceiptSettings();
  const { discounts } = useDiscount();
  const currencySymbol = settings?.currencySymbol || "$";

  const customers = useMemo(
    () => buildCustomersFromSales(sales, customerProfiles),
    [sales, customerProfiles]
  );
  const customer = customers.find((c) => c.id === customerIdParam);
  const discountLookup = useMemo(
    () =>
      discounts.reduce<Record<string, string>>((acc, discount) => {
        acc[discount.id] = discount.name;
        return acc;
      }, {}),
    [discounts]
  );
  const assignedDiscountLabel = customer?.defaultDiscountId
    ? discountLookup[customer.defaultDiscountId] || "Discount removed"
    : "No discount";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [pendingLocation, setPendingLocation] = useState("");
  const [pendingDiscountId, setPendingDiscountId] = useState<
    string | undefined
  >(undefined);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (customer && isEditOpen) {
      setPendingName(customer.name || "");
      setPendingEmail(customer.email || "");
      setPendingPhone(customer.phone || "");
      setPendingLocation(customer.location || "");
      setPendingDiscountId(customer.defaultDiscountId || undefined);
    }
  }, [customer, isEditOpen]);

  const handleSaveCustomer = async () => {
    if (!customer) return;
    try {
      setIsSaving(true);
      await Promise.all(
        customer.sales.map((sale) =>
          updateSale(sale.id, {
            customerName: pendingName.trim() || undefined,
            customerEmail: pendingEmail.trim() || undefined,
            customerPhone: pendingPhone.trim() || undefined,
            customerLocation: pendingLocation.trim() || undefined,
            discountId: pendingDiscountId || sale.discountId,
          })
        )
      );
      if (customer.profileId) {
        const profileRecord = customerProfiles.find(
          (p) => p.id === customer.profileId
        );
        if (profileRecord) {
          await updateCustomerProfile({
            ...profileRecord,
            name: pendingName.trim() || profileRecord.name,
            email: pendingEmail.trim() || undefined,
            phone: pendingPhone.trim() || undefined,
            location: pendingLocation.trim() || undefined,
            defaultDiscountId: pendingDiscountId || undefined,
          });
        }
      }
      setIsEditOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/customers">
              <ArrowLeft className="mr-2 h-4 w-4" />
     
            </Link>
          </Button>
        </div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>Customer not found</EmptyTitle>
            <EmptyDescription>
              We couldn&apos;t find the customer you were looking for.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-hidden min-w-0">
      <div className="flex items-center gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link href="/customers">
            <ArrowLeft className="mr-2 h-4 w-4" />
        
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {customer.name}
          </h1>
          <p className="text-muted-foreground">
            {customer.email || "No email saved"} •{" "}
            {customer.phone || "No phone saved"} •{" "}
            {customer.location || "No location saved"}
          </p>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
          Edit Customer
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {currencySymbol}
              {customer.totalSpent.toFixed(2)}
            </p>
            <CardDescription>All recorded purchases</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{customer.purchaseCount}</p>
            <CardDescription>Receipts tied to this customer</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {format(customer.lastPurchase, "MMM dd, yyyy")}
            </p>
            <CardDescription>Most recent visit</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {customer.location || "Not provided"}
            </p>
            <CardDescription>Saved customer location</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Preferred Discount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assignedDiscountLabel}</p>
            <CardDescription>Applied during checkout</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>
            {customer.sales.length}{" "}
            {customer.sales.length === 1 ? "receipt" : "receipts"} recorded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {customer.sales.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserCircle2 className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>No purchase history</EmptyTitle>
                <EmptyDescription>
                  Once this customer completes a sale, it will show up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            customer.sales.map((sale) => (
              <Link
                key={sale.id}
                href={`/receipts/${encodeURIComponent(sale.id)}`}
                className="rounded-lg border p-4 shadow-sm transition hover:border-primary/50 hover:bg-primary/5 block"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Receipt #{sale.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sale.date), "PPpp")} •{" "}
                      {sale.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {currencySymbol}
                      {sale.total.toFixed(2)}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {sale.items.length}{" "}
                      {sale.items.length === 1 ? "item" : "items"}
                    </Badge>
                  </div>
                </div>
                {sale.notes && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Notes: {sale.notes}
                  </p>
                )}
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update contact information across all of this customer&apos;s receipts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={pendingEmail}
                onChange={(e) => setPendingEmail(e.target.value)}
              />
            </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              value={pendingPhone}
              onChange={(e) => setPendingPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              value={pendingLocation}
              onChange={(e) => setPendingLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-discount">Preferred Discount</Label>
            <Select
              value={pendingDiscountId ?? "none"}
              onValueChange={(value) =>
                setPendingDiscountId(value === "none" ? undefined : value)
              }
            >
              <SelectTrigger id="edit-discount">
                <SelectValue placeholder="No discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No discount</SelectItem>
                {discounts.length === 0 ? (
                  <SelectItem value="placeholder" disabled>
                    Create a discount first
                  </SelectItem>
                ) : (
                  discounts.map((discount) => (
                    <SelectItem key={discount.id} value={discount.id}>
                      {discount.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomer} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
