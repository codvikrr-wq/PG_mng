"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Loader2, Camera, Lock } from "lucide-react";

export default function TenantProfilePage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Editable fields
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!tenantData) return;
      setTenant(tenantData);
      setPhone(tenantData.phone || "");
      const ec = tenantData.emergency_contact || {};
      setEmergencyName(ec.name || "");
      setEmergencyPhone(ec.phone || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          phone,
          emergency_contact: { name: emergencyName, phone: emergencyPhone },
        })
        .eq("id", tenant.id);

      if (error) throw error;
      setTenant((prev) => ({
        ...prev,
        phone,
        emergency_contact: { name: emergencyName, phone: emergencyPhone },
      }));
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      // Store in user's own folder so UPDATE policy (auth.uid() = foldername[1]) passes
      const path = `${user.id}/photo.${ext}`;

      // Blast-remove old variants before uploading so we always INSERT
      await supabase.storage.from("avatars").remove(
        ["png", "jpg", "jpeg", "webp"].map((e) => `${user.id}/photo.${e}`)
      );

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("tenants")
        .update({ profile_photo_url: avatarUrl })
        .eq("id", tenant.id);

      if (updateError) throw updateError;

      setTenant((prev) => ({ ...prev, profile_photo_url: avatarUrl }));
      toast.success("Avatar updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const initials =
    (tenant?.first_name?.[0] || "") + (tenant?.last_name?.[0] || "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your personal info</p>
      </div>

      {/* Avatar and basic info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={tenant?.profile_photo_url} />
                <AvatarFallback className="text-lg">
                  {initials || <User className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                {uploadingAvatar ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {tenant?.first_name} {tenant?.last_name}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Read-only fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">ID Proof</Label>
              <p className="text-sm font-medium mt-1">
                {tenant?.id_proof_type
                  ? `${tenant.id_proof_type}: ${tenant.id_proof_number || "—"}`
                  : "Not provided"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Status</Label>
              <p className="text-sm font-medium capitalize mt-1">
                {tenant?.status || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Emergency Contact Name</Label>
              <Input
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact Phone</Label>
              <Input
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="Phone"
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleChangePassword}
            disabled={changingPassword}
          >
            {changingPassword && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
