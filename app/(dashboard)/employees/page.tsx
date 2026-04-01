"use client";

import { useEffect, useMemo, useState } from "react";
import { employeesApi, type Employee } from "@/lib/db";
import { hashPassword } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { employeeCreateSchema, getYupFieldErrors } from "@/lib/yup-validation";

const DEFAULT_ROLE: Employee["role"] = "staff";

export default function UsersPage() {
  const [users, setUsers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Employee["role"]>(DEFAULT_ROLE);
  const [isActive, setIsActive] = useState(true);
  const [tableSearch, setTableSearch] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) return sortedUsers;
    return sortedUsers.filter((user) => {
      const status = user.isActive ? "active" : "inactive";
      return [user.name, user.email, user.role, status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [sortedUsers, tableSearch]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await employeesApi.getAll();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole(DEFAULT_ROLE);
    setIsActive(true);
  };

  const createUser = async () => {
    const nextFieldErrors = getYupFieldErrors(employeeCreateSchema, {
      name,
      email,
      password,
    });
    setFieldErrors(nextFieldErrors);
    const validationErrors = Object.values(nextFieldErrors);
    if (validationErrors.length > 0) {
      toast({
        title: "Required fields missing",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    const exists = users.some(
      (user) => user.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (exists) {
      toast({
        title: "Email already in use",
        description: "Choose another email address.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      setFieldErrors({});
      const hashed = await hashPassword(password);
      await employeesApi.add({
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        role,
        isActive,
        hireDate: new Date(),
      });

      toast({
        title: "User created",
        description: "The new user was added successfully.",
      });
      resetForm();
      await loadUsers();
    } catch (error) {
      toast({
        title: "Failed to create user",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: Employee) => {
    try {
      await employeesApi.update({ ...user, isActive: !user.isActive });
      await loadUsers();
    } catch {
      toast({
        title: "Update failed",
        description: "Could not update user status.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">
          Manage starter users and roles for your new project.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add User</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className={fieldErrors.name ? "border-destructive" : undefined} />
            {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldErrors.email ? "border-destructive" : undefined}
            />
            {fieldErrors.email ? <p className="text-sm text-destructive">{fieldErrors.email}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldErrors.password ? "border-destructive" : undefined}
            />
            {fieldErrors.password ? <p className="text-sm text-destructive">{fieldErrors.password}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              className="h-10 w-full rounded-xl border border-white/40 bg-white/50 px-3 text-sm backdrop-blur-md dark:border-white/15 dark:bg-white/5"
              value={role}
              onChange={(e) => setRole(e.target.value as Employee["role"])}
            >
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="cashier">cashier</option>
              <option value="staff">staff</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="active">Active user</Label>
          </div>
          <div className="md:col-span-2">
            <p className="mb-3 text-sm text-muted-foreground">
              Login uses the username part before <code>@</code>. Example: <code>admin@lab.local</code> signs in as <code>admin</code>.
            </p>
            <Button onClick={createUser} disabled={saving}>
              {saving ? "Saving..." : "Create User"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search users..."
            className="mb-4 max-w-sm"
          />
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No users match your search.
                    </TableCell>
                  </TableRow>
                ) : null}
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.isActive ? "Active" : "Inactive"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(user)}
                      >
                        {user.isActive ? "Disable" : "Enable"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
