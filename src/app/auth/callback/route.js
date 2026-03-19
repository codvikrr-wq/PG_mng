import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // After successful sign-in, ensure tenant linking for returning users
      // (the INSERT trigger handles new users; this handles users who already
      // had an auth account but whose tenants.user_id was never set)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const serviceClient = await createServiceClient();
        await serviceClient
          .from("tenants")
          .update({ user_id: user.id })
          .eq("email", user.email)
          .is("user_id", null);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
