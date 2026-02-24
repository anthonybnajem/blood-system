"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { checkDatabaseHealth, resetDatabase } from "@/lib/db";
import { AlertTriangle, CheckCircle, Database, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function DatabaseTools() {
  const [healthStatus, setHealthStatus] = useState<{
    isHealthy: boolean;
    tables: Record<string, number>;
    error?: string;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleCheckHealth = async () => {
    setIsChecking(true);
    try {
      const status = await checkDatabaseHealth();
      setHealthStatus(status);
    } catch (error) {
      console.error("Error checking database health:", error);
      toast({
        title: "Error",
        description: "Failed to check database health",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      const success = await resetDatabase();
      if (success) {
        toast({
          title: "Database Reset",
          description: "Browser database has been reset. Reloading page...",
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast({
          title: "Reset Failed",
          description: "Failed to reset browser database",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error resetting database:", error);
      toast({
        title: "Error",
        description: "An error occurred while resetting browser database",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Browser Database Tools
        </CardTitle>
        <CardDescription>
          Inspect and manage IndexedDB (Dexie) data used by the app UI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {healthStatus && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">Database Health:</h3>
              {healthStatus.isHealthy ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle className="mr-1 h-3 w-3" /> Healthy
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                  <AlertTriangle className="mr-1 h-3 w-3" /> Unhealthy
                </Badge>
              )}
            </div>

            {healthStatus.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{healthStatus.error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <h4 className="font-medium">Table Records:</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(healthStatus.tables).map(([table, count]) => (
                  <div key={table} className="flex justify-between items-center rounded-md border p-2">
                    <span className="font-medium">{table}</span>
                    <Badge variant="secondary">{count} records</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Actions</h3>
          <p className="text-sm text-muted-foreground">
            Reset will clear browser-side data only. SQLite auth data is managed separately.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleCheckHealth} disabled={isChecking}>
          {isChecking ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Health
            </>
          )}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isResetting}>
              {isResetting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset IndexedDB
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset browser database?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears IndexedDB data used by the app UI. SQLite auth data is not deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleResetDatabase()}>
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
