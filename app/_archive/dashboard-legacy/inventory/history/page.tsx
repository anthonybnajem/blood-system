"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePosData } from "@/components/pos-data-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { StockMovementHistory } from "../components/StockMovementHistory";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { type StockMovement } from "@/components/pos-data-provider";
import { format, subDays } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { stockMovementsApi } from "@/lib/db";

export default function InventoryHistoryPage() {
  const { stockMovements, products, fetchData } = usePosData();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter movements
  const filteredMovements = stockMovements.filter((movement) => {
    const matchesType = filterType === "all" || movement.type === filterType;
    const matchesProduct =
      filterProduct === "all" || movement.productId === filterProduct;

    let matchesDate = true;
    if (dateRange !== "all") {
      const days = parseInt(dateRange);
      const startDate = subDays(new Date(), days);
      matchesDate = new Date(movement.date) >= startDate;
    }

    return matchesType && matchesProduct && matchesDate;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const handleExportMovements = () => {
    if (filteredMovements.length === 0) {
      toast({
        title: "Nothing to Export",
        description: "No stock movements match the current filters.",
      });
      return;
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      total: filteredMovements.length,
      movements: filteredMovements.map((movement) => ({
        ...movement,
        date: new Date(movement.date).toISOString(),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-movements-${format(
      new Date(),
      "yyyyMMdd-HHmmss"
    )}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Ready",
      description: `${filteredMovements.length} movements exported as JSON.`,
    });
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      const movements = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.movements)
        ? parsed.movements
        : [];

      if (movements.length === 0) {
        toast({
          title: "Import Failed",
          description: "No valid stock movements found in the file.",
          variant: "destructive",
        });
        return;
      }

      for (const raw of movements as Partial<StockMovement>[]) {
        if (!raw.productId || !raw.type) {
          continue;
        }
        const movement: StockMovement = {
          id: raw.id && typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
          productId: raw.productId,
          type: (raw.type as StockMovement["type"]) || "adjustment",
          quantity: Number(raw.quantity) || 0,
          previousStock: Number(raw.previousStock) || 0,
          newStock: Number(raw.newStock) || 0,
          reason: raw.reason,
          notes: raw.notes,
          userId: raw.userId,
          date: raw.date ? new Date(raw.date) : new Date(),
        };
        await stockMovementsApi.add(movement);
      }

      await fetchData();
      toast({
        title: "Import Complete",
        description: `${movements.length} stock movements imported.`,
      });
    } catch (error) {
      console.error("Failed to import stock movements:", error);
      toast({
        title: "Import Failed",
        description: "Could not import the provided file.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleExportCSV = () => {
    if (filteredMovements.length === 0) {
      toast({
        title: "Nothing to Export",
        description: "No stock movements match the current filters.",
      });
      return;
    }

    const headers = [
      "ID",
      "Product Name",
      "Product ID",
      "Movement Type",
      "Quantity",
      "Previous Stock",
      "New Stock",
      "Reason",
      "Notes",
      "Recorded By",
      "Date",
    ];

    const rows = filteredMovements.map((movement) => {
      const product =
        products.find((p) => p.id === movement.productId) || null;
      return [
        movement.id,
        product?.name || "Unknown Product",
        movement.productId,
        movement.type,
        movement.quantity.toString(),
        movement.previousStock.toString(),
        movement.newStock.toString(),
        movement.reason || "",
        movement.notes || "",
        movement.userId || "",
        new Date(movement.date).toISOString(),
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-movements-${format(
      new Date(),
      "yyyyMMdd-HHmmss"
    )}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Ready",
      description: `${filteredMovements.length} movements exported as CSV.`,
    });
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 overflow-hidden min-w-0"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <History className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Stock Movement History
            </h1>
            <p className="text-muted-foreground mt-1">
              View all stock movements and adjustments
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Movement Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="border-2">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={filterProduct} onValueChange={setFilterProduct}>
                  <SelectTrigger className="border-2">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="border-2">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* History Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-2 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">
                  Movement History
                </CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleExportMovements}>
                  Export JSON
                </Button>
                <Button variant="outline" onClick={handleExportCSV}>
                  Export CSV
                </Button>
                <Button variant="default" onClick={triggerImport} disabled={isImporting}>
                  {isImporting ? "Importing..." : "Import"}
                </Button>
                <p className="text-sm text-muted-foreground md:ml-3">
                  {filteredMovements.length} movements
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-hidden min-w-0 p-0">
            <StockMovementHistory
              movements={filteredMovements}
              products={products}
            />
          </CardContent>
        </Card>
      </motion.div>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        className="hidden"
        onChange={handleImportFile}
      />
    </motion.div>
  );
}
