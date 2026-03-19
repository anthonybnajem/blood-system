"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Loader2, Plus, RefreshCw } from "lucide-react";

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
  const [tableSearch, setTableSearch] = useState("");
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
    if (!query) return categories;
    return categories.filter((category) => {
      const status = category.active ? "active" : "hidden";
      return [category.name, String(category.ordering), status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [categories, tableSearch]);

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
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

  const saveCategory = async () => {
    try {
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
          <CardTitle>Create Category</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-md space-y-2">
            <Label>Category Name</Label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Hematology"
            />
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
          <Input
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search categories..."
            className="mb-4 max-w-sm"
          />
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
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No categories match your search.
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredCategories.map((c) => (
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
              />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                value={editDialog.ordering}
                onChange={(e) =>
                  setEditDialog((p) => ({ ...p, ordering: Number(e.target.value || 0) }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editDialog.active}
                onChange={(e) => setEditDialog((p) => ({ ...p, active: e.target.checked }))}
              />
              Active
            </label>
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
