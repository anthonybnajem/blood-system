"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("My Starter Project");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Basic starter settings you can expand for your own project.
        </p>
      </div>

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
    </div>
  );
}
