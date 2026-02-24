"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataExportImport } from "@/components/data-export-import";
import { DatabaseTools } from "@/components/database-tools";
import { SqliteBackupRestore } from "@/components/sqlite-backup-restore";
import { Database, HardDriveDownload, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("My Starter Project");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage app preferences, backups, and developer tools.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <HardDriveDownload className="h-4 w-4" />
            Backup & Restore
          </TabsTrigger>
          <TabsTrigger value="developer" className="gap-2">
            <Database className="h-4 w-4" />
            Developer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <select
                  id="theme"
                  value={theme ?? "system"}
                  onChange={(e) => setTheme(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/40 bg-white/50 px-3 text-sm backdrop-blur-md dark:border-white/15 dark:bg-white/5"
                >
                  <option value="system">system</option>
                  <option value="light">light</option>
                  <option value="dark">dark</option>
                </select>
              </div>
              <Button
                onClick={() =>
                  toast({
                    title: "Settings saved",
                    description: "Starter settings updated.",
                  })
                }
              >
                Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <DataExportImport />
          <SqliteBackupRestore />
        </TabsContent>

        <TabsContent value="developer" className="space-y-4">
          <DatabaseTools />
          <Card>
            <CardHeader>
              <CardTitle>Developer Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Use backup before reset or restore operations. Browser data and SQLite credentials are managed separately.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
