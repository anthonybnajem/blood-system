"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { exportRowsToExcel } from "@/lib/excel-export";
import { ArrowLeft, Loader2, Plus, RefreshCw } from "lucide-react";
import { getYupFieldErrors, labInputSchema, panelSchema } from "@/lib/yup-validation";

type Department = {
  departmentId: string;
  name: string;
};
type Panel = {
  panelId: string;
  departmentId: string;
  name: string;
  ordering: number;
  printIfEmpty: number;
  active: number;
};
type LabTest = {
  testId: string;
  panelId: string;
  displayName: string;
  resultType: "number" | "text" | "select" | "boolean";
  defaultUnit: string | null;
  active: number;
};
type Range = {
  rangeId: string;
  testId: string;
  gender: "Any" | "Male" | "Female";
  rangeText: string | null;
  normalLow: number | null;
  normalHigh: number | null;
  unit: string | null;
};

type InputRow = {
  testId: string;
  panelId: string;
  panelName: string;
  displayName: string;
  resultType: LabTest["resultType"];
  unit: string;
  rangeText: string;
  min: number | null;
  max: number | null;
  active: number;
  rangeId: string | null;
};

async function callCatalogAction(action: string, payload?: Record<string, any>) {
  const response = await fetch("/api/lab/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload: payload || {} }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Request failed");
  return body?.data;
}

function sanitizeExportName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim() || "category";
}

export default function CategoryInputsPage() {
  const { toast } = useToast();
  const params = useParams<{ categoryId: string }>();
  const categoryId = params?.categoryId || "";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [ranges, setRanges] = useState<Range[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");

  const [inputDialog, setInputDialog] = useState({
    open: false,
    mode: "create" as "create" | "edit",
    testId: "",
    rangeId: "",
    panelId: "",
    displayName: "",
    resultType: "number" as LabTest["resultType"],
    defaultUnit: "",
    rangeText: "",
    normalLow: "",
    normalHigh: "",
    active: true,
  });
  const [panelDialog, setPanelDialog] = useState({
    open: false,
    mode: "create" as "create" | "edit",
    panelId: "",
    name: "",
    ordering: 0,
    printIfEmpty: false,
    active: true,
  });
  const [panelErrors, setPanelErrors] = useState<Record<string, string>>({});
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});

  const load = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/lab/catalog", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Failed to load");
      setDepartments(body.data?.departments || []);
      setPanels(body.data?.panels || []);
      setTests(body.data?.tests || []);
      setRanges(body.data?.ranges || []);
    } catch (error: any) {
      toast({
        title: "Load failed",
        description: error?.message || "Could not load category inputs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const category = useMemo(
    () => departments.find((d) => d.departmentId === categoryId) || null,
    [departments, categoryId]
  );

  const categoryPanels = useMemo(
    () => panels.filter((p) => p.departmentId === categoryId),
    [panels, categoryId]
  );

  const rows = useMemo<InputRow[]>(() => {
    const panelIds = new Set(categoryPanels.map((p) => p.panelId));
    return tests
      .filter((t) => panelIds.has(t.panelId))
      .map((test) => {
        const panelName = categoryPanels.find((p) => p.panelId === test.panelId)?.name || "Unknown";
        const range = ranges.find((r) => r.testId === test.testId && r.gender === "Any");
        return {
          testId: test.testId,
          panelId: test.panelId,
          panelName,
          displayName: test.displayName,
          resultType: test.resultType,
          unit: (range?.unit || test.defaultUnit || "").trim(),
          rangeText: range?.rangeText || "",
          min: range?.normalLow ?? null,
          max: range?.normalHigh ?? null,
          active: test.active,
          rangeId: range?.rangeId || null,
        };
      })
      .sort((a, b) => a.panelName.localeCompare(b.panelName) || a.displayName.localeCompare(b.displayName));
  }, [tests, ranges, categoryPanels]);

  const filteredRows = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const status = row.active ? "active" : "hidden";
      return [
        row.panelName,
        row.displayName,
        row.resultType,
        row.unit,
        row.rangeText,
        row.min == null ? "" : String(row.min),
        row.max == null ? "" : String(row.max),
        status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [rows, tableSearch]);

  const handlePanelsExport = () => {
    exportRowsToExcel({
      fileName: `${sanitizeExportName(category?.name || "category")}-panels-${new Date().toISOString().slice(0, 10)}`,
      sheetName: "Panels",
      rows: categoryPanels.map((panel) => ({
        Name: panel.name,
        Order: panel.ordering,
        PrintEmpty: panel.printIfEmpty ? "yes" : "no",
        Status: panel.active ? "active" : "hidden",
        PanelID: panel.panelId,
        DepartmentID: panel.departmentId,
      })),
    });
  };

  const handleInputsExport = () => {
    exportRowsToExcel({
      fileName: `${sanitizeExportName(category?.name || "category")}-inputs-${new Date().toISOString().slice(0, 10)}`,
      sheetName: "Inputs",
      rows: filteredRows.map((row) => ({
        Panel: row.panelName,
        InputName: row.displayName,
        Type: row.resultType,
        Unit: row.unit || "",
        Range: row.rangeText || "",
        Min: row.min ?? "",
        Max: row.max ?? "",
        Status: row.active ? "active" : "hidden",
        TestID: row.testId,
        PanelID: row.panelId,
        RangeID: row.rangeId || "",
      })),
    });
  };

  const openCreate = () => {
    setInputDialog({
      open: true,
      mode: "create",
      testId: "",
      rangeId: "",
      panelId: categoryPanels[0]?.panelId || "",
      displayName: "",
      resultType: "number",
      defaultUnit: "",
      rangeText: "",
      normalLow: "",
      normalHigh: "",
      active: true,
    });
  };

  const openCreatePanel = () => {
    const nextOrdering =
      categoryPanels.reduce((maxValue, panel) => Math.max(maxValue, panel.ordering), 0) + 1;
    setPanelDialog({
      open: true,
      mode: "create",
      panelId: "",
      name: "",
      ordering: nextOrdering,
      printIfEmpty: false,
      active: true,
    });
  };

  const openEditPanel = (panel: Panel) => {
    setPanelDialog({
      open: true,
      mode: "edit",
      panelId: panel.panelId,
      name: panel.name,
      ordering: panel.ordering,
      printIfEmpty: panel.printIfEmpty === 1,
      active: panel.active === 1,
    });
  };

  const openEdit = (row: InputRow) => {
    setInputDialog({
      open: true,
      mode: "edit",
      testId: row.testId,
      rangeId: row.rangeId || "",
      panelId: row.panelId,
      displayName: row.displayName,
      resultType: row.resultType,
      defaultUnit: row.unit,
      rangeText: row.rangeText,
      normalLow: row.min == null ? "" : String(row.min),
      normalHigh: row.max == null ? "" : String(row.max),
      active: row.active === 1,
    });
  };

  const saveInput = async () => {
    const nextFieldErrors = getYupFieldErrors(labInputSchema, {
      panelId: inputDialog.panelId,
      displayName: inputDialog.displayName,
      resultType: inputDialog.resultType,
    });
    setInputErrors(nextFieldErrors);
    const validationErrors = Object.values(nextFieldErrors);
    if (validationErrors.length > 0) {
      toast({
        title: "Required fields missing",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    try {
      setInputErrors({});
      if (inputDialog.mode === "create") {
        const created = await callCatalogAction("create_test", {
          panelId: inputDialog.panelId,
          displayName: inputDialog.displayName,
          defaultUnit: inputDialog.defaultUnit,
        });
        if (inputDialog.rangeText || inputDialog.defaultUnit) {
          await callCatalogAction("create_range", {
            testId: created.testId,
            gender: "Any",
            unit: inputDialog.defaultUnit || null,
            rangeText: inputDialog.rangeText || null,
            normalLow: inputDialog.normalLow.trim() ? Number(inputDialog.normalLow) : null,
            normalHigh: inputDialog.normalHigh.trim() ? Number(inputDialog.normalHigh) : null,
          });
        }
      } else {
        await callCatalogAction("update_test", {
          testId: inputDialog.testId,
          displayName: inputDialog.displayName,
          resultType: inputDialog.resultType,
          defaultUnit: inputDialog.defaultUnit,
          decimalPrecision: 2,
          printOrder: 0,
          active: inputDialog.active,
        });
        if (inputDialog.rangeId) {
          await callCatalogAction("update_range", {
            rangeId: inputDialog.rangeId,
            gender: "Any",
            unit: inputDialog.defaultUnit || null,
            rangeText: inputDialog.rangeText || null,
            normalLow: inputDialog.normalLow.trim() ? Number(inputDialog.normalLow) : null,
            normalHigh: inputDialog.normalHigh.trim() ? Number(inputDialog.normalHigh) : null,
          });
        } else if (inputDialog.rangeText || inputDialog.defaultUnit) {
          await callCatalogAction("create_range", {
            testId: inputDialog.testId,
            gender: "Any",
            unit: inputDialog.defaultUnit || null,
            rangeText: inputDialog.rangeText || null,
            normalLow: inputDialog.normalLow.trim() ? Number(inputDialog.normalLow) : null,
            normalHigh: inputDialog.normalHigh.trim() ? Number(inputDialog.normalHigh) : null,
          });
        }
      }

      setInputDialog((p) => ({ ...p, open: false }));
      await load();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Could not save input",
        variant: "destructive",
      });
    }
  };

  const savePanel = async () => {
    const nextFieldErrors = getYupFieldErrors(panelSchema, {
      name: panelDialog.name,
      ordering: panelDialog.ordering,
    });
    setPanelErrors(nextFieldErrors);
    const validationErrors = Object.values(nextFieldErrors);
    if (validationErrors.length > 0) {
      toast({
        title: "Required fields missing",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    const name = panelDialog.name.trim();

    try {
      setPanelErrors({});
      if (panelDialog.mode === "create") {
        await callCatalogAction("create_panel", {
          departmentId: categoryId,
          name,
        });
        toast({
          title: "Panel created",
          description: `${name} was added to this category.`,
        });
      } else {
        await callCatalogAction("update_panel", {
          panelId: panelDialog.panelId,
          name,
          ordering: panelDialog.ordering,
          printIfEmpty: panelDialog.printIfEmpty,
          active: panelDialog.active,
        });
        toast({
          title: "Panel updated",
          description: `${name} was updated.`,
        });
      }

      setPanelDialog((prev) => ({ ...prev, open: false }));
      await load();
    } catch (error: any) {
      toast({
        title: panelDialog.mode === "create" ? "Create failed" : "Save failed",
        description: error?.message || "Could not save panel",
        variant: "destructive",
      });
    }
  };

  const deletePanel = async (panel: Panel) => {
    try {
      await callCatalogAction("delete_panel", { panelId: panel.panelId });
      toast({
        title: "Panel deleted",
        description: `${panel.name} was removed.`,
      });
      await load();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete panel",
        variant: "destructive",
      });
    }
  };

  const deleteInput = async (testId: string) => {
    try {
      await callCatalogAction("delete_test", { testId });
      await load();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete input",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {category ? `${category.name} Inputs` : "Category Inputs"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create, edit, and delete category input rows.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/lab-config">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Panels</CardTitle>
              <CardDescription>
                Create and manage panels inside this category before adding inputs.
              </CardDescription>
            </div>
            <Button onClick={() => openCreatePanel()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Panel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categoryPanels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No panels yet. Create one to start adding inputs.
            </p>
          ) : (
            <>
              <DataTableToolbar
                showSearch={false}
                searchValue=""
                onSearchChange={() => {}}
                searchPlaceholder="Panels"
                onExport={handlePanelsExport}
                exportDisabled={!categoryPanels.length}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Print Empty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryPanels.map((panel) => (
                    <TableRow key={panel.panelId}>
                      <TableCell className="font-medium">{panel.name}</TableCell>
                      <TableCell>{panel.ordering}</TableCell>
                      <TableCell>{panel.printIfEmpty ? "yes" : "no"}</TableCell>
                      <TableCell>
                        <Badge variant={panel.active ? "default" : "secondary"}>
                          {panel.active ? "active" : "hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditPanel(panel)}>
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete panel?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This removes the panel and all its inputs if no saved report data depends on them.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void deletePanel(panel)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Inputs Table</CardTitle>
              <CardDescription>
                Name, type, unit, range and min/max for this category.
              </CardDescription>
            </div>
            <Button onClick={() => openCreate()} disabled={categoryPanels.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Input
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categoryPanels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No panels found for this category.
            </p>
          ) : (
            <>
              <DataTableToolbar
                searchValue={tableSearch}
                onSearchChange={setTableSearch}
                searchPlaceholder="Search inputs..."
                onExport={handleInputsExport}
                exportDisabled={!filteredRows.length}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Panel</TableHead>
                    <TableHead>Input Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Min</TableHead>
                    <TableHead>Max</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No inputs match your search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {filteredRows.map((row) => (
                    <TableRow key={row.testId}>
                      <TableCell>{row.panelName}</TableCell>
                      <TableCell className="font-medium">{row.displayName}</TableCell>
                      <TableCell>{row.resultType}</TableCell>
                      <TableCell>{row.unit || "-"}</TableCell>
                      <TableCell>{row.rangeText || "-"}</TableCell>
                      <TableCell>{row.min ?? "-"}</TableCell>
                      <TableCell>{row.max ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={row.active ? "default" : "secondary"}>
                          {row.active ? "active" : "hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete input?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action deletes the input and linked range.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void deleteInput(row.testId)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={panelDialog.open}
        onOpenChange={(open) => setPanelDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{panelDialog.mode === "create" ? "Create Panel" : "Edit Panel"}</DialogTitle>
            <DialogDescription>
              Configure the panel name, order, and visibility for this category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Panel Name</Label>
              <Input
                value={panelDialog.name}
                onChange={(e) => setPanelDialog((prev) => ({ ...prev, name: e.target.value }))}
                className={panelErrors.name ? "border-destructive" : undefined}
              />
              {panelErrors.name ? (
                <p className="text-sm text-destructive">{panelErrors.name}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                value={panelDialog.ordering}
                onChange={(e) =>
                  setPanelDialog((prev) => ({
                    ...prev,
                    ordering: Number(e.target.value || 0),
                  }))
                }
                className={panelErrors.ordering ? "border-destructive" : undefined}
              />
              {panelErrors.ordering ? (
                <p className="text-sm text-destructive">{panelErrors.ordering}</p>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={panelDialog.printIfEmpty}
                onChange={(e) =>
                  setPanelDialog((prev) => ({ ...prev, printIfEmpty: e.target.checked }))
                }
              />
              Print even when empty
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={panelDialog.active}
                onChange={(e) =>
                  setPanelDialog((prev) => ({ ...prev, active: e.target.checked }))
                }
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanelDialog((prev) => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button onClick={() => void savePanel()}>Save Panel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inputDialog.open}
        onOpenChange={(open) => setInputDialog((p) => ({ ...p, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inputDialog.mode === "create" ? "Create Input" : "Edit Input"}</DialogTitle>
            <DialogDescription>
              Configure input name, type, unit, and range.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Panel</Label>
              <select
                value={inputDialog.panelId}
                onChange={(e) => setInputDialog((p) => ({ ...p, panelId: e.target.value }))}
                className={`h-10 w-full rounded-md border bg-slate-50/90 px-3 text-sm shadow-sm dark:bg-slate-900/40 ${
                  inputErrors.panelId
                    ? "border-destructive"
                    : "border-slate-300/80 dark:border-slate-700/70"
                }`}
                disabled={inputDialog.mode === "edit"}
              >
                <option value="">Select panel</option>
                {categoryPanels.map((p) => (
                  <option key={p.panelId} value={p.panelId}>
                    {p.name}
                  </option>
                ))}
              </select>
              {inputErrors.panelId ? (
                <p className="text-sm text-destructive">{inputErrors.panelId}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Input Name</Label>
              <Input
                value={inputDialog.displayName}
                onChange={(e) =>
                  setInputDialog((p) => ({ ...p, displayName: e.target.value }))
                }
                className={inputErrors.displayName ? "border-destructive" : undefined}
              />
              {inputErrors.displayName ? (
                <p className="text-sm text-destructive">{inputErrors.displayName}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                value={inputDialog.resultType}
                onChange={(e) =>
                  setInputDialog((p) => ({
                    ...p,
                    resultType: e.target.value as LabTest["resultType"],
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-300/80 bg-slate-50/90 px-3 text-sm shadow-sm dark:border-slate-700/70 dark:bg-slate-900/40"
              >
                <option value="number">number</option>
                <option value="text">text</option>
                <option value="select">select</option>
                <option value="boolean">boolean</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={inputDialog.defaultUnit}
                  onChange={(e) =>
                    setInputDialog((p) => ({ ...p, defaultUnit: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Range Text</Label>
                <Input
                  value={inputDialog.rangeText}
                  onChange={(e) =>
                    setInputDialog((p) => ({ ...p, rangeText: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min</Label>
                <Input
                  type="number"
                  value={inputDialog.normalLow}
                  onChange={(e) =>
                    setInputDialog((p) => ({ ...p, normalLow: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max</Label>
                <Input
                  type="number"
                  value={inputDialog.normalHigh}
                  onChange={(e) =>
                    setInputDialog((p) => ({ ...p, normalHigh: e.target.value }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inputDialog.active}
                onChange={(e) =>
                  setInputDialog((p) => ({ ...p, active: e.target.checked }))
                }
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInputDialog((p) => ({ ...p, open: false }))}>
              Cancel
            </Button>
            <Button onClick={() => void saveInput()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
