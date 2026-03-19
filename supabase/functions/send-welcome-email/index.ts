import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@pgmanager.app";
const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://pgmanager.app";

serve(async (req) => {
  try {
    const { tenant_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tenant, error } = await supabase
      .from("tenants")
      .select(`
        id, name, email,
        pgs ( name ),
        organizations ( name )
      `)
      .eq("id", tenant_id)
      .single();

    if (error || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), { status: 404 });
    }

    if (!tenant.email) {
      return new Response(JSON.stringify({ error: "No tenant email" }), { status: 400 });
    }

    const emailBody = {
      from: FROM_EMAIL,
      to: tenant.email,
      subject: `Welcome to ${tenant.pgs?.name ?? "your PG"} — ${tenant.organizations?.name}`,
      html: `
        <h2>Welcome, ${tenant.name}!</h2>
        <p>You have been checked in at <strong>${tenant.pgs?.name ?? "your PG"}</strong>.</p>
        <p>You can access your tenant portal to:</p>
        <ul>
          <li>View and pay your invoices</li>
          <li>Submit complaints or maintenance requests</li>
          <li>Check notices and events</li>
          <li>View your meal plan</li>
        </ul>
        <p>
          <a href="${APP_URL}/tenant-login" style="background:#007BFF;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px">
            Access Tenant Portal
          </a>
        </p>
        <p style="margin-top:16px">Welcome aboard,<br/>${tenant.organizations?.name}</p>
      `,
    };

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set — email not sent:", emailBody);
      return new Response(JSON.stringify({ sent: false, reason: "no_api_key" }));
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailBody),
    });

    const result = await res.json();
    return new Response(JSON.stringify({ sent: true, result }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
