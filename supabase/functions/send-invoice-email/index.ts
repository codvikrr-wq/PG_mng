import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@pgmanager.app";

serve(async (req) => {
  try {
    const { invoice_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch invoice with tenant and org info
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(`
        *,
        tenants ( name, email ),
        organizations ( name )
      `)
      .eq("id", invoice_id)
      .single();

    if (error || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404 });
    }

    const tenantEmail = invoice.tenants?.email;
    if (!tenantEmail) {
      return new Response(JSON.stringify({ error: "No tenant email" }), { status: 400 });
    }

    const emailBody = {
      from: FROM_EMAIL,
      to: tenantEmail,
      subject: `Invoice ${invoice.invoice_number} from ${invoice.organizations?.name}`,
      html: `
        <h2>Invoice ${invoice.invoice_number}</h2>
        <p>Dear ${invoice.tenants?.name},</p>
        <p>Please find your invoice below:</p>
        <table style="border-collapse:collapse;width:100%">
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Invoice #</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Period</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${invoice.period ?? "—"}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Amount Due</strong></td>
            <td style="padding:8px;border:1px solid #ddd">₹${Number(invoice.total_amount).toLocaleString("en-IN")}</td>
          </tr>
          ${invoice.due_date ? `
          <tr>
            <td style="padding:8px;border:1px solid #ddd"><strong>Due Date</strong></td>
            <td style="padding:8px;border:1px solid #ddd">${new Date(invoice.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</td>
          </tr>` : ""}
        </table>
        <p style="margin-top:16px">Please log in to your tenant portal to view and pay this invoice.</p>
        <p>Thank you,<br/>${invoice.organizations?.name}</p>
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
