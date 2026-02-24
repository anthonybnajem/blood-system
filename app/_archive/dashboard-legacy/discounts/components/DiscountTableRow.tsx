"use client";

import { type Discount } from "@/lib/db";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Percent, DollarSign, Edit, Trash2 } from "lucide-react";
import {
  type Product,
  type Category,
} from "@/components/pos-data-provider";

interface DiscountTableRowProps {
  discount: Discount;
  onEdit: (discount: Discount) => void;
  onDelete: (id: string) => void;
  productMap: Map<string, Product>;
  categoryMap: Map<string, Category>;
  currencySymbol: string;
}

export function DiscountTableRow({
  discount,
  onEdit,
  onDelete,
  productMap,
  categoryMap,
  currencySymbol,
}: DiscountTableRowProps) {
  const formatDiscountValue = (discount: Discount) => {
    return discount.type === "percentage"
      ? `${discount.value}%`
      : `$${discount.value.toFixed(2)}`;
  };
  const targetDetails = () => {
    if (discount.appliesTo === "product") {
      const selectedProducts =
        discount.productIds
          ?.map((id) => productMap.get(id))
          .filter((product): product is Product => Boolean(product)) || [];
      if (selectedProducts.length === 0) {
        return <p className="text-sm text-muted-foreground">No products selected</p>;
      }
      return (
        <div className="space-y-1">
          {selectedProducts.slice(0, 3).map((product) => {
            const amountText =
              discount.type === "percentage"
                ? `${discount.value}% (${currencySymbol}${(
                    product.price * (discount.value / 100)
                  ).toFixed(2)})`
                : `${currencySymbol}${discount.value.toFixed(2)}`;
            return (
              <div
                key={product.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate font-medium">{product.name}</span>
                <span className="text-muted-foreground">-{amountText}</span>
              </div>
            );
          })}
          {selectedProducts.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{selectedProducts.length - 3} more
            </p>
          )}
        </div>
      );
    }
    if (discount.appliesTo === "category") {
      const selectedCategories =
        discount.categoryIds
          ?.map((id) => categoryMap.get(id))
          .filter((category): category is Category => Boolean(category)) || [];
      if (selectedCategories.length === 0) {
        return <p className="text-sm text-muted-foreground">No categories selected</p>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {selectedCategories.map((category) => (
            <Badge key={category.id} variant="secondary">
              {category.name}
            </Badge>
          ))}
        </div>
      );
    }
    if (discount.appliesTo === "all") {
      return <p className="text-sm text-muted-foreground">All products</p>;
    }
    if (discount.appliesTo === "cart") {
      return (
        <p className="text-sm text-muted-foreground">
          Entire cart subtotal
        </p>
      );
    }
    return null;
  };

  return (
    <TableRow key={discount.id}>
      <TableCell className="font-medium">{discount.name}</TableCell>
      <TableCell>{discount.code || "-"}</TableCell>
      <TableCell>
        <div className="flex items-center">
          {discount.type === "percentage" ? (
            <Percent className="mr-1 h-4 w-4 text-muted-foreground" />
          ) : (
            <DollarSign className="mr-1 h-4 w-4 text-muted-foreground" />
          )}
          {formatDiscountValue(discount)}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {discount.appliesTo === "all"
            ? "All Products"
            : discount.appliesTo === "cart"
            ? "Cart Total"
            : discount.appliesTo === "category"
            ? "Categories"
            : "Specific Products"}
        </Badge>
      </TableCell>
      <TableCell>{targetDetails()}</TableCell>
      <TableCell>
        <Badge variant={discount.isActive ? "default" : "secondary"}>
          {discount.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(discount)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => onDelete(discount.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
