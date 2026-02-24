"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DiscountForm } from "./DiscountForm";
import { type Discount } from "@/lib/db";
import {
  type Product,
  type Category,
} from "@/components/pos-data-provider";

interface AddDiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  discount: Omit<Discount, "id" | "usageCount">;
  onDiscountChange: (discount: Omit<Discount, "id" | "usageCount">) => void;
  onSubmit: () => void;
  products: Product[];
  categories: Category[];
  currencySymbol: string;
}

export function AddDiscountDialog({
  isOpen,
  onClose,
  discount,
  onDiscountChange,
  onSubmit,
  products,
  categories,
  currencySymbol,
}: AddDiscountDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Discount</DialogTitle>
        </DialogHeader>
        <DiscountForm
          discount={discount}
          onChange={onDiscountChange}
          products={products}
          categories={categories}
          currencySymbol={currencySymbol}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Add Discount</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
