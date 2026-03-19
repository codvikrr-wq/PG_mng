import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const { invoiceId } = await request.json();

    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: "Stripe not configured" }, { status: 503 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    if (!invoiceId) {
      return Response.json({ error: "Invoice ID required" }, { status: 400 });
    }

    // Fetch invoice using authenticated user's session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, status, tenant_id")
      .eq("id", invoiceId)
      .single();

    if (error || !invoice) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return Response.json({ error: "Invoice already paid" }, { status: 400 });
    }

    // Amount in paise (INR smallest unit)
    const amountInPaise = Math.round(Number(invoice.total_amount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      currency: "inr",
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        tenant_id: invoice.tenant_id,
      },
    });

    return Response.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    return Response.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}
