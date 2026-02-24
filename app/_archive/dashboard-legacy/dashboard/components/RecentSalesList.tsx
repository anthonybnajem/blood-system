"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ShoppingCart } from "lucide-react";
import { type Sale } from "@/components/pos-data-provider";

interface RecentSalesListProps {
  sales: Sale[];
}

export function RecentSalesList({ sales }: RecentSalesListProps) {
  return (
    <Card className="col-span-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-xl">Recent Sales</CardTitle>
        </div>
        <Link
          href="/receipts"
          className="text-sm font-medium text-primary hover:underline"
        >
          View more
        </Link>
      </CardHeader>
      <CardContent>
        {sales.length > 0 ? (
          <div className="space-y-4">
            {sales.slice(0, 5).map((sale) => (
              <Link
                key={sale.id}
                href={`/receipts/${encodeURIComponent(sale.id)}`}
                className="flex justify-between items-center rounded-md border p-3 transition hover:border-primary/50 hover:bg-primary/5"
              >
                <div>
                  <p className="text-sm font-medium text-primary">
                    Receipt #{sale.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sale.date).toLocaleString()}
                  </p>
                </div>
                <p className="font-medium">${sale.total.toFixed(2)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingCart className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No sales recorded yet</EmptyTitle>
              <EmptyDescription>
                Start making sales to see them appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Link
          href="/receipts"
          className="text-sm font-medium text-primary hover:underline"
        >
          View more
        </Link>
      </CardFooter>
    </Card>
  );
}
