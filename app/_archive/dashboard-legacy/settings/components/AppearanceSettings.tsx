"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect } from "react";

interface AppearanceSettingsProps {
  onThemeChange: (theme: "light" | "dark" | "system") => void;
}

export function AppearanceSettings({ onThemeChange }: AppearanceSettingsProps) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
    onThemeChange("light");
  }, [setTheme, onThemeChange]);

  const isDark = false;

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            Theme Settings
          </CardTitle>
          <CardDescription>
            Customize the appearance of your POS system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Toggle Switch */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
              <div className="space-y-0.5">
                <Label
                  htmlFor="theme-toggle"
                  className="text-base font-semibold"
                >
                  Theme Locked
                </Label>
                <p className="text-sm text-muted-foreground">
                  Light mode is enforced across the application.
                </p>
              </div>
            </div>
            <Switch
              id="theme-toggle"
              checked={isDark}
              disabled
            />
          </div>

          <Separator />

          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Theme Preference</Label>
            <p className="text-sm text-muted-foreground">
              Choose how the theme should be applied.
            </p>
            <RadioGroup value="light" className="space-y-3">
              <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="light" id="light" disabled />
                <Label
                  htmlFor="light"
                  className="flex-1 flex items-center gap-3 cursor-pointer"
                >
                  <Sun className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Light</div>
                    <div className="text-sm text-muted-foreground">
                      Always use light theme
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="dark" id="dark" disabled />
                <Label
                  htmlFor="dark"
                  className="flex-1 flex items-center gap-3 cursor-pointer"
                >
                  <Moon className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Dark</div>
                    <div className="text-sm text-muted-foreground">
                      Always use dark theme
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="system" id="system" disabled />
                <Label
                  htmlFor="system"
                  className="flex-1 flex items-center gap-3 cursor-pointer"
                >
                  <Monitor className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">System</div>
                    <div className="text-sm text-muted-foreground">
                      Match your device theme
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm">
              <span className="font-medium">Current theme: </span>
              <span className="capitalize text-primary font-semibold">
                light
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
