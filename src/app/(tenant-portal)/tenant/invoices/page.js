"use client";

import { useEffect, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/user-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { FileText, IndianRupee, Calendar, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  paid: { label: "Paid", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  partial: { label: "Partial", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
};

export default function TenantInvoicesPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [tenant, setTenant] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paying, setPaying] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, pg_id")
        .eq("user_id", user.id)
        .single();

      if (!tenantData) return;
      setTenant(tenantData);

      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .order("created_at", { ascending: false });

      setInvoices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handlePayNow(invoice) {
    if (!stripePromise) {
      toast.error("Online payment not configured");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const { clientSecret, error } = await res.json();
      if (error) {
        toast.error(error);
        return;
      }
      const stripe = await stripePromise;
      const { error: stripeError } = await stripe.redirectToCheckout
        ? { error: null }
        : await stripe.confirmPayment({
            clientSecret,
            confirmParams: {
              return_url: `${window.location.origin}/tenant/invoices?paid=1`,
            },
          });
      if (stripeError) toast.error(stripeError.message);
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  async function openDetail(invoice) {
    setSelected(invoice);
    setDetailOpen(true);
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: false });
    setPayments(data || []);
  }

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card
              key={inv.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => openDetail(inv)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{inv.invoice_number}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusConfig[inv.status]?.color}`}>
                        {statusConfig[inv.status]?.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {inv.period_start
                        ? `${format(new Date(inv.period_start), "MMM d")} – ${format(new Date(inv.period_end || inv.period_start), "MMM d, yyyy")}`
                        : inv.notes || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-semibold">
                      <IndianRupee className="h-4 w-4" />
                      {Number(inv.total_amount).toLocaleString("en-IN")}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {inv.due_date
                        ? format(new Date(inv.due_date), "MMM d, yyyy")
                        : "No due date"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Invoice {selected.invoice_number}</SheetTitle>
                <SheetDescription>
                  {selected.period_start
                    ? `${format(new Date(selected.period_start), "MMM d")} – ${format(new Date(selected.period_end || selected.period_start), "MMM d, yyyy")}`
                    : "Invoice details"}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Status and amount */}
                <div className="flex items-center justify-between">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${statusConfig[selected.status]?.color}`}>
                    {statusConfig[selected.status]?.label}
                  </span>
                  <div className="flex items-center gap-1 text-lg font-bold">
                    <IndianRupee className="h-4 w-4" />
                    {Number(selected.total_amount).toLocaleString("en-IN")}
                  </div>
                </div>

                {selected.due_date && (
                  <p className="text-sm text-muted-foreground">
                    Due: {format(new Date(selected.due_date), "MMM d, yyyy")}
                  </p>
                )}

                {/* Pay Now button for unpaid invoices */}
                {["sent", "partial", "overdue"].includes(selected.status) && (
                  <Button
                    className="w-full"
                    onClick={() => handlePayNow(selected)}
                    disabled={paying || !stripePromise}
                  >
                    {paying ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</>
                    ) : (
                      <><CreditCard className="mr-2 h-4 w-4" />Pay Now</>
                    )}
                  </Button>
                )}

                {/* Line Items */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Line Items</h4>
                  {selected.line_items && Array.isArray(selected.line_items) ? (
                    <div className="space-y-2">
                      {selected.line_items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md bg-muted p-3">
                          <span className="text-sm">{item.description}</span>
                          <span className="text-sm font-medium">
                            {Number(item.amount).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No line items</p>
                  )}
                </div>

                <Separator />

                {/* Payment History */}
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Payment History ({payments.length})
                  </h4>
                  {payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-md bg-muted p-3">
                          <div>
                            <span className="text-sm font-medium capitalize">
                              {p.method?.replace(/_/g, " ") || "Payment"}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(p.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <span className="text-sm font-medium">
                            {Number(p.amount).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
