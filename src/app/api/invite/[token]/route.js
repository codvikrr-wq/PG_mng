import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request, { params }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Invalid invitation link" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data: invitation, error } = await supabase
      .from("invitations")
      .select("email, status, expires_at, organizations(name), roles(name)")
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status === "accepted") {
      return NextResponse.json(
        { error: "This invitation has already been used. Please log in." },
        { status: 410 }
      );
    }

    if (invitation.status === "expired" || new Date(invitation.expires_at) < new Date()) {
      if (invitation.status !== "expired") {
        await supabase.from("invitations").update({ status: "expired" }).eq("token", token);
      }
      return NextResponse.json(
        { error: "This invitation has expired. Please ask your admin to send a new one." },
        { status: 410 }
      );
    }

    return NextResponse.json({
      email: invitation.email,
      orgName: invitation.organizations?.name || "Your Organization",
      roleName: invitation.roles?.name || "Staff Member",
    });
  } catch (error) {
    console.error("Invite fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
