"use client";

import { useEffect, useState } from "react";
import { type Sale } from "@/components/pos-data-provider";
import type { Discount } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function EditReceiptDialog({
  sale,
  onClose,
  onSave,
  onSaveCustomerProfile,
  availableDiscounts = [],
}: {
  sale: Sale | null;
  onClose: () => void;
  onSave: (saleId: string, updates: Partial<Sale>) => Promise<void>;
  onSaveCustomerProfile?: (details: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  }) => Promise<void>;
  availableDiscounts?: Discount[];
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [discountId, setDiscountId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  useEffect(() => {
    if (sale) {
      setCustomerName(sale.customerName || "");
      setCustomerEmail(sale.customerEmail || "");
      setCustomerPhone(sale.customerPhone || "");
      setCustomerLocation(sale.customerLocation || "");
      setPaymentMethod(sale.paymentMethod || "cash");
      setNotes(sale.notes || "");
      setDiscountId(sale.discountId || undefined);
    }
  }, [sale]);

  const handleSave = async () => {
    if (!sale) return;
    try {
      setIsSaving(true);
      const updates = {
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerLocation: customerLocation.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        discountId,
      };
      await onSave(sale.id, updates);
      if (onSaveCustomerProfile) {
        setIsCreatingProfile(true);
        await onSaveCustomerProfile({
          name: updates.customerName,
          email: updates.customerEmail,
          phone: updates.customerPhone,
          location: updates.customerLocation,
        });
      }
    } finally {
      setIsCreatingProfile(false);
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Receipt</DialogTitle>
          <DialogDescription>
            Update customer details or payment method for this receipt.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={customerLocation}
              onChange={(event) => setCustomerLocation(event.target.value)}
              placeholder="Address / city"
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit">Credit Card</SelectItem>
                <SelectItem value="mobile">Mobile Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <Select
              value={discountId ?? "none"}
              onValueChange={(value) =>
                setDiscountId(value === "none" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No discount</SelectItem>
                {availableDiscounts.length === 0 ? (
                  <SelectItem value="placeholder" disabled>
                    No saved discounts yet
                  </SelectItem>
                ) : (
                  availableDiscounts.map((discount) => (
                    <SelectItem key={discount.id} value={discount.id}>
                      {discount.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VoidReceiptDialog({
  sale,
  onClose,
  onConfirm,
}: {
  sale: Sale | null;
  onClose: () => void;
  onConfirm: (saleId: string, reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  useEffect(() => {
    setReason("");
  }, [sale]);

  const handleConfirm = async () => {
    if (!sale) return;
    try {
      setIsVoiding(true);
      await onConfirm(sale.id, reason.trim() || undefined);
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void Receipt</DialogTitle>
          <DialogDescription>
            Voiding a receipt will restock all items and keep a record of this transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label>Reason for void</Label>
          <Textarea
            rows={3}
            placeholder="Optional reason for voiding..."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isVoiding}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isVoiding}
          >
            {isVoiding ? "Voiding..." : "Confirm Void"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteReceiptDialog({
  sale,
  onClose,
  onConfirm,
}: {
  sale: Sale | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!sale) return;
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete receipt?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will restock the items and permanently remove this receipt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
