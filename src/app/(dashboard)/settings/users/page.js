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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  Loader2,
  Trash2,
  Mail,
  UserPlus,
  XCircle,
  Clock,
  Copy,
  Check,
  Pencil,
  Camera,
} from "lucide-react";
import { format } from "date-fns";
import { useRef } from "react";

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
  const [copiedToken, setCopiedToken] = useState(null);

  // Edit user state
  const [editUser, setEditUser] = useState(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [invitePgId, setInvitePgId] = useState("");

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      const [{ data: memberData }, { data: roleData }, { data: inviteData }] = await Promise.all([
        supabase.from("users").select("id, first_name, last_name, email, status, avatar_url, created_at, user_roles(id, role_id, pg_id, roles(id, name))").eq("organization_id", organization.id).order("created_at", { ascending: true }),
        supabase.from("roles").select("id, name").eq("organization_id", organization.id).order("name"),
        supabase.from("invitations").select("*, roles(name), pgs(name)").eq("organization_id", organization.id).eq("status", "pending").order("created_at", { ascending: false }),
      ]);
      setMembers(memberData || []);
      setRoles(roleData || []);
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

      // Show the invite link so admin can share it
      const inviteUrl = `${window.location.origin}/invite/${token}`;
      navigator.clipboard?.writeText(inviteUrl).catch(() => {});
      toast.success(
        `Invitation created! Link copied to clipboard — share it with ${inviteEmail.trim().toLowerCase()}`
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  function copyInviteLink(token) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
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

  function openEditDialog(member) {
    setEditUser(member);
    setEditFirstName(member.first_name || "");
    setEditLastName(member.last_name || "");
    setEditStatus(member.status || "active");
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ first_name: editFirstName.trim(), last_name: editLastName.trim(), status: editStatus })
        .eq("id", editUser.id);
      if (error) throw error;
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editUser.id
            ? { ...m, first_name: editFirstName.trim(), last_name: editLastName.trim(), status: editStatus }
            : m
        )
      );
      setEditUser(null);
      toast.success("User updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleUserPhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !editUser) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5 MB"); return; }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      // Store under org folder — foldername[1]=org_id=get_user_org_id() → UPDATE policy passes
      const path = `${organization.id}/${editUser.id}.${ext}`;

      // Blast-remove all possible variants before uploading (avoids upsert UPDATE path)
      await supabase.storage.from("avatars").remove(
        ["png", "jpg", "jpeg", "webp"].map((e) => `${organization.id}/${editUser.id}.${e}`)
      );

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error } = await supabase.from("users").update({ avatar_url: avatarUrl }).eq("id", editUser.id);
      if (error) throw error;

      setEditUser((prev) => ({ ...prev, avatar_url: avatarUrl }));
      setMembers((prev) =>
        prev.map((m) => (m.id === editUser.id ? { ...m, avatar_url: avatarUrl } : m))
      );
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
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
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={member.avatar_url} alt={member.first_name} />
                          <AvatarFallback className="text-[10px]">
                            {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.first_name} {member.last_name}</span>
                      </div>
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
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(member)}
                          title="Edit user"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {member.id !== user.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setRemoveUser(member)}
                            title="Remove user"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
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
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invite.token)}
                          title="Copy invite link"
                        >
                          {copiedToken === invite.token ? (
                            <Check className="mr-1 h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="mr-1 h-3 w-3" />
                          )}
                          {copiedToken === invite.token ? "Copied!" : "Copy Link"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevokeInvite(invite)}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Revoke
                        </Button>
                      </div>
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

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Photo */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                <Avatar className="h-20 w-20">
                  <AvatarImage src={editUser?.avatar_url} alt={editUser?.first_name} />
                  <AvatarFallback className="text-xl">
                    {editUser?.first_name?.charAt(0)}{editUser?.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingPhoto
                    ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                    : <Camera className="h-5 w-5 text-white" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Click photo to change · PNG, JPG, WebP · max 5 MB</p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleUserPhotoUpload}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-sm text-muted-foreground px-1">{editUser?.email}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
