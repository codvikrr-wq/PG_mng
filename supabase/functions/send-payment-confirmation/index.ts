import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@pgmanager.app";

serve(async (req) => {
  try {
    const { payment_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: payment, error } = await supabase
      .from("payments")
      .select(`
        *,
        invoices ( invoice_number, period ),
        tenants ( name, email ),
        organizations ( name )
      `)
      .eq("id", payment_id)
      .single();

    if (error || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404 });
    }

    const tenantEmail = payment.tenants?.email;
    if (!tenantEmail) {
      return new Response(JSON.stringify({ error: "No tenant email" }), { status: 400 });
    }

    const emailBody = {
      from: FROM_EMAIL,
      to: tenantEmail,
      subject: `Payment Received — ₹${Number(payment.amount).toLocaleString("en-IN")}`,
      html: `
        <h2>Payment Confirmation</h2>
        <p>Dear ${payment.tenants?.name},</p>
        <p>We have received your payment. Details below:</p>
        <table style="border-collapse:collapse;width:100%">
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Invoice</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${payment.invoices?.invoice_number ?? "—"}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Period</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${payment.invoices?.period ?? "—"}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Amount Paid</strong></td>
            <td style="padding:8px;border:1px solid #ddd">₹${Number(payment.amount).toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Payment Method</strong></td>
            <td style="padding:8px;border:1px solid #ddd" style="text-transform:capitalize">${(payment.payment_method ?? "—").replace(/_/g, " ")}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Date</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${new Date(payment.payment_date ?? payment.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</td>
          </tr>
          ${payment.reference_number ? `
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Reference</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${payment.reference_number}</td>
          </tr>` : ""}
        </table>
        <p style="margin-top:16px">Thank you,<br/>${payment.organizations?.name}</p>
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
