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

interface EditDiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  discount: Discount | null;
  onDiscountChange: (discount: Discount) => void;
  onSubmit: () => void;
  products: Product[];
  categories: Category[];
  currencySymbol: string;
}

export function EditDiscountDialog({
  isOpen,
  onClose,
  discount,
  onDiscountChange,
  onSubmit,
  products,
  categories,
  currencySymbol,
}: EditDiscountDialogProps) {
  if (!discount) return null;

  const formData = {
    name: discount.name,
    code: discount.code || "",
    type: discount.type,
    value: discount.value,
    isActive: discount.isActive,
    appliesTo: discount.appliesTo,
    productIds: discount.productIds || [],
    categoryIds: discount.categoryIds || [],
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Discount</DialogTitle>
        </DialogHeader>
        <DiscountForm
          discount={formData}
          onChange={(data) => onDiscountChange({ ...discount, ...data })}
          showUsageCount={true}
          usageCount={discount.usageCount}
          usageLimit={discount.usageLimit}
          products={products}
          categories={categories}
          currencySymbol={currencySymbol}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
