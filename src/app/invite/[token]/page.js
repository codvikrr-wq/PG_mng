import { createServiceClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcceptForm } from "./accept-form";

export default async function InvitePage({ params }) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: invitation } = await supabase
    .from("invitations")
    .select("*, organizations(name), roles(name), pgs(name)")
    .eq("token", token)
    .single();

  // Invalid or already used
  if (!invitation || invitation.status === "accepted") {
    return <InviteError title="Invalid Invitation" description="This invitation link is invalid or has already been used." />;
  }

  // Expired
  if (invitation.status === "expired" || new Date(invitation.expires_at) < new Date()) {
    if (invitation.status !== "expired") {
      await supabase.from("invitations").update({ status: "expired" }).eq("id", invitation.id);
    }
    return <InviteError title="Invitation Expired" description="This invitation link has expired. Please ask your admin to send a new one." />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">PG Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {invitation.organizations?.name}
          </p>
        </div>
        <AcceptForm invitation={invitation} token={token} />
      </div>
    </div>
  );
}

function InviteError({ title, description }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">PG Manager</h1>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
