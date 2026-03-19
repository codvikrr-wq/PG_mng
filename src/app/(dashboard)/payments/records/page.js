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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { CreditCard, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { PAYMENT_METHODS } from "@/lib/constants";

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
      let query = supabase
        .from("payments")
        .select("*, tenants(first_name, last_name), invoices(invoice_number)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      const { data } = await query;
      setPayments(data || []);

      // Load unpaid/partial invoices for the form
      const { data: invData } = await supabase
        .from("invoices")
        .select("*, tenants(first_name, last_name)")
        .eq("organization_id", organization.id)
        .in("status", ["sent", "partial", "overdue"])
        .order("due_date");
      setInvoices(invData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          invoice_id: invoiceId,
          tenant_id: invoice.tenant_id,
          amount: paymentAmount,
          method,
          transaction_ref: transactionRef || null,
          notes: notes || null,
          recorded_by: user.id,
          status: "completed",
        })
        .select("*, tenants(first_name, last_name), invoices(invoice_number)")
        .single();

      if (error) throw error;

      // Update invoice status
      const { data: allPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("invoice_id", invoiceId)
        .eq("status", "completed");

      const totalPaid = (allPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const newStatus = totalPaid >= Number(invoice.total_amount) ? "paid" : "partial";

      await supabase
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", invoiceId);

      setPayments((prev) => [data, ...prev]);
      setDialogOpen(false);
      setInvoiceId("");
      setAmount("");
      setMethod("cash");
      setTransactionRef("");
      setNotes("");
      toast.success("Payment recorded");
      loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

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
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        }
      />

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments recorded"
          description="Record payments against invoices"
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          }
        />
      ) : (
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
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="font-medium">
                    {p.tenants?.first_name} {p.tenants?.last_name}
                  </TableCell>
                  <TableCell>{p.invoices?.invoice_number || "—"}</TableCell>
                  <TableCell>₹{Number(p.amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${methodColors[p.method] || ""}`}>
                      {p.method?.replace("_", " ")}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Invoice</Label>
              <Select value={invoiceId} onValueChange={(v) => {
                setInvoiceId(v);
                const inv = invoices.find((i) => i.id === v);
                if (inv) setAmount(inv.total_amount?.toString() || "");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.tenants?.first_name} {inv.tenants?.last_name} (₹{Number(inv.total_amount).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Transaction Reference</Label>
              <Input
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="UPI ID, cheque no., etc."
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
