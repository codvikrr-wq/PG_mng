"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Building2,
  MapPin,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

const STEPS = [
  { title: "Organization", description: "Confirm your org details" },
  { title: "First PG", description: "Add your first property" },
  { title: "Invite Team", description: "Optional — invite members" },
  { title: "Done", description: "You're all set!" },
];

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD"];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Org data
  const [orgName, setOrgName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");

  // PG data
  const [pgName, setPgName] = useState("");
  const [pgAddress, setPgAddress] = useState("");
  const [pgCapacity, setPgCapacity] = useState("");

  // Invite data
  const [inviteEmails, setInviteEmails] = useState("");

  async function handleOrgUpdate() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        await supabase
          .from("organizations")
          .update({
            name: orgName || undefined,
            timezone,
            currency,
          })
          .eq("id", profile.organization_id);
      }

      setStep(1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePG() {
    if (!pgName.trim()) {
      toast.error("PG name is required");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.from("pgs").insert({
        organization_id: profile.organization_id,
        name: pgName,
        address: { full: pgAddress },
        capacity: parseInt(pgCapacity) || 0,
        manager_user_id: user.id,
      });

      if (error) throw error;
      setStep(2);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    setLoading(true);
    try {
      const emails = inviteEmails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      if (emails.length === 0) {
        setStep(3);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      // Get PG Manager role
      const { data: role } = await supabase
        .from("roles")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .eq("name", "PG Manager")
        .single();

      for (const email of emails) {
        const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await supabase.from("invitations").insert({
          organization_id: profile.organization_id,
          email,
          role_id: role.id,
          invited_by: user.id,
          token,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        });
      }

      toast.success(`Invited ${emails.length} team member(s)`);
      setStep(3);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      await supabase
        .from("organizations")
        .update({ onboarding_completed: true })
        .eq("id", profile.organization_id);

      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    i <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-8 sm:w-16 ${
                      i < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {STEPS[step].title} — {STEPS[step].description}
          </p>
        </div>

        {/* Step 0: Org */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Confirm your organization name and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="My PG Company"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleOrgUpdate} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 1: First PG */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Create Your First PG
              </CardTitle>
              <CardDescription>
                Add the first property to your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pgName">PG Name</Label>
                <Input
                  id="pgName"
                  value={pgName}
                  onChange={(e) => setPgName(e.target.value)}
                  placeholder="Sunrise PG"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pgAddress">Address</Label>
                <Textarea
                  id="pgAddress"
                  value={pgAddress}
                  onChange={(e) => setPgAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pgCapacity">Total Bed Capacity</Label>
                <Input
                  id="pgCapacity"
                  type="number"
                  value={pgCapacity}
                  onChange={(e) => setPgCapacity(e.target.value)}
                  placeholder="50"
                />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleCreatePG} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Invite Team */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Invite Team Members
              </CardTitle>
              <CardDescription>
                Optional — invite your PG managers and staff. You can do this
                later from Settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="emails">
                  Email addresses (comma-separated)
                </Label>
                <Textarea
                  id="emails"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="manager@example.com, staff@example.com"
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Skip
                </Button>
                <Button onClick={handleInvite} disabled={loading}>
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Invite & Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-green-100 p-4 dark:bg-green-900/30">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Your organization and first PG have been created. Head to your
                  dashboard to start adding rooms and tenants.
                </p>
                <Button size="lg" onClick={handleFinish} disabled={loading}>
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
