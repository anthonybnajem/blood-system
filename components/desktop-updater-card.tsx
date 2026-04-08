"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getDesktopUpdateState,
  installDesktopUpdate,
  isElectron,
  subscribeToDesktopUpdateState,
  triggerDesktopUpdateCheck,
  type DesktopUpdateState,
} from "@/lib/electron-utils";

const EMPTY_UPDATE_STATE: DesktopUpdateState = {
  supported: false,
  configured: false,
  status: "unavailable",
  message: "Desktop updates are unavailable.",
  currentVersion: "1.0.0",
  availableVersion: null,
  downloadedVersion: null,
  progressPercent: null,
};

const STATUS_LABELS: Record<DesktopUpdateState["status"], string> = {
  unavailable: "Unavailable",
  idle: "Up to date",
  checking: "Checking",
  available: "Ready",
  downloading: "Downloading",
  downloaded: "Downloaded",
  error: "Error",
};

export function DesktopUpdaterCard() {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<DesktopUpdateState>(EMPTY_UPDATE_STATE);
  const [isChecking, setIsChecking] = useState(false);

  const runUpdateCheck = async () => {
    setIsChecking(true);
    try {
      const nextState = await triggerDesktopUpdateCheck();
      setState(nextState);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!isElectron()) {
      return;
    }

    setEnabled(true);

    let cancelled = false;
    void getDesktopUpdateState().then((value) => {
      if (!cancelled) {
        setState(value);
      }
    });

    void runUpdateCheck();

    const unsubscribe = subscribeToDesktopUpdateState((value) => {
      setState(value);
      if (value.status !== "checking") {
        setIsChecking(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!enabled) {
    return null;
  }

  const handleCheck = async () => {
    await runUpdateCheck();
  };

  const handleInstall = async () => {
    await installDesktopUpdate();
  };

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Desktop Updates</CardTitle>
          <CardDescription>
            Release builds update in place. When a new version is found, it downloads in the
            background and installs after restart.
          </CardDescription>
        </div>
        <Badge variant={state.status === "error" ? "destructive" : "outline"}>
          {STATUS_LABELS[state.status]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border p-3">
            <div className="text-muted-foreground">Installed version</div>
            <div className="mt-1 font-medium">{state.currentVersion}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-muted-foreground">Available version</div>
            <div className="mt-1 font-medium">
              {state.downloadedVersion || state.availableVersion || "No pending update"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
          {state.message}
        </div>

        {state.status === "downloading" ? (
          <div className="space-y-2">
            <Progress value={state.progressPercent ?? 0} />
            <div className="text-xs text-muted-foreground">
              {Math.round(state.progressPercent ?? 0)}%
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleCheck()}
            disabled={isChecking || state.status === "downloading"}
          >
            {isChecking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Check for Updates
          </Button>

          {state.status === "downloaded" ? (
            <Button type="button" onClick={() => void handleInstall()}>
              Install and Restart
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
