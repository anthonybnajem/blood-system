"use client";

import { useEffect, useState } from "react";
import { type Product } from "@/components/pos-data-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatMeasurementValue,
  formatStockDisplay,
  getUnitIncrement,
  getUnitLabel,
} from "@/lib/product-measurements";

interface WeightQuantityDialogProps {
  product: Product | null;
  isOpen: boolean;
  currencySymbol: string;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export function WeightQuantityDialog({
  product,
  isOpen,
  currencySymbol,
  onClose,
  onConfirm,
}: WeightQuantityDialogProps) {
  const [quantity, setQuantity] = useState("");
  const unitLabel = getUnitLabel(product ?? undefined);
  const unitIncrement = getUnitIncrement(product ?? undefined);
  const availableStock = product?.stock ?? 0;

  useEffect(() => {
    if (product && product.stock > 0) {
      const defaultQuantity = Math.min(product.stock, unitIncrement);
      setQuantity(formatMeasurementValue(defaultQuantity));
    } else {
      setQuantity("");
    }
  }, [product, unitIncrement]);

  const parsedQuantity = parseFloat(quantity);
  const isQuantityValid =
    !!product &&
    product.stock > 0 &&
    !Number.isNaN(parsedQuantity) &&
    parsedQuantity > 0 &&
    parsedQuantity <= product.stock + 0.0001;

  const handleConfirm = () => {
    if (!product || !isQuantityValid) return;
    onConfirm(Math.min(parsedQuantity, product.stock));
  };

  return (
    <Dialog
      open={isOpen && Boolean(product)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Weight</DialogTitle>
          <DialogDescription>
            Specify how many {unitLabel} of {product?.name} should be added to
            the cart.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Price</p>
              <p className="font-semibold">
                {currencySymbol}
                {product?.price.toFixed(2)} / {unitLabel}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Available</p>
              <p className="font-semibold">
                {formatStockDisplay(product ?? undefined)}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Quantity ({unitLabel})
            </label>
            <Input
              type="number"
              min="0"
              step={unitIncrement}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!product || availableStock <= 0}
            />
            <p className="text-xs text-muted-foreground">
              Minimum step {formatMeasurementValue(unitIncrement)} {unitLabel}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isQuantityValid}>
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
