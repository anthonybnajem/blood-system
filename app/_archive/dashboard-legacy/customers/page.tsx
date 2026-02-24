"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Users, Trash2 } from "lucide-react";
import { usePosData } from "@/components/pos-data-provider";
import { useReceiptSettings } from "@/components/receipt-settings-provider";
import { useDiscount } from "@/components/discount-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildCustomersFromSales, WALK_IN_CUSTOMER_NAME } from "./utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CustomersPage() {
  const {
    sales,
    customers: customerProfiles,
    addCustomerProfile,
    removeCustomerProfile,
    hideCustomerIdentity,
  } = usePosData();
  const { settings } = useReceiptSettings();
  const { discounts } = useDiscount();
  const currencySymbol = settings?.currencySymbol || "$";
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerLocation, setNewCustomerLocation] = useState("");
  const [newCustomerNotes, setNewCustomerNotes] = useState("");
  const [newCustomerDiscountId, setNewCustomerDiscountId] = useState<
    string | undefined
  >(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{
    id?: string;
    name: string;
    identity: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
  } | null>(null);

  const customers = useMemo(
    () => buildCustomersFromSales(sales, customerProfiles),
    [sales, customerProfiles]
  );
  const discountLookup = useMemo(
    () =>
      discounts.reduce<Record<string, string>>((acc, discount) => {
        acc[discount.id] = discount.name;
        return acc;
      }, {}),
    [discounts]
  );

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter((customer) => {
      const discountName = customer.defaultDiscountId
        ? discountLookup[customer.defaultDiscountId]?.toLowerCase()
        : "";
      return (
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        (discountName && discountName.includes(query))
      );
    });
  }, [customers, searchQuery, discountLookup]);

  return (
    <div className="space-y-6 overflow-hidden min-w-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Customers
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Review every customer that made a purchase and dive into their receipt history.
        </p>
      </div>

      <Card className="border-2">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Customer Directory</CardTitle>
              <CardDescription>
                {filteredCustomers.length}{" "}
                {filteredCustomers.length === 1 ? "customer" : "customers"} found
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Input
                placeholder="Search by name, email, or phone"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="sm:max-w-xs"
              />
              <Button onClick={() => setIsAddCustomerOpen(true)}>
                Add Customer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>No customers yet</EmptyTitle>
                <EmptyDescription>
                  As soon as you add customer details during checkout, they will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Purchases</TableHead>
                    <TableHead>Last Purchase</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-semibold">
                        {customer.name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.email || "—"}
                          <br />
                          <span className="text-muted-foreground">
                            {customer.phone || "No phone"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {customer.location || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.defaultDiscountId
                            ? discountLookup[customer.defaultDiscountId] ||
                              "Discount removed"
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {currencySymbol}
                        {customer.totalSpent.toFixed(2)}
                      </TableCell>
                      <TableCell>{customer.purchaseCount}</TableCell>
                      <TableCell>
                        {format(customer.lastPurchase, "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/customers/${encodeURIComponent(customer.id)}`}
                            >
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setCustomerToDelete({
                                id: customer.profileId,
                                name: customer.name || WALK_IN_CUSTOMER_NAME,
                                identity: {
                                  name: customer.name,
                                  email: customer.email,
                                  phone: customer.phone,
                                  location: customer.location,
                                },
                              })
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>
              Save a customer profile to reuse during checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-phone">Phone</Label>
                <Input
                  id="new-phone"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-location">Location</Label>
              <Input
                id="new-location"
                value={newCustomerLocation}
                onChange={(e) => setNewCustomerLocation(e.target.value)}
                placeholder="City / Address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-discount">Default Discount</Label>
              <Select
                value={newCustomerDiscountId ?? "none"}
                onValueChange={(value) =>
                  setNewCustomerDiscountId(
                    value === "none" ? undefined : value
                  )
                }
              >
                <SelectTrigger id="new-discount">
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
            <div className="space-y-2">
              <Label htmlFor="new-notes">Notes</Label>
              <Textarea
                id="new-notes"
                value={newCustomerNotes}
                onChange={(e) => setNewCustomerNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddCustomerOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
              <Button
                onClick={async () => {
                  if (!newCustomerName.trim()) {
                    return;
                  }
                  try {
                    setIsSaving(true);
                    await addCustomerProfile({
                      name: newCustomerName,
                      email: newCustomerEmail,
                      phone: newCustomerPhone,
                      location: newCustomerLocation,
                      notes: newCustomerNotes,
                      defaultDiscountId: newCustomerDiscountId,
                    });
                    setNewCustomerName("");
                    setNewCustomerEmail("");
                    setNewCustomerPhone("");
                    setNewCustomerLocation("");
                    setNewCustomerNotes("");
                    setNewCustomerDiscountId(undefined);
                    setIsAddCustomerOpen(false);
                  } finally {
                    setIsSaving(false);
                  }
                }}
              disabled={isSaving || !newCustomerName.trim()}
            >
              {isSaving ? "Saving..." : "Save Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!customerToDelete}
        onOpenChange={() => setCustomerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {customerToDelete?.name || WALK_IN_CUSTOMER_NAME} from the customer list.
              Receipts already recorded will keep their customer name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isSaving}
              onClick={async () => {
                if (!customerToDelete) return;
                setIsSaving(true);
                try {
                  if (customerToDelete.id) {
                    await removeCustomerProfile(customerToDelete.id);
                  } else {
                    await hideCustomerIdentity(customerToDelete.identity);
                  }
                  setCustomerToDelete(null);
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
