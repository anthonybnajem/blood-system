"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Download, Upload, Loader2, ShieldAlert, Database } from "lucide-react";

export function SqliteBackupRestore() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastDownloadedFileName, setLastDownloadedFileName] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [backupDir, setBackupDir] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    void fetch("/api/admin/sqlite/info", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) return;
        setDbPath(String(body?.data?.dbPath || ""));
        setBackupDir(String(body?.data?.backupDir || ""));
      })
      .catch(() => {});
  }, []);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch("/api/admin/sqlite/backup", {
        method: "GET",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to download SQLite backup");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const fallbackName = `sqlite-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.sqlite`;
      const fileName =
        disposition?.match(/filename="(.+)"/)?.[1] || fallbackName;
      setLastDownloadedFileName(fileName);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "SQLite Backup Complete",
        description: `${fileName} was sent to your browser download location.`,
      });
    } catch (error: any) {
      toast({
        title: "Backup Failed",
        description: error?.message || "Could not backup SQLite database.",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/sqlite/restore", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "SQLite restore failed");
      }

      toast({
        title: "SQLite Restore Complete",
        description:
          "SQLite database restored. Please sign out and sign in again.",
      });
    } catch (error: any) {
      toast({
        title: "Restore Failed",
        description: error?.message || "Could not restore SQLite database.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Lab Database Backup & Restore
        </CardTitle>
        <CardDescription>
          Download or restore the SQLite database that stores patients, reports, and lab results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Restoring a backup replaces the current lab database. Download a fresh backup before restoring.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <div>
            SQLite DB file:{" "}
            <span className="font-medium break-all text-foreground">
              {dbPath || "Loading..."}
            </span>
          </div>
          <div className="mt-1">
            Server backup folder:{" "}
            <span className="font-medium break-all text-foreground">
              {backupDir || "Loading..."}
            </span>
          </div>
          <div className="mt-3">
            Manual download: your browser downloads the backup file and either saves it to the browser’s default download folder or asks you to choose a location, depending on your browser settings.
          </div>
          <div>
            You cannot force a download location from the app itself; the browser controls that.
          </div>
          <div className="mt-1">
            File name:{" "}
            <span className="font-medium text-foreground">
              {lastDownloadedFileName || `sqlite-backup-${new Date().toISOString().slice(0, 10)}.sqlite`}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleBackup}
            disabled={isBackingUp || isRestoring}
          >
            {isBackingUp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Backing up...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download SQLite Backup
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleRestoreClick}
            disabled={isBackingUp || isRestoring}
          >
            {isRestoring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Restore SQLite File
              </>
            )}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".sqlite,.db"
          onChange={handleRestoreFile}
          className="hidden"
        />
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Admin or manager access required. Supported file types: `.sqlite`, `.db`.
      </CardFooter>
    </Card>
  );
}
