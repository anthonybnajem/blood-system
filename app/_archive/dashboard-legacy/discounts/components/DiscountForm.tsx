"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Percent, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { type Discount, type DiscountType } from "@/lib/db";
import {
  type Product,
  type Category,
} from "@/components/pos-data-provider";

type DiscountFormData = Omit<Discount, "id" | "usageCount">;

interface DiscountFormProps {
  discount: DiscountFormData;
  onChange: (discount: DiscountFormData) => void;
  showUsageCount?: boolean;
  usageCount?: number;
  usageLimit?: number;
  products?: Product[];
  categories?: Category[];
  currencySymbol?: string;
}

export function DiscountForm({
  discount,
  onChange,
  showUsageCount = false,
  usageCount,
  usageLimit,
  products = [],
  categories = [],
  currencySymbol = "$",
}: DiscountFormProps) {
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const selectedProducts = useMemo(() => {
    if (!discount.productIds?.length) return [];
    return products.filter((product) =>
      discount.productIds?.includes(product.id)
    );
  }, [products, discount.productIds]);
  const selectedCategories = useMemo(() => {
    if (!discount.categoryIds?.length) return [];
    return categories.filter((category) =>
      discount.categoryIds?.includes(category.id)
    );
  }, [categories, discount.categoryIds]);
  const filteredProducts = useMemo(() => {
    const query = productSearch.toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(query)
    );
  }, [products, productSearch]);
  const filteredCategories = useMemo(() => {
    const query = categorySearch.toLowerCase();
    if (!query) return categories;
    return categories.filter((category) =>
      (category.name || "").toLowerCase().includes(query)
    );
  }, [categories, categorySearch]);
  const toggleProduct = (productId: string) => {
    const existing = discount.productIds || [];
    const next = existing.includes(productId)
      ? existing.filter((id) => id !== productId)
      : [...existing, productId];
    onChange({ ...discount, productIds: next });
  };
  const toggleCategory = (categoryId: string) => {
    const existing = discount.categoryIds || [];
    const next = existing.includes(categoryId)
      ? existing.filter((id) => id !== categoryId)
      : [...existing, categoryId];
    onChange({ ...discount, categoryIds: next });
  };
  const formatDiscountDisplay = (baseValue?: number) => {
    if (discount.type === "percentage") {
      if (typeof baseValue === "number") {
        const amount = baseValue * (discount.value / 100);
        return `${discount.value}% (${currencySymbol}${amount.toFixed(2)})`;
      }
      return `${discount.value}%`;
    }
    return `${currencySymbol}${discount.value.toFixed(2)}`;
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Discount Name</Label>
        <Input
          id="name"
          value={discount.name}
          onChange={(e) => onChange({ ...discount, name: e.target.value })}
          placeholder="Summer Sale"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Discount Code (Optional)</Label>
        <Input
          id="code"
          value={discount.code || ""}
          onChange={(e) => onChange({ ...discount, code: e.target.value })}
          placeholder="SUMMER25"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Discount Type</Label>
          <Select
            value={discount.type}
            onValueChange={(value: DiscountType) =>
              onChange({ ...discount, type: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="value">
            {discount.type === "percentage"
              ? "Percentage Value"
              : "Fixed Amount"}
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              {discount.type === "percentage" ? (
                <Percent className="h-4 w-4 text-muted-foreground" />
              ) : (
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <Input
              id="value"
              type="number"
              value={discount.value || ""}
              onChange={(e) =>
                onChange({
                  ...discount,
                  value: Number.parseFloat(e.target.value) || 0,
                })
              }
              className="pl-9"
              placeholder={discount.type === "percentage" ? "25" : "10.00"}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="appliesTo">Applies To</Label>
        <Select
          value={discount.appliesTo}
          onValueChange={(value: "all" | "category" | "product" | "cart") =>
            onChange({
              ...discount,
              appliesTo: value,
              productIds: value === "product" ? discount.productIds || [] : [],
              categoryIds:
                value === "category" ? discount.categoryIds || [] : [],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select where discount applies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="cart">Cart Total</SelectItem>
            <SelectItem value="category">Specific Categories</SelectItem>
            <SelectItem value="product">Specific Products</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {discount.appliesTo === "product" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Select Products</Label>
            {discount.productIds?.length ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...discount, productIds: [] })}
              >
                Clear
              </Button>
            ) : null}
          </div>
          <Input
            placeholder="Search products"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          <ScrollArea className="h-48 border rounded-md">
            <div className="p-2 space-y-2">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No products match your search.
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {currencySymbol}
                        {product.price.toFixed(2)}
                      </p>
                    </div>
                    <Checkbox
                      checked={discount.productIds?.includes(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
          {selectedProducts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedProducts.map((product) => (
                <Badge key={product.id} variant="secondary">
                  <span className="truncate max-w-[120px]">{product.name}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {formatDiscountDisplay(product.price)}
                  </span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Choose the products that should receive this discount.
            </p>
          )}
        </div>
      )}

      {discount.appliesTo === "category" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Select Categories</Label>
            {discount.categoryIds?.length ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...discount, categoryIds: [] })}
              >
                Clear
              </Button>
            ) : null}
          </div>
          <Input
            placeholder="Search categories"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
          />
          <ScrollArea className="h-48 border rounded-md">
            <div className="p-2 space-y-2">
              {filteredCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No categories found.
                </p>
              ) : (
                filteredCategories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
                  >
                    <p className="text-sm font-medium truncate">
                      {category.name}
                    </p>
                    <Checkbox
                      checked={discount.categoryIds?.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
          {selectedCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((category) => (
                <Badge key={category.id} variant="secondary">
                  {category.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Select the categories where this discount applies.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Active</Label>
          <Switch
            id="isActive"
            checked={discount.isActive}
            onCheckedChange={(checked) =>
              onChange({ ...discount, isActive: checked })
            }
          />
        </div>
      </div>

      {showUsageCount && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Usage Count: {usageCount}
            {usageLimit && ` / ${usageLimit}`}
          </p>
        </div>
      )}
    </div>
  );
}
