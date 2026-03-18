"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tenantLoginSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TenantLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tenantLoginSchema),
  });

  async function onSubmitEmail(data) {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setEmail(data.email);
      setOtpSent(true);
      toast.success("Check your email for the login link");
    } catch (error) {
      toast.error(error.message || "Failed to send login link. Make sure you have an account.");
    } finally {
      setLoading(false);
    }
  }

  if (otpSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">PG Manager</h1>
            <p className="mt-1 text-sm text-muted-foreground">Tenant Portal</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-4">
                <h3 className="text-lg font-semibold mb-2">Check your email</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We sent a magic login link to <strong>{email}</strong>
                </p>
                <Button variant="outline" onClick={() => setOtpSent(false)}>
                  Use a different email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">PG Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tenant Portal</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Tenant Login</CardTitle>
            <CardDescription>
              Enter your email to receive a magic login link
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmitEmail)}>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Login Link
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
