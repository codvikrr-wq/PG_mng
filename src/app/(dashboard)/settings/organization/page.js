"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Save, Upload, X } from "lucide-react";

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Chicago", label: "America/Chicago (CST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST)" },
];

const CURRENCIES = [
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AED", label: "AED - UAE Dirham" },
];

export default function OrganizationSettingsPage() {
  const { organization, setOrganization } = useOrg();
  const supabase = createClient();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (organization) {
      setName(organization.name || "");
      setTimezone(organization.timezone || "Asia/Kolkata");
      setCurrency(organization.currency || "INR");
      setAddress(organization.address || "");
      setPhone(organization.phone || "");
      setEmail(organization.email || "");
      setBillingEmail(organization.billing_email || "");
      setLogoUrl(organization.branding?.logo_url || "");
      setLoading(false);
    }
  }, [organization]);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5 MB");
      return;
    }
    if (!file.type.startsWith("image/") && file.type !== "image/svg+xml") {
      toast.error("Please upload an image file (PNG, SVG, WebP)");
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const path = `${organization.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      const branding = { ...(organization.branding || {}), logo_url: cacheBustedUrl };
      const { error } = await supabase
        .from("organizations")
        .update({ branding })
        .eq("id", organization.id);
      if (error) throw error;

      setLogoUrl(cacheBustedUrl);
      setOrganization((prev) => ({ ...prev, branding }));
      toast.success("Logo updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    try {
      // Delete all logo file variants from storage
      await supabase.storage.from("avatars").remove(
        ["png", "jpg", "jpeg", "webp", "svg"].map((e) => `${organization.id}/logo.${e}`)
      );

      const branding = { ...(organization.branding || {}), logo_url: null };
      const { error } = await supabase
        .from("organizations")
        .update({ branding })
        .eq("id", organization.id);
      if (error) throw error;
      setLogoUrl("");
      setOrganization((prev) => ({ ...prev, branding }));
      toast.success("Logo removed");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Organization name is required"); return; }
    setSaving(true);
    try {
      const updates = { name, timezone, currency, address, phone, email, billing_email: billingEmail };
      const { error } = await supabase.from("organizations").update(updates).eq("id", organization.id);
      if (error) throw error;
      setOrganization((prev) => ({ ...prev, ...updates }));
      toast.success("Organization settings saved");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Settings"
        description="Manage your organization details and preferences"
      />

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-6">
            {logoUrl ? (
              <div className="flex items-center justify-center h-14 px-3 rounded-lg border bg-muted/30 min-w-[120px]">
                <img src={logoUrl} alt={name} className="max-h-10 object-contain" />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-2xl font-bold">
                {name?.charAt(0) || "P"}
              </div>
            )}
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Horizontal logo recommended</p>
                <p className="text-xs text-muted-foreground">
                  PNG, SVG or WebP · transparent background · max 2 MB
                </p>
                <p className="text-xs text-muted-foreground">
                  Ideal size: <strong>280 × 72 px</strong> (aspect ratio ~4:1) · icon on the left, company name on the right
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</>
                    : <><Upload className="mr-2 h-4 w-4" />Upload Logo</>
                  }
                </Button>
                {logoUrl && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>
                    <X className="mr-2 h-4 w-4" />Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* SVG logo example — rendered live */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Example: horizontal logo format</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your logo should have an icon on the left and the company name on the right, on a transparent background.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-md border bg-background px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48" width="200" height="48">
                <rect x="0" y="8" width="32" height="32" rx="6" fill="oklch(0.6 0.17 194)" />
                <text x="16" y="29" fontFamily="sans-serif" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">P</text>
                <text x="44" y="31" fontFamily="sans-serif" fontSize="18" fontWeight="600" fill="currentColor">Your PG Name</text>
              </svg>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload an SVG or PNG with a transparent background at <strong>280 × 72 px</strong> (or similar 4:1 ratio).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@yourorg.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Billing Email</Label>
            <Input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="billing@yourorg.com" />
            <p className="text-xs text-muted-foreground">Used for sending invoices and payment receipts</p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
