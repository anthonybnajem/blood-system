"use client";

import { type Discount } from "@/lib/db";
import {
  type Product,
  type Category,
} from "@/components/pos-data-provider";
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
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Tag } from "lucide-react";
import { DiscountTableRow } from "./DiscountTableRow";

interface DiscountTableProps {
  discounts: Discount[];
  onEdit: (discount: Discount) => void;
  onDelete: (id: string) => void;
  products: Product[];
  categories: Category[];
  currencySymbol: string;
}

export function DiscountTable({
  discounts,
  onEdit,
  onDelete,
  products,
  categories,
  currencySymbol,
}: DiscountTableProps) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const categoryMap = new Map(
    categories.map((category) => [category.id, category])
  );

  return (
    <div className="overflow-x-auto min-w-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Applies To</TableHead>
            <TableHead>Targets</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discounts.length > 0 ? (
            discounts.map((discount) => (
              <DiscountTableRow
                key={discount.id}
                discount={discount}
                onEdit={onEdit}
                onDelete={onDelete}
                productMap={productMap}
                categoryMap={categoryMap}
                currencySymbol={currencySymbol}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="py-8">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Tag className="h-6 w-6" />
                    </EmptyMedia>
                    <EmptyTitle>No discounts found</EmptyTitle>
                    <EmptyDescription>
                      Create your first discount to start offering promotions to
                      customers.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
