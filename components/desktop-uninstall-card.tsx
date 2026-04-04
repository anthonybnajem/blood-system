"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  getDesktopUninstallInfo,
  isElectron,
  launchDesktopUninstaller,
  type DesktopUninstallInfo,
} from "@/lib/electron-utils";

const EMPTY_UNINSTALL_INFO: DesktopUninstallInfo = {
  supported: false,
  platform: "unknown",
  userDataPath: "",
  dataPath: "",
  uninstallPath: null,
};

export function DesktopUninstallCard() {
  const [enabled, setEnabled] = useState(false);
  const [info, setInfo] = useState<DesktopUninstallInfo>(EMPTY_UNINSTALL_INFO);
  const [isLaunching, setIsLaunching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isElectron()) {
      return;
    }

    setEnabled(true);
    void getDesktopUninstallInfo().then((value) => {
      setInfo(value);
    });
  }, []);

  if (!enabled || !info.supported) {
    return null;
  }

  const handleUninstall = async () => {
    const confirmed = window.confirm(
      "Uninstall Blood System from this Windows device? The local database folder will stay on disk so reinstalling can use the same data."
    );
    if (!confirmed) {
      return;
    }

    setIsLaunching(true);
    try {
      const launched = await launchDesktopUninstaller();
      if (!launched) {
        throw new Error("Could not launch the Windows uninstaller.");
      }
    } catch (error: any) {
      toast({
        title: "Uninstall failed",
        description: error?.message || "Could not launch the Windows uninstaller.",
        variant: "destructive",
      });
      setIsLaunching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desktop Uninstall</CardTitle>
        <CardDescription>
          Remove the Windows app without deleting the local database folder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The application is uninstalled, but the data folder stays on disk. Reinstalling the
            app can continue using the same database.
          </AlertDescription>
        </Alert>

        <div className="rounded-xl border p-3 text-sm">
          <div className="text-muted-foreground">Database folder kept on disk</div>
          <div className="mt-1 break-all font-medium">{info.dataPath || "Unavailable"}</div>
        </div>

        <Button type="button" variant="destructive" onClick={() => void handleUninstall()} disabled={isLaunching}>
          {isLaunching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Uninstall Desktop App
        </Button>
      </CardContent>
    </Card>
  );
}
