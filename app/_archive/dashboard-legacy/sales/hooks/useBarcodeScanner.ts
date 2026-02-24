"use client";

import { useState, useEffect, useRef } from "react";
import { type Product } from "@/components/pos-data-provider";
import { useToast } from "@/components/ui/use-toast";

interface UseBarcodeScannerProps {
  products: Product[];
  onScanProduct: (product: Product) => void;
}

export function useBarcodeScanner({
  products,
  onScanProduct,
}: UseBarcodeScannerProps) {
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleBarcodeInput = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Check if Enter is pressed (barcode scanners often send Enter after the code)
      if (e.key === "Enter" && barcodeBuffer.length > 0) {
        e.preventDefault();
        const trimmedBarcode = barcodeBuffer.trim();
        const product = products.find((p) => p.barcode === trimmedBarcode);
        if (product) {
          onScanProduct(product);
        } else {
          toast({
            title: "Barcode Not Found",
            description: `No product found with barcode: ${trimmedBarcode}`,
            variant: "destructive",
          });
        }
        setBarcodeBuffer("");
        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
          barcodeTimeoutRef.current = null;
        }
        return;
      }

      // Accumulate characters (barcode scanners input very quickly)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setBarcodeBuffer((prev) => prev + e.key);

        // Clear buffer after 100ms of no input (barcode scanners are very fast)
        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
        }
        barcodeTimeoutRef.current = setTimeout(() => {
          setBarcodeBuffer("");
        }, 100);
      }
    };

    window.addEventListener("keydown", handleBarcodeInput);
    return () => {
      window.removeEventListener("keydown", handleBarcodeInput);
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcodeBuffer, products, onScanProduct, toast]);
}
