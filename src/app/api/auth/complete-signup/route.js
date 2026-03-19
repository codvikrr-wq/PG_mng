import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/complete-signup
 *
 * Called immediately after supabase.auth.signUp() from the signup page.
 * Uses the service role client (bypasses RLS) so it works regardless of
 * whether email confirmation is enabled or not.
 *
 * Body: { userId, firstName, lastName, orgName, timezone }
 */
export async function POST(request) {
  try {
    const { userId, firstName, lastName, orgName, timezone } =
      await request.json();

    if (!userId || !orgName) {
      return Response.json(
        { error: "userId and orgName are required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // 1. Verify the auth user actually exists (prevent misuse)
    const { data: authUser, error: authUserError } =
      await supabase.auth.admin.getUserById(userId);
    if (authUserError || !authUser?.user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Check if user already has an org (idempotency — don't double-create)
    const { data: existingUser } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", userId)
      .single();

    if (existingUser?.organization_id) {
      return Response.json({ success: true, alreadySetup: true });
    }

    // 3. Create the organization
    const slug = orgName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        slug,
        timezone: timezone || "Asia/Kolkata",
        currency: "INR",
      })
      .select()
      .single();

    if (orgError) {
      return Response.json({ error: orgError.message }, { status: 500 });
    }

    // 4. Update the users record (created by handle_new_user trigger)
    //    with org_id and names
    const { error: userError } = await supabase
      .from("users")
      .update({
        organization_id: org.id,
        first_name: firstName || "",
        last_name: lastName || "",
      })
      .eq("id", userId);

    if (userError) {
      return Response.json({ error: userError.message }, { status: 500 });
    }

    // 5. Assign Org Admin role (roles were auto-created by on_org_created trigger)
    const { data: adminRole } = await supabase
      .from("roles")
      .select("id")
      .eq("organization_id", org.id)
      .eq("name", "Org Admin")
      .single();

    if (adminRole) {
      await supabase.from("user_roles").insert({
        user_id: userId,
        role_id: adminRole.id,
        organization_id: org.id,
      });
    }

    return Response.json({ success: true, orgId: org.id });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
