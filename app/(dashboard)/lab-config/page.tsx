"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { exportRowsToExcel } from "@/lib/excel-export";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { categoryCreateSchema, categoryEditSchema, getYupFieldErrors } from "@/lib/yup-validation";

type Department = {
  departmentId: string;
  name: string;
  ordering: number;
  active: number;
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

export default function LabConfigPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isImportingZgharta, setIsImportingZgharta] = useState(false);
  const [createCategoryErrors, setCreateCategoryErrors] = useState<Record<string, string>>({});
  const [editCategoryErrors, setEditCategoryErrors] = useState<Record<string, string>>({});
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editDialog, setEditDialog] = useState({
    open: false,
    departmentId: "",
    name: "",
    ordering: 0,
    active: true,
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/lab/catalog", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Failed to load categories");
      setCategories((body?.data?.departments || []) as Department[]);
    } catch (error: any) {
      toast({
        title: "Load failed",
        description: error?.message || "Could not load categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredCategories = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    return categories.filter((category) => {
      const status = category.active ? "active" : "hidden";
      if (statusFilter && status !== statusFilter) return false;
      if (!query) return true;
      return [category.name, String(category.ordering), status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [categories, statusFilter, tableSearch]);

  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((left, right) => {
      let comparison = 0;
      if (sortBy === "order") {
        comparison = left.ordering - right.ordering;
      } else if (sortBy === "status") {
        const leftStatus = left.active ? "active" : "hidden";
        const rightStatus = right.active ? "active" : "hidden";
        comparison = leftStatus.localeCompare(rightStatus);
      } else {
        comparison = left.name.localeCompare(right.name);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredCategories, sortBy, sortOrder]);

  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedCategories.slice(start, start + pageSize);
  }, [sortedCategories, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [tableSearch, statusFilter, sortBy, sortOrder]);

  const handleExport = () => {
    exportRowsToExcel({
      fileName: `lab-config-categories-${new Date().toISOString().slice(0, 10)}`,
      sheetName: "Categories",
      rows: filteredCategories.map((category) => ({
        Name: category.name,
        Order: category.ordering,
        Status: category.active ? "active" : "hidden",
        DepartmentID: category.departmentId,
      })),
    });
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    const nextFieldErrors = getYupFieldErrors(categoryCreateSchema, { name });
    setCreateCategoryErrors(nextFieldErrors);
    const validationErrors = Object.values(nextFieldErrors);
    if (validationErrors.length > 0) {
      toast({
        title: "Required fields missing",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }
    setIsCreating(true);
    try {
      setCreateCategoryErrors({});
      await callCatalogAction("create_department", { name });
      setNewCategoryName("");
      await load();
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error?.message || "Could not create category",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const importCatalogExample = async () => {
    setIsImportingZgharta(true);
    try {
      const result = await callCatalogAction("import_from_zgharta_form2");
      await load();
      const imported = result?.imported || {};
      toast({
        title: "Lab config imported",
        description: [
          imported.departments != null ? `${imported.departments} departments` : null,
          imported.panels != null ? `${imported.panels} panels` : null,
          imported.tests != null ? `${imported.tests} tests` : null,
          imported.ranges != null ? `${imported.ranges} ranges` : null,
        ]
          .filter(Boolean)
          .join(", "),
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error?.message || "Could not import lab config example.",
        variant: "destructive",
      });
    } finally {
      setIsImportingZgharta(false);
    }
  };

  const saveCategory = async () => {
    const nextFieldErrors = getYupFieldErrors(categoryEditSchema, {
      departmentId: editDialog.departmentId,
      name: editDialog.name,
      ordering: editDialog.ordering,
    });
    setEditCategoryErrors(nextFieldErrors);
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
      setEditCategoryErrors({});
      await callCatalogAction("update_department", {
        departmentId: editDialog.departmentId,
        name: editDialog.name,
        ordering: editDialog.ordering,
        active: editDialog.active,
      });
      setEditDialog((p) => ({ ...p, open: false }));
      await load();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Could not save category",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (departmentId: string) => {
    try {
      await callCatalogAction("delete_department", { departmentId });
      await load();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete category",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lab Config</h1>
          <p className="mt-1 text-muted-foreground">
            Categories list. Click a category to manage its inputs.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seed Lab Config From Example Files</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Import departments, panels, tests, and ranges from the bundled workbook examples in
              `docs/`.
            </p>
            <p className="text-xs text-muted-foreground">
              The bundled source is `Zgharta Form 2.xls`. It seeds `Hematology`, `Biochimie`,
              `Endocrine`, `Urine`, `Stool`, `Culture`, and `Culture+ATB` with their panels and
              input rows.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void importCatalogExample()}
            disabled={isImportingZgharta}
          >
            {isImportingZgharta ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Seed Lab Config From Example
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Category</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-md space-y-2">
            <Label>Category Name</Label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Hematology"
              className={createCategoryErrors.name ? "border-destructive" : undefined}
            />
            {createCategoryErrors.name ? (
              <p className="text-sm text-destructive">{createCategoryErrors.name}</p>
            ) : null}
          </div>
          <Button onClick={() => void createCategory()} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Category
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTableToolbar
            searchValue={tableSearch}
            onSearchChange={setTableSearch}
            searchPlaceholder="Search categories..."
            onExport={handleExport}
            exportDisabled={!sortedCategories.length}
          >
            <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
            </NativeSelect>
            <NativeSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Sort by name</option>
              <option value="order">Sort by order</option>
              <option value="status">Sort by status</option>
            </NativeSelect>
            <NativeSelect value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="asc">A-Z first</option>
              <option value="desc">Z-A first</option>
            </NativeSelect>
          </DataTableToolbar>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No categories match your search.
                  </TableCell>
                </TableRow>
              ) : null}
              {paginatedCategories.map((c) => (
                <TableRow key={c.departmentId}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.ordering}</TableCell>
                  <TableCell>
                    <Badge variant={c.active ? "default" : "secondary"}>
                      {c.active ? "active" : "hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="default">
                        <Link href={`/lab-config/${c.departmentId}`}>Open</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditDialog({
                            open: true,
                            departmentId: c.departmentId,
                            name: c.name,
                            ordering: c.ordering,
                            active: c.active === 1,
                          })
                        }
                      >
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
                            <AlertDialogTitle>Delete category?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the category and related inputs.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void deleteCategory(c.departmentId)}>
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
          <DataPagination
            page={page}
            pageSize={pageSize}
            totalItems={sortedCategories.length}
            pageSizeOptions={[5, 10, 20, 50]}
            itemLabel="categories"
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog((p) => ({ ...p, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editDialog.name}
                onChange={(e) => setEditDialog((p) => ({ ...p, name: e.target.value }))}
                className={editCategoryErrors.name ? "border-destructive" : undefined}
              />
              {editCategoryErrors.name ? (
                <p className="text-sm text-destructive">{editCategoryErrors.name}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                value={editDialog.ordering}
                onChange={(e) =>
                  setEditDialog((p) => ({ ...p, ordering: Number(e.target.value || 0) }))
                }
                className={editCategoryErrors.ordering ? "border-destructive" : undefined}
              />
              {editCategoryErrors.ordering ? (
                <p className="text-sm text-destructive">{editCategoryErrors.ordering}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-active"
                checked={editDialog.active}
                onCheckedChange={(checked) => setEditDialog((p) => ({ ...p, active: checked === true }))}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog((p) => ({ ...p, open: false }))}>
              Cancel
            </Button>
            <Button onClick={() => void saveCategory()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
