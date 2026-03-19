"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Building2, Shield } from "lucide-react";

export function AcceptForm({ invitation, token }) {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAccept(e) {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up with Supabase Auth (triggers handle_new_user → creates users row)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Sign up failed. Please try again.");

      // 2. Call API route to complete onboarding (service role operations)
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          userId: authData.user.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to accept invitation");

      toast.success("Welcome! Redirecting to dashboard...");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accept Invitation</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join{" "}
          <strong>{invitation.organizations?.name}</strong>
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <Badge variant="secondary">{invitation.roles?.name}</Badge>
          </div>
          {invitation.pgs && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>{invitation.pgs.name}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <form onSubmit={handleAccept}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={invitation.email} disabled className="bg-muted" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Setting up your account..." : "Accept & Join"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
