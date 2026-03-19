"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ShieldCheck,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Users,
  Lock,
} from "lucide-react";
import { PERMISSION_MODULES, PERMISSION_ACTIONS } from "@/lib/constants";

const modules = Object.values(PERMISSION_MODULES);
const actions = Object.values(PERMISSION_ACTIONS);

function formatModuleName(mod) {
  return mod.charAt(0).toUpperCase() + mod.slice(1).replace(/_/g, " ");
}

function formatActionName(action) {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

// Convert {"module": ["view","create"]} to {"module:view": true, "module:create": true}
function permissionsToFlat(permissions) {
  const flat = {};
  if (!permissions) return flat;
  Object.entries(permissions).forEach(([mod, acts]) => {
    if (Array.isArray(acts)) {
      acts.forEach((action) => {
        flat[`${mod}:${action}`] = true;
      });
    }
  });
  return flat;
}

// Convert {"module:view": true, "module:create": true} to {"module": ["view","create"]}
function flatToPermissions(flat) {
  const perms = {};
  Object.entries(flat).forEach(([key, value]) => {
    if (value) {
      const [mod, action] = key.split(":");
      if (!perms[mod]) perms[mod] = [];
      perms[mod].push(action);
    }
  });
  return perms;
}

export default function RolesPage() {
  const { organization } = useOrg();
  const supabase = createClient();

  const [roles, setRoles] = useState([]);
  const [userCounts, setUserCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // Create/Edit role dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");

  // Delete
  const [deleteRole, setDeleteRole] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Permissions sheet
  const [permSheetOpen, setPermSheetOpen] = useState(false);
  const [permRole, setPermRole] = useState(null);
  const [permMatrix, setPermMatrix] = useState({});
  const [savingPerms, setSavingPerms] = useState(false);

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      const { data: rolesData } = await supabase
        .from("roles")
        .select("*")
        .eq("organization_id", organization.id)
        .order("is_system", { ascending: false })
        .order("name");

      setRoles(rolesData || []);

      // Get user counts per role
      const { data: userRolesData } = await supabase
        .from("user_roles")
        .select("role_id")
        .in("role_id", (rolesData || []).map((r) => r.id));

      const counts = {};
      (userRolesData || []).forEach((ur) => {
        counts[ur.role_id] = (counts[ur.role_id] || 0) + 1;
      });
      setUserCounts(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Create / Edit Role ---

  function openCreate() {
    setEditing(null);
    setRoleName("");
    setRoleDescription("");
    setDialogOpen(true);
  }

  function openEdit(role) {
    setEditing(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setDialogOpen(true);
  }

  async function handleSaveRole() {
    if (!roleName.trim()) {
      toast.error("Role name is required");
      return;
    }
    setSaving(true);
    try {
      const slug = roleName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (editing) {
        const { data, error } = await supabase
          .from("roles")
          .update({ name: roleName, description: roleDescription, slug })
          .eq("id", editing.id)
          .select()
          .single();
        if (error) throw error;
        setRoles((prev) => prev.map((r) => (r.id === data.id ? data : r)));
        toast.success("Role updated");
      } else {
        const { data, error } = await supabase
          .from("roles")
          .insert({
            organization_id: organization.id,
            name: roleName,
            description: roleDescription,
            slug,
            permissions: {},
            is_system: false,
          })
          .select()
          .single();
        if (error) throw error;
        setRoles((prev) => [...prev, data]);
        toast.success("Role created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  // --- Delete Role ---

  async function handleDelete() {
    if (!deleteRole) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", deleteRole.id);
      if (error) throw error;
      setRoles((prev) => prev.filter((r) => r.id !== deleteRole.id));
      setDeleteRole(null);
      toast.success("Role deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  }

  // --- Permissions Sheet ---

  function openPermissions(role) {
    setPermRole(role);
    setPermMatrix(permissionsToFlat(role.permissions));
    setPermSheetOpen(true);
  }

  function togglePermission(key) {
    setPermMatrix((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleModuleAll(mod) {
    const allChecked = actions.every((a) => permMatrix[`${mod}:${a}`]);
    setPermMatrix((prev) => {
      const next = { ...prev };
      actions.forEach((a) => {
        next[`${mod}:${a}`] = !allChecked;
      });
      return next;
    });
  }

  function toggleActionAll(action) {
    const allChecked = modules.every((m) => permMatrix[`${m}:${action}`]);
    setPermMatrix((prev) => {
      const next = { ...prev };
      modules.forEach((m) => {
        next[`${m}:${action}`] = !allChecked;
      });
      return next;
    });
  }

  async function handleSavePermissions() {
    if (!permRole) return;
    setSavingPerms(true);
    try {
      const permissions = flatToPermissions(permMatrix);
      const { data, error } = await supabase
        .from("roles")
        .update({ permissions })
        .eq("id", permRole.id)
        .select()
        .single();
      if (error) throw error;
      setRoles((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      setPermSheetOpen(false);
      toast.success("Permissions updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingPerms(false);
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Manage roles and control what each role can access"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        }
      />

      {roles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No roles found"
          description="Create your first role to manage team permissions"
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card
              key={role.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openPermissions(role)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    {role.is_system && (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="mr-1 h-3 w-3" />
                        System
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!role.is_system && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(role);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteRole(role);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {role.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {role.description}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>
                    {userCounts[role.id] || 0}{" "}
                    {userCounts[role.id] === 1 ? "user" : "users"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Role" : "Create Role"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Warden"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="What is this role responsible for?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Sheet */}
      <Sheet open={permSheetOpen} onOpenChange={setPermSheetOpen}>
        <SheetContent side="right" className="sm:max-w-2xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Permissions for {permRole?.name}
              {permRole?.is_system && (
                <Badge variant="secondary" className="text-xs">
                  System Role
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Module</TableHead>
                    {actions.map((action) => (
                      <TableHead key={action} className="text-center w-[80px]">
                        <button
                          type="button"
                          className="text-xs font-medium hover:text-primary transition-colors"
                          onClick={() => toggleActionAll(action)}
                        >
                          {formatActionName(action)}
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((mod) => (
                    <TableRow key={mod}>
                      <TableCell>
                        <button
                          type="button"
                          className="text-sm font-medium hover:text-primary transition-colors"
                          onClick={() => toggleModuleAll(mod)}
                        >
                          {formatModuleName(mod)}
                        </button>
                      </TableCell>
                      {actions.map((action) => {
                        const key = `${mod}:${action}`;
                        return (
                          <TableCell key={key} className="text-center">
                            <Checkbox
                              checked={!!permMatrix[key]}
                              onCheckedChange={() => togglePermission(key)}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setPermSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={savingPerms}>
              {savingPerms && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Permissions
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteRole}
        onOpenChange={() => setDeleteRole(null)}
        title="Delete Role"
        description={`Are you sure you want to delete the "${deleteRole?.name}" role? Users assigned to this role will lose their permissions.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
