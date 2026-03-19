"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { useUser } from "@/context/user-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Receipt, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export default function ExpensesPage() {
  const { organization, currentPg, pgs } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [pgId, setPgId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let query = supabase
        .from("expenses")
        .select("*, pgs(name)")
        .eq("organization_id", organization.id)
        .order("date", { ascending: false });

      if (currentPg) query = query.eq("pg_id", currentPg.id);
      const { data } = await query;
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization, currentPg]);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() {
    setEditing(null);
    setPgId(currentPg?.id || "");
    setCategory("");
    setDescription("");
    setAmount("");
    setVendorName("");
    setDate(new Date().toISOString().split("T")[0]);
    setDialogOpen(true);
  }

  function openEdit(exp) {
    setEditing(exp);
    setPgId(exp.pg_id || "");
    setCategory(exp.category);
    setDescription(exp.description || "");
    setAmount(exp.amount?.toString() || "");
    setVendorName(exp.vendor_name || "");
    setDate(exp.date || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!category || !amount) {
      toast.error("Category and amount are required");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        organization_id: organization.id,
        pg_id: pgId || null,
        category,
        description,
        amount: parseFloat(amount),
        vendor_name: vendorName || null,
        date,
        created_by: user.id,
      };

      if (editing) {
        const { data, error } = await supabase.from("expenses").update(payload).eq("id", editing.id).select("*, pgs(name)").single();
        if (error) throw error;
        setExpenses((prev) => prev.map((e) => (e.id === data.id ? data : e)));
        toast.success("Expense updated");
      } else {
        const { data, error } = await supabase.from("expenses").insert(payload).select("*, pgs(name)").single();
        if (error) throw error;
        setExpenses((prev) => [data, ...prev]);
        toast.success("Expense added");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteExpense) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", deleteExpense.id);
      if (error) throw error;
      setExpenses((prev) => prev.filter((e) => e.id !== deleteExpense.id));
      setDeleteExpense(null);
      toast.success("Expense deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description={`${expenses.length} expense${expenses.length !== 1 ? "s" : ""} — Total: ₹${total.toLocaleString()}`}
        action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Expense</Button>}
      />

      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses recorded" description="Track your property expenses here" action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Expense</Button>} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>PG</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{e.pgs?.name || "—"}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{e.description || "—"}</TableCell>
                  <TableCell>{e.vendor_name || "—"}</TableCell>
                  <TableCell className="font-medium">₹{Number(e.amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteExpense(e)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PG</Label>
                <Select value={pgId} onValueChange={setPgId}>
                  <SelectTrigger><SelectValue placeholder="Select PG" /></SelectTrigger>
                  <SelectContent>
                    {pgs.map((pg) => (<SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?" rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name" />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)} title="Delete Expense" description="This expense record will be permanently removed." confirmLabel="Delete" onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
