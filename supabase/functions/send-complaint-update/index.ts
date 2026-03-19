import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@pgmanager.app";
const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://pgmanager.app";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

serve(async (req) => {
  try {
    const { complaint_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: complaint, error } = await supabase
      .from("complaints")
      .select(`
        id, title, status, description,
        tenants ( name, email ),
        organizations ( name )
      `)
      .eq("id", complaint_id)
      .single();

    if (error || !complaint) {
      return new Response(JSON.stringify({ error: "Complaint not found" }), { status: 404 });
    }

    const tenantEmail = complaint.tenants?.email;
    if (!tenantEmail) {
      return new Response(JSON.stringify({ error: "No tenant email" }), { status: 400 });
    }

    const statusLabel = STATUS_LABELS[complaint.status] ?? complaint.status;

    const emailBody = {
      from: FROM_EMAIL,
      to: tenantEmail,
      subject: `Complaint Update: "${complaint.title}" is now ${statusLabel}`,
      html: `
        <h2>Complaint Status Update</h2>
        <p>Dear ${complaint.tenants?.name},</p>
        <p>Your complaint has been updated:</p>
        <table style="border-collapse:collapse;width:100%">
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Complaint</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${complaint.title}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>New Status</strong></td>
            <td style="padding:8px;border:1px solid #ddd"><strong>${statusLabel}</strong></td>
          </tr>
        </table>
        <p style="margin-top:16px">
          <a href="${APP_URL}/tenant/complaints" style="background:#007BFF;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">
            View Complaint
          </a>
        </p>
        <p style="margin-top:16px">Regards,<br/>${complaint.organizations?.name}</p>
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
