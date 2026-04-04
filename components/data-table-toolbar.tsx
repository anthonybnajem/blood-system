"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DataTableToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  onExport: () => void;
  exportLabel?: string;
  exportDisabled?: boolean;
  children?: React.ReactNode;
};

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onExport,
  exportLabel = "Export Excel",
  exportDisabled = false,
  children,
}: DataTableToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
      <Input
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="lg:max-w-sm"
      />
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
        {children}
        <Button
          type="button"
          variant="outline"
          onClick={onExport}
          disabled={exportDisabled}
          className="sm:ml-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          {exportLabel}
        </Button>
      </div>
    </div>
  );
}
