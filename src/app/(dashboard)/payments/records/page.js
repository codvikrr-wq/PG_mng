"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { useUser } from "@/context/user-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { CreditCard, Plus, Loader2, Search, Download } from "lucide-react";
import { format } from "date-fns";

const methodColors = {
  cash: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  online: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  bank_transfer: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  upi: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  cheque: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function PaymentRecordsPage() {
  const { organization, currentPg } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  // Form
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let paymentsQ = supabase
        .from("payments")
        .select("*, tenants(first_name, last_name), invoices(invoice_number)")
        .eq("organization_id", organization.id)
        .order("payment_date", { ascending: false });
      let invoicesQ = supabase
        .from("invoices")
        .select("*, tenants(first_name, last_name)")
        .eq("organization_id", organization.id)
        .in("status", ["sent", "partial", "overdue"])
        .order("due_date");
      if (currentPg) {
        paymentsQ = paymentsQ.eq("pg_id", currentPg.id);
        invoicesQ = invoicesQ.eq("pg_id", currentPg.id);
      }
      const [{ data }, { data: invData }] = await Promise.all([paymentsQ, invoicesQ]);
      setPayments(data || []);
      setInvoices(invData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization, currentPg]);

  useEffect(() => { loadData(); }, [loadData]);

  function openDialog() {
    setInvoiceId("");
    setAmount("");
    setMethod("cash");
    setTransactionRef("");
    setNotes("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!invoiceId || !amount) {
      toast.error("Invoice and amount are required");
      return;
    }
    setCreating(true);
    try {
      const invoice = invoices.find((i) => i.id === invoiceId);
      const paymentAmount = parseFloat(amount);

      const { data, error } = await supabase
        .from("payments")
        .insert({
          organization_id: organization.id,
          pg_id: invoice.pg_id || null,
          invoice_id: invoiceId,
          tenant_id: invoice.tenant_id,
          amount: paymentAmount,
          payment_date: paymentDate,
          method,
          transaction_ref: transactionRef || null,
          notes: notes || null,
          recorded_by: user.id,
          status: "completed",
        })
        .select("*, tenants(first_name, last_name), invoices(invoice_number)")
        .single();

      if (error) throw error;

      // Recalculate invoice status
      const { data: allPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("invoice_id", invoiceId)
        .eq("status", "completed");

      const totalPaid = (allPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const invoiceTotal = Number(invoice.total_amount || invoice.amount || 0);
      const newStatus = totalPaid >= invoiceTotal ? "paid" : "partial";

      await supabase.from("invoices").update({ status: newStatus }).eq("id", invoiceId);

      // Trigger payment confirmation email
      try {
        await supabase.functions.invoke("send-payment-confirmation", {
          body: { paymentId: data.id, invoiceId, tenantId: invoice.tenant_id },
        });
      } catch (_) { /* email is best-effort */ }

      setPayments((prev) => [data, ...prev]);
      setDialogOpen(false);
      toast.success("Payment recorded successfully");
      loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  function exportCSV() {
    const rows = [
      ["Date", "Tenant", "Invoice #", "Amount", "Method", "Reference", "Status"],
      ...filtered.map((p) => [
        p.payment_date ? format(new Date(p.payment_date), "yyyy-MM-dd") : format(new Date(p.created_at), "yyyy-MM-dd"),
        `${p.tenants?.first_name || ""} ${p.tenants?.last_name || ""}`.trim(),
        p.invoices?.invoice_number || "",
        p.amount,
        p.method || "",
        p.transaction_ref || "",
        p.status || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const name = `${p.tenants?.first_name || ""} ${p.tenants?.last_name || ""}`.toLowerCase();
    const inv = (p.invoices?.invoice_number || "").toLowerCase();
    const ref = (p.transaction_ref || "").toLowerCase();
    return name.includes(search.toLowerCase()) || inv.includes(search.toLowerCase()) || ref.includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Records"
        description={`${payments.length} payment${payments.length !== 1 ? "s" : ""} recorded`}
        action={
          <Button onClick={openDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        }
      />

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments recorded"
          description="Record payments against invoices to track collections"
          action={<Button onClick={openDialog}><Plus className="mr-2 h-4 w-4" />Record Payment</Button>}
        />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant, invoice, reference…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payments match your search
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.payment_date
                          ? format(new Date(p.payment_date), "MMM d, yyyy")
                          : format(new Date(p.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.tenants?.first_name} {p.tenants?.last_name}
                      </TableCell>
                      <TableCell>{p.invoices?.invoice_number || "—"}</TableCell>
                      <TableCell>₹{Number(p.amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${methodColors[p.method] || ""}`}>
                          {p.method?.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.transaction_ref || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Invoice <span className="text-destructive">*</span></Label>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground border rounded-md p-3 bg-muted">
                  No outstanding invoices. All invoices are paid or there are none yet.
                </p>
              ) : (
                <Select value={invoiceId} onValueChange={(v) => {
                  setInvoiceId(v);
                  const inv = invoices.find((i) => i.id === v);
                  if (inv) setAmount((inv.total_amount || inv.amount || "").toString());
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outstanding invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {inv.tenants?.first_name} {inv.tenants?.last_name} (₹{Number(inv.total_amount || inv.amount).toLocaleString("en-IN")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Transaction Reference</Label>
              <Input
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="UPI ID, cheque no., bank ref…"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !invoiceId}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
