import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return Response.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const { invoice_id, tenant_id } = paymentIntent.metadata;

    if (!invoice_id) {
      return Response.json({ received: true });
    }

    const supabase = await createServiceClient();

    // Fetch current invoice
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, total_amount, status, organization_id")
      .eq("id", invoice_id)
      .single();

    if (!invoice) {
      return Response.json({ received: true });
    }

    const amountPaid = paymentIntent.amount / 100;

    // Record payment
    await supabase.from("payments").insert({
      invoice_id,
      tenant_id,
      organization_id: invoice.organization_id,
      amount: amountPaid,
      payment_method: "online",
      payment_date: new Date().toISOString(),
      reference_number: paymentIntent.id,
      notes: `Stripe payment ${paymentIntent.id}`,
    });

    // Update invoice status
    const newStatus =
      amountPaid >= Number(invoice.total_amount) ? "paid" : "partial";

    await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoice_id);
  }

  return Response.json({ received: true });
}
