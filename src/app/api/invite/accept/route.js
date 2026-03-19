import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const { token, userId, firstName, lastName } = await request.json();

    if (!token || !userId || !firstName || !lastName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 1. Fetch invitation (including org and role details)
    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: "Invitation not found or already used" }, { status: 404 });
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase.from("invitations").update({ status: "expired" }).eq("id", invitation.id);
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }

    // 2. Update the user record created by handle_new_user trigger
    const { error: userError } = await supabase
      .from("users")
      .update({
        organization_id: invitation.organization_id,
        first_name: firstName,
        last_name: lastName,
      })
      .eq("id", userId);

    if (userError) throw userError;

    // 3. Assign role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role_id: invitation.role_id,
      organization_id: invitation.organization_id,
      pg_id: invitation.pg_id || null,
    });

    if (roleError) throw roleError;

    // 4. Mark invitation as accepted
    const { error: acceptError } = await supabase
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    if (acceptError) throw acceptError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite accept error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
