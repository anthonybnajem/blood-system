"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Download, FileJson, Loader2, RefreshCw, Upload } from "lucide-react";
import {
  exportBrowserMaintenanceData,
  getBrowserMaintenanceStats,
  importBrowserMaintenanceData,
} from "@/lib/app-maintenance";

export function BrowserMaintenance() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<{
    settings: number;
    employees: number;
    customers: number;
  } | null>(null);

  const refreshStats = async () => {
    setIsRefreshing(true);
    try {
      const data = await getBrowserMaintenanceStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load maintenance stats:", error);
      toast({
        title: "Load failed",
        description: "Could not inspect browser maintenance data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportBrowserMaintenanceData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `browser-settings-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: "Browser settings export downloaded successfully.",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Could not export browser settings.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      await importBrowserMaintenanceData(file);
      toast({
        title: "Import complete",
        description: "Browser settings were imported successfully.",
      });
      await refreshStats();
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import failed",
        description: "Could not import browser settings.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Browser Maintenance
        </CardTitle>
        <CardDescription>
          Export and import browser-side settings and inspect the local dashboard cache.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void refreshStats()} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Browser Data
              </>
            )}
          </Button>
        </div>

        {stats ? (
          <div className="rounded-lg border p-3 text-sm">
            <div>Settings records: {stats.settings}</div>
            <div>Employees cache: {stats.employees}</div>
            <div>Customers cache: {stats.customers}</div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Use “Check Browser Data” to inspect the local browser cache.
          </p>
        )}

        {(isExporting || isImporting) ? (
          <div className="text-sm text-muted-foreground">
            {isExporting ? "Preparing export..." : "Importing settings..."}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={() => void handleExport()} disabled={isExporting || isImporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Browser Settings
              </>
            )}
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleImportClick} disabled={isExporting || isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Browser Settings
              </>
            )}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        This does not export lab visit data from SQLite. It only manages browser-side settings/cache.
      </CardFooter>
    </Card>
  );
}
