"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LabSystemStatus } from "@/components/lab-system-status";
import { LabSystemTools } from "@/components/lab-system-tools";
import { SqliteBackupRestore } from "@/components/sqlite-backup-restore";
import { DesktopUpdaterCard } from "@/components/desktop-updater-card";
import { DEFAULT_APP_SETTINGS, settingsApi, type AppSettings } from "@/lib/db";
import {
  Database,
  HardDriveDownload,
  FileText,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Upload,
} from "lucide-react";

type ReportSettings = {
  reportHeaderImageUrl: string;
  labName: string;
  labAddress: string;
  labPhone: string;
  labEmail: string;
  reportHeaderText: string;
  reportFooterText: string;
  showLastResult: boolean;
  noRangePlaceholder: string;
  hideEmptyRows: boolean;
  hideEmptyPanels: boolean;
  hideEmptyDepartments: boolean;
};

const DEFAULT_REPORT_FOOTER_TEXT =
  "Tripoli - Rue Maarad - Imm. Mir - Tel: 06 / 445 455 - 03 / 104 999 - Autorisation 677/1 - Email: labazamokaddem@hotmail.com - Results Website: www.labazamokaddem.online";

const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  reportHeaderImageUrl: "/default-logo.png",
  labName: "",
  labAddress: "",
  labPhone: "",
  labEmail: "",
  reportHeaderText: "",
  reportFooterText: DEFAULT_REPORT_FOOTER_TEXT,
  showLastResult: true,
  noRangePlaceholder: "—",
  hideEmptyRows: true,
  hideEmptyPanels: true,
  hideEmptyDepartments: true,
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const headerImageInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [reportSettings, setReportSettings] = useState<ReportSettings>(DEFAULT_REPORT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [stored, reportResponse] = await Promise.all([
          settingsApi.getAppSettings(),
          fetch("/api/lab/catalog", { cache: "no-store" }),
        ]);
        const reportBody = await reportResponse.json().catch(() => ({}));
        if (!reportResponse.ok) {
          throw new Error(reportBody?.error || "Failed to load report settings");
        }
        setSettings(stored);
        setReportSettings({
          ...DEFAULT_REPORT_SETTINGS,
          ...(reportBody?.data?.reportSettings || {}),
          showLastResult: Boolean(reportBody?.data?.reportSettings?.showLastResult ?? true),
          hideEmptyRows: Boolean(reportBody?.data?.reportSettings?.hideEmptyRows ?? true),
          hideEmptyPanels: Boolean(reportBody?.data?.reportSettings?.hideEmptyPanels ?? true),
          hideEmptyDepartments: Boolean(
            reportBody?.data?.reportSettings?.hideEmptyDepartments ?? true
          ),
        });
      } catch (error) {
        console.error("Failed to load app settings:", error);
        toast({
          title: "Settings Error",
          description: "Failed to load app settings. Using defaults.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, [toast]);

  const handleFieldChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const reportResponse = await fetch("/api/lab/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_report_settings",
          payload: reportSettings,
        }),
      });
      const reportBody = await reportResponse.json().catch(() => ({}));
      if (!reportResponse.ok) {
        throw new Error(reportBody?.error || "Could not save report settings");
      }

      await settingsApi.saveAppSettings(settings);
      setTheme(settings.theme);
      toast({
        title: "Settings saved",
        description: "Application settings updated successfully.",
      });
    } catch (error) {
      console.error("Failed to save app settings:", error);
      toast({
        title: "Save failed",
        description: "Could not save application settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setSettings(DEFAULT_APP_SETTINGS);
    setReportSettings(DEFAULT_REPORT_SETTINGS);
    setTheme(DEFAULT_APP_SETTINGS.theme);
    setIsSaving(true);
    try {
      const reportResponse = await fetch("/api/lab/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_report_settings",
          payload: DEFAULT_REPORT_SETTINGS,
        }),
      });
      const reportBody = await reportResponse.json().catch(() => ({}));
      if (!reportResponse.ok) {
        throw new Error(reportBody?.error || "Could not reset report settings");
      }

      await settingsApi.saveAppSettings(DEFAULT_APP_SETTINGS);
      toast({
        title: "Settings reset",
        description: "Application settings restored to defaults.",
      });
    } catch (error) {
      console.error("Failed to reset app settings:", error);
      toast({
        title: "Reset failed",
        description: "Could not reset application settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReportFieldChange = <K extends keyof ReportSettings>(
    key: K,
    value: ReportSettings[K]
  ) => {
    setReportSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleHeaderImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please choose an image file.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Choose an image smaller than 5MB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        toast({
          title: "Upload failed",
          description: "Could not read the selected image.",
          variant: "destructive",
        });
        return;
      }

      handleReportFieldChange("reportHeaderImageUrl", result);
      toast({
        title: "Header image selected",
        description: "Save settings to use this image in printed reports.",
      });
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Could not read the selected image.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage lab dashboard preferences and database backups.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            Report Branding
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <HardDriveDownload className="h-4 w-4" />
            Backup & Restore
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Database className="h-4 w-4" />
            Lab Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <DesktopUpdaterCard />

          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading settings...</div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <select
                        id="theme"
                        value={settings.theme ?? theme ?? "system"}
                        onChange={(e) =>
                          handleFieldChange(
                            "theme",
                            e.target.value as "light" | "dark" | "system"
                          )
                        }
                        className="h-10 w-full rounded-xl border border-white/40 bg-white/50 px-3 text-sm backdrop-blur-md dark:border-white/15 dark:bg-white/5"
                      >
                        <option value="system">system</option>
                        <option value="light">light</option>
                        <option value="dark">dark</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Input
                        id="language"
                        value={settings.language}
                        onChange={(e) => handleFieldChange("language", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-format">Date Format</Label>
                      <Input
                        id="date-format"
                        value={settings.dateFormat}
                        onChange={(e) => handleFieldChange("dateFormat", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time-format">Time Format</Label>
                      <Input
                        id="time-format"
                        value={settings.timeFormat}
                        onChange={(e) => handleFieldChange("timeFormat", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void handleSave()} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Settings"}
                    </Button>
                    <Button variant="outline" onClick={() => void handleReset()} disabled={isSaving}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset To Defaults
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lab Information</CardTitle>
              <CardDescription>
                This information is printed in the report header and footer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading settings...</div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="report-header-image-url">Header Image URL</Label>
                      <Input
                        id="report-header-image-url"
                        value={reportSettings.reportHeaderImageUrl}
                        onChange={(e) =>
                          handleReportFieldChange("reportHeaderImageUrl", e.target.value)
                        }
                        placeholder="/default-logo.png"
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => headerImageInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload From Desktop
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            handleReportFieldChange("reportHeaderImageUrl", "/default-logo.png")
                          }
                        >
                          Use Default
                        </Button>
                      </div>
                      <input
                        ref={headerImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleHeaderImageFile}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use a public URL, a file from <code>/public</code>, or upload directly from your desktop.
                      </p>
                      {reportSettings.reportHeaderImageUrl ? (
                        <div className="rounded-md border bg-muted/20 p-3">
                          <img
                            src={reportSettings.reportHeaderImageUrl}
                            alt="Header preview"
                            className="max-h-32 w-auto max-w-full object-contain"
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lab-name">Lab Name</Label>
                      <Input
                        id="lab-name"
                        value={reportSettings.labName}
                        onChange={(e) => handleReportFieldChange("labName", e.target.value)}
                        placeholder="Enter the lab name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lab-phone">Lab Phone</Label>
                      <Input
                        id="lab-phone"
                        value={reportSettings.labPhone}
                        onChange={(e) => handleReportFieldChange("labPhone", e.target.value)}
                        placeholder="Enter the lab phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lab-email">Lab Email</Label>
                      <Input
                        id="lab-email"
                        value={reportSettings.labEmail}
                        onChange={(e) => handleReportFieldChange("labEmail", e.target.value)}
                        placeholder="Enter the lab email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="range-placeholder">Empty Range Placeholder</Label>
                      <Input
                        id="range-placeholder"
                        value={reportSettings.noRangePlaceholder}
                        onChange={(e) =>
                          handleReportFieldChange("noRangePlaceholder", e.target.value)
                        }
                        placeholder="—"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lab-address">Lab Address</Label>
                    <Textarea
                      id="lab-address"
                      value={reportSettings.labAddress}
                      onChange={(e) => handleReportFieldChange("labAddress", e.target.value)}
                      placeholder="Enter the lab address"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="report-header-text">Custom Header Text</Label>
                    <Textarea
                      id="report-header-text"
                      value={reportSettings.reportHeaderText}
                      onChange={(e) =>
                        handleReportFieldChange("reportHeaderText", e.target.value)
                      }
                      placeholder={"Optional header text. New lines are preserved in print.\nExample: LAB - SH 49\nVers. 01"}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="report-footer-text">Custom Footer Text</Label>
                    <Textarea
                      id="report-footer-text"
                      value={reportSettings.reportFooterText}
                      onChange={(e) =>
                        handleReportFieldChange("reportFooterText", e.target.value)
                      }
                      placeholder={"Optional footer text. New lines are preserved in print.\nExample: Tripoli - Rue Maarad ...\nPage footer / authorization / website"}
                      rows={4}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void handleSave()} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Settings"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleReset()}
                      disabled={isSaving}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset To Defaults
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <LabSystemStatus />
          <SqliteBackupRestore />
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <LabSystemTools />
        </TabsContent>
      </Tabs>
    </div>
  );
}
