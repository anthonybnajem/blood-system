import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Discount } from "@/lib/db";

interface DiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  discountType: "percentage" | "fixed";
  setDiscountType: (type: "percentage" | "fixed") => void;
  discountValue: number;
  setDiscountValue: (value: number) => void;
  discountAmount: number;
  cartTotal: number;
  currencySymbol: string;
  applyDiscount: () => void;
  savedDiscounts: Discount[];
  selectedDiscountId: string | null;
  onSelectSavedDiscount: (discountId: string) => void;
  onClearSavedDiscount: () => void;
  appliedDiscount?: Discount | null;
  savedDiscountError?: string | null;
}

export default function DiscountDialog({
  isOpen,
  onClose,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  discountAmount,
  cartTotal,
  currencySymbol,
  applyDiscount,
  savedDiscounts,
  selectedDiscountId,
  onSelectSavedDiscount,
  onClearSavedDiscount,
  appliedDiscount,
  savedDiscountError,
}: DiscountDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
          <DialogDescription>
            Add a discount to the current sale.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Saved Discount</Label>
            <Select
              value={selectedDiscountId ?? "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  onClearSavedDiscount();
                } else {
                  onSelectSavedDiscount(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a saved discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No saved discount</SelectItem>
                {savedDiscounts.length === 0 ? (
                  <SelectItem value="placeholder" disabled>
                    Create one in the Discounts page
                  </SelectItem>
                ) : (
                  savedDiscounts.map((discount) => (
                    <SelectItem key={discount.id} value={discount.id}>
                      {discount.name}
                      {discount.code ? ` (${discount.code})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {appliedDiscount && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{appliedDiscount.type === "percentage" ? `${appliedDiscount.value}%` : `${currencySymbol}${appliedDiscount.value}`}</Badge>
                  <span className="font-medium">{appliedDiscount.name}</span>
                </div>
                {appliedDiscount.code && (
                  <p className="text-muted-foreground text-xs">
                    Code: {appliedDiscount.code}
                  </p>
                )}
                {savedDiscountError ? (
                  <p className="text-xs text-destructive">
                    {savedDiscountError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This discount overrides manual settings.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="discount-type">Discount Type</Label>
              <Tabs
                defaultValue={discountType}
                className="w-full"
                onValueChange={(value) => {
                  if (selectedDiscountId) return;
                  setDiscountType(value as "percentage" | "fixed");
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="percentage">Percentage (%)</TabsTrigger>
                  <TabsTrigger value="fixed">Fixed Amount</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="discount-value">
              {discountType === "percentage"
                ? "Discount Percentage"
                : "Discount Amount"}
            </Label>
            <Input
              id="discount-value"
              type="number"
              min="0"
              max={discountType === "percentage" ? "100" : undefined}
              value={discountValue}
              onChange={(e) =>
                setDiscountValue(Number.parseFloat(e.target.value) || 0)
              }
              disabled={Boolean(selectedDiscountId)}
            />
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between font-medium">
              <span>Discount Amount:</span>
              <span>
                {currencySymbol}
                {discountAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-medium mt-2">
              <span>New Total:</span>
              <span>
                {currencySymbol}
                {cartTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={applyDiscount} disabled={Boolean(selectedDiscountId && savedDiscountError)}>
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
