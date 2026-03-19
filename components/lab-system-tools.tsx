"use client";

import { useRef, useState } from "react";
import { DatabaseBackup, Download, Loader2, RefreshCcw, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export function LabSystemTools() {
  const { toast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [demoSeedCount, setDemoSeedCount] = useState("1000");
  const [isSeeding, setIsSeeding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSeed = async () => {
    const patientCount = Number(demoSeedCount);
    if (!Number.isFinite(patientCount) || patientCount < 1) {
      toast({
        title: "Invalid patient count",
        description: "Enter a valid number of patients to seed.",
        variant: "destructive",
      });
      return;
    }

    setIsSeeding(true);
    try {
      const response = await fetch("/api/lab/demo-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientCount }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to seed demo data");
      }

      toast({
        title: "Demo data seeded",
        description: `${body.data?.patients ?? patientCount} patients, ${body.data?.visits ?? 0} reports, and ${body.data?.results ?? 0} results were added.`,
      });
    } catch (error: any) {
      toast({
        title: "Seed failed",
        description: error?.message || "Could not seed demo data.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/lab/system/export", {
        method: "GET",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to export blood system data");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const fileName =
        disposition?.match(/filename="(.+)"/)?.[1] ||
        `blood-system-export-${new Date().toISOString().slice(0, 10)}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: "Blood system data export downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.message || "Could not export blood system data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/lab/system/import", {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to import blood system data");
      }

      toast({
        title: "Import complete",
        description: "Blood system data imported successfully. Reloading page...",
      });
      setTimeout(() => window.location.reload(), 1200);
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error?.message || "Could not import blood system data.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const response = await fetch("/api/lab/system/reset", {
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to reset blood system data");
      }

      toast({
        title: "Lab records reset",
        description: "Patients, reports, results, audit history, and lab tests were cleared. Reloading page...",
      });
      setTimeout(() => window.location.reload(), 1200);
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error?.message || "Could not reset blood system data.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lab Data Tools</CardTitle>
        <CardDescription>
          Manage blood system data for migration, demo setup, and clean operational resets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <DatabaseBackup className="h-4 w-4" />
          <AlertTitle>Use the right tool</AlertTitle>
          <AlertDescription>
            JSON export/import is for blood system data transfer. SQLite backup/restore is the full database file backup.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Seed Demo Data</h3>
            <p className="text-sm text-muted-foreground">
              Generate sample patients, reports, and saved lab results for testing and training.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[220px_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="lab-demo-seed-count">Patient count</Label>
              <Input
                id="lab-demo-seed-count"
                type="number"
                min={1}
                max={5000}
                step={100}
                value={demoSeedCount}
                onChange={(e) => setDemoSeedCount(e.target.value)}
              />
            </div>
            <Button onClick={() => void handleSeed()} disabled={isSeeding}>
              {isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <DatabaseBackup className="mr-2 h-4 w-4" />
                  Seed Demo Data
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Export Or Import Blood System Data</h3>
            <p className="text-sm text-muted-foreground">
              Transfer employees, lab catalog, patients, reports, results, and report settings as a JSON file.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => void handleExport()} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Blood System Data
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Blood System Data
                </>
              )}
            </Button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Reset Blood System Data</h3>
            <p className="text-sm text-muted-foreground">
              Clear patients, reports, results, audit history, and the lab test catalog while keeping employee access.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isResetting}>
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reset Lab Records
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset blood system data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete patients, reports, results, audit history, departments, panels, tests, ranges, and report settings. Employee access will stay in place.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleReset()}>
                  Reset Blood System Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
