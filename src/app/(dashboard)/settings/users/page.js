"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { useUser } from "@/context/user-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Users,
  Plus,
  Loader2,
  Trash2,
  Mail,
  UserPlus,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

const ROLE_COLORS = {
  "Org Admin": "default",
  "PG Manager": "secondary",
  Frontdesk: "outline",
  Finance: "outline",
  Housekeeping: "outline",
  Tenant: "outline",
  Support: "outline",
};

export default function UsersPage() {
  const { organization, pgs } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [removeUser, setRemoveUser] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [revokeInvite, setRevokeInvite] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [invitePgId, setInvitePgId] = useState("");

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      // Load members with their roles
      const { data: memberData } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, email, status, created_at, user_roles(id, role_id, pg_id, roles(id, name))"
        )
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: true });

      setMembers(memberData || []);

      // Load roles for this org
      const { data: roleData } = await supabase
        .from("roles")
        .select("id, name")
        .eq("organization_id", organization.id)
        .order("name");

      setRoles(roleData || []);

      // Load pending invitations
      const { data: inviteData } = await supabase
        .from("invitations")
        .select("*, roles(name), pgs(name)")
        .eq("organization_id", organization.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setInvitations(inviteData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openInviteDialog() {
    setInviteEmail("");
    setInviteRoleId("");
    setInvitePgId("");
    setDialogOpen(true);
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!inviteRoleId) {
      toast.error("Please select a role");
      return;
    }
    setCreating(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const payload = {
        organization_id: organization.id,
        email: inviteEmail.trim().toLowerCase(),
        role_id: inviteRoleId,
        pg_id: invitePgId || null,
        invited_by: user.id,
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      };

      const { data, error } = await supabase
        .from("invitations")
        .insert(payload)
        .select("*, roles(name), pgs(name)")
        .single();

      if (error) throw error;

      setInvitations((prev) => [data, ...prev]);
      setDialogOpen(false);
      toast.success("Invitation sent");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleChangeRole(member, newRoleId) {
    setUpdatingRole(member.id);
    try {
      const existingUserRole = member.user_roles?.[0];

      if (existingUserRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role_id: newRoleId })
          .eq("id", existingUserRole.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({
          user_id: member.id,
          role_id: newRoleId,
          organization_id: organization.id,
        });
        if (error) throw error;
      }

      // Refresh data to get updated role info
      const { data: updatedUser } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, email, status, created_at, user_roles(id, role_id, pg_id, roles(id, name))"
        )
        .eq("id", member.id)
        .single();

      if (updatedUser) {
        setMembers((prev) =>
          prev.map((m) => (m.id === updatedUser.id ? updatedUser : m))
        );
      }

      toast.success("Role updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdatingRole(null);
    }
  }

  async function handleRemoveUser() {
    if (!removeUser) return;
    setRemoving(true);
    try {
      // Remove user_roles first, then remove the user from the org
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", removeUser.id)
        .eq(
          "organization_id",
          organization.id
        );
      if (roleError) throw roleError;

      const { error } = await supabase
        .from("users")
        .update({ organization_id: null })
        .eq("id", removeUser.id);
      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== removeUser.id));
      setRemoveUser(null);
      toast.success("User removed from organization");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRemoving(false);
    }
  }

  async function handleRevokeInvite() {
    if (!revokeInvite) return;
    setRevoking(true);
    try {
      const { error } = await supabase
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", revokeInvite.id);
      if (error) throw error;

      setInvitations((prev) =>
        prev.filter((inv) => inv.id !== revokeInvite.id)
      );
      setRevokeInvite(null);
      toast.success("Invitation revoked");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRevoking(false);
    }
  }

  function getRoleName(member) {
    return member.user_roles?.[0]?.roles?.name || "No role";
  }

  function getRoleId(member) {
    return member.user_roles?.[0]?.role_id || "";
  }

  function getRoleBadgeVariant(roleName) {
    return ROLE_COLORS[roleName] || "outline";
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        description="Manage staff and team members for your organization"
        action={
          <Button onClick={openInviteDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Team Member
          </Button>
        }
      />

      {/* Members Table */}
      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite your first team member to get started"
          action={
            <Button onClick={openInviteDialog}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Team Member
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.first_name} {member.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(getRoleName(member))}>
                          {getRoleName(member)}
                        </Badge>
                        {member.id !== user.id && (
                          <Select
                            value={getRoleId(member)}
                            onValueChange={(val) =>
                              handleChangeRole(member, val)
                            }
                            disabled={updatingRole === member.id}
                          >
                            <SelectTrigger className="h-7 w-[140px]">
                              <SelectValue placeholder="Change role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {updatingRole === member.id && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.status === "active" ? "default" : "secondary"
                        }
                      >
                        {member.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(member.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.id !== user.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setRemoveUser(member)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>PG</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invite.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getRoleBadgeVariant(
                          invite.roles?.name || "Unknown"
                        )}
                      >
                        {invite.roles?.name || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invite.pgs?.name || "All PGs"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invite.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invite.expires_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevokeInvite(invite)}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>PG (optional)</Label>
              <Select value={invitePgId} onValueChange={setInvitePgId}>
                <SelectTrigger>
                  <SelectValue placeholder="All PGs (org-wide)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All PGs</SelectItem>
                  {pgs.map((pg) => (
                    <SelectItem key={pg.id} value={pg.id}>
                      {pg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Confirm */}
      <ConfirmDialog
        open={!!removeUser}
        onOpenChange={() => setRemoveUser(null)}
        title="Remove Team Member"
        description={`${removeUser?.first_name} ${removeUser?.last_name} will be removed from the organization. This action cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={handleRemoveUser}
        loading={removing}
      />

      {/* Revoke Invitation Confirm */}
      <ConfirmDialog
        open={!!revokeInvite}
        onOpenChange={() => setRevokeInvite(null)}
        title="Revoke Invitation"
        description={`The invitation to ${revokeInvite?.email} will be revoked.`}
        confirmLabel="Revoke"
        onConfirm={handleRevokeInvite}
        loading={revoking}
      />
    </div>
  );
}
