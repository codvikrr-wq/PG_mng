"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Loader2,
  Search,
  MoreHorizontal,
  Send,
  Eye,
  Trash2,
  X,
} from "lucide-react";

const STATUS_BADGES = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-500",
};

const TAX_RATE = 0; // Set to 0.18 for 18% GST if needed

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InvoicesPage() {
  const { organization, currentPg, pgs } = useOrg();
  const supabase = createClient();

  const [invoices, setInvoices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPg, setFilterPg] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Form state
  const [formTenantId, setFormTenantId] = useState("");
  const [formPeriodStart, setFormPeriodStart] = useState("");
  const [formPeriodEnd, setFormPeriodEnd] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formLineItems, setFormLineItems] = useState([
    { description: "Monthly Rent", amount: "" },
  ]);
  const [tenantSearch, setTenantSearch] = useState("");

  const loadInvoices = useCallback(async () => {
    if (!organization) return;
    try {
      let query = supabase
        .from("invoices")
        .select("*, tenants(first_name, last_name), pgs(name)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (currentPg) {
        query = query.eq("pg_id", currentPg.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error("Error loading invoices:", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [organization, currentPg]);

  const loadTenants = useCallback(async () => {
    if (!organization) return;
    try {
      let query = supabase
        .from("tenants")
        .select("id, first_name, last_name, pg_id, pgs(name)")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .order("first_name");

      if (currentPg) {
        query = query.eq("pg_id", currentPg.id);
      }

      const { data } = await query;
      setTenants(data || []);
    } catch (err) {
      console.error("Error loading tenants:", err);
    }
  }, [organization, currentPg]);

  useEffect(() => {
    loadInvoices();
    loadTenants();
  }, [loadInvoices, loadTenants]);

  function resetForm() {
    setFormTenantId("");
    setFormPeriodStart("");
    setFormPeriodEnd("");
    setFormDueDate("");
    setFormNotes("");
    setFormLineItems([{ description: "Monthly Rent", amount: "" }]);
    setTenantSearch("");
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function addLineItem() {
    setFormLineItems((prev) => [...prev, { description: "", amount: "" }]);
  }

  function removeLineItem(index) {
    setFormLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index, field, value) {
    setFormLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function getSubtotal() {
    return formLineItems.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0
    );
  }

  function getTaxAmount() {
    return getSubtotal() * TAX_RATE;
  }

  function getTotal() {
    return getSubtotal() + getTaxAmount();
  }

  async function handleSaveInvoice() {
    if (!formTenantId) {
      toast.error("Please select a tenant");
      return;
    }
    if (!formPeriodStart || !formPeriodEnd) {
      toast.error("Please set the billing period");
      return;
    }
    if (!formDueDate) {
      toast.error("Please set a due date");
      return;
    }
    const validItems = formLineItems.filter(
      (item) => item.description.trim() && parseFloat(item.amount) > 0
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one line item with an amount");
      return;
    }

    setSaving(true);
    try {
      const tenant = tenants.find((t) => t.id === formTenantId);
      const subtotal = validItems.reduce(
        (sum, item) => sum + parseFloat(item.amount),
        0
      );
      const taxAmount = subtotal * TAX_RATE;
      const total = subtotal + taxAmount;

      const payload = {
        organization_id: organization.id,
        pg_id: tenant?.pg_id || currentPg?.id,
        tenant_id: formTenantId,
        period_start: formPeriodStart,
        period_end: formPeriodEnd,
        due_date: formDueDate,
        line_items: validItems.map((item) => ({
          description: item.description,
          amount: parseFloat(item.amount),
        })),
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        status: "draft",
        notes: formNotes || null,
      };

      const { data, error } = await supabase
        .from("invoices")
        .insert(payload)
        .select("*, tenants(first_name, last_name), pgs(name)")
        .single();

      if (error) throw error;

      setInvoices((prev) => [data, ...prev]);
      setDialogOpen(false);
      resetForm();
      toast.success("Invoice created successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendInvoice(invoice) {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", invoice.id)
        .select("*, tenants(first_name, last_name), pgs(name)")
        .single();

      if (error) throw error;

      setInvoices((prev) =>
        prev.map((inv) => (inv.id === data.id ? data : inv))
      );
      toast.success("Invoice marked as sent");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleCancelInvoice(invoice) {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("id", invoice.id)
        .select("*, tenants(first_name, last_name), pgs(name)")
        .single();

      if (error) throw error;

      setInvoices((prev) =>
        prev.map((inv) => (inv.id === data.id ? data : inv))
      );
      toast.success("Invoice cancelled");
    } catch (error) {
      toast.error(error.message);
    }
  }

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (filterPg !== "all" && inv.pg_id !== filterPg) return false;
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (filterDateFrom && inv.created_at < filterDateFrom) return false;
    if (filterDateTo && inv.created_at > filterDateTo + "T23:59:59") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const tenantName = `${inv.tenants?.first_name || ""} ${inv.tenants?.last_name || ""}`.toLowerCase();
      const invoiceNum = (inv.invoice_number || "").toLowerCase();
      if (!tenantName.includes(q) && !invoiceNum.includes(q)) return false;
    }
    return true;
  });

  // Filtered tenants for search in dialog
  const filteredTenants = tenants.filter((t) => {
    if (!tenantSearch) return true;
    const name = `${t.first_name} ${t.last_name}`.toLowerCase();
    return name.includes(tenantSearch.toLowerCase());
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description={`${invoices.length} invoice${invoices.length !== 1 ? "s" : ""} total`}
        action={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by tenant or invoice #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {!currentPg && pgs.length > 1 && (
          <Select value={filterPg} onValueChange={setFilterPg}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All PGs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PGs</SelectItem>
              {pgs.map((pg) => (
                <SelectItem key={pg.id} value={pg.id}>
                  {pg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="w-[150px]"
          placeholder="From"
        />
        <Input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="w-[150px]"
          placeholder="To"
        />
      </div>

      {/* Table */}
      {filteredInvoices.length === 0 ? (
        invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Create your first invoice to start billing tenants"
            action={
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No invoices match your filters"
            description="Try adjusting your search or filter criteria"
          />
        )
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>PG</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoice_number || "-"}
                  </TableCell>
                  <TableCell>
                    {invoice.tenants
                      ? `${invoice.tenants.first_name} ${invoice.tenants.last_name}`
                      : "-"}
                  </TableCell>
                  <TableCell>{invoice.pgs?.name || "-"}</TableCell>
                  <TableCell>
                    {invoice.period_start && invoice.period_end
                      ? `${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.total_amount)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[invoice.status] || STATUS_BADGES.draft}`}
                    >
                      {invoice.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(invoice.due_date)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setViewInvoice(invoice)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {invoice.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => handleSendInvoice(invoice)}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Mark as Sent
                          </DropdownMenuItem>
                        )}
                        {invoice.status !== "paid" &&
                          invoice.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => handleCancelInvoice(invoice)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancel Invoice
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Generate a new invoice for a tenant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Tenant Select */}
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Input
                placeholder="Search tenants..."
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                className="mb-2"
              />
              <Select value={formTenantId} onValueChange={setFormTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name}
                      {tenant.pgs?.name ? ` (${tenant.pgs.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Billing Period */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={formPeriodStart}
                  onChange={(e) => setFormPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={formPeriodEnd}
                  onChange={(e) => setFormPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Item
                </Button>
              </div>
              {formLineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(index, "description", e.target.value)
                    }
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={item.amount}
                    onChange={(e) =>
                      updateLineItem(index, "amount", e.target.value)
                    }
                    className="w-[140px]"
                  />
                  {formLineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeLineItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(getSubtotal())}</span>
                </div>
                {TAX_RATE > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tax ({(TAX_RATE * 100).toFixed(0)}%)
                    </span>
                    <span>{formatCurrency(getTaxAmount())}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(getTotal())}</span>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any additional notes for this invoice..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveInvoice} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Invoice {viewInvoice?.invoice_number || ""}
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tenant</span>
                  <p className="font-medium">
                    {viewInvoice.tenants?.first_name}{" "}
                    {viewInvoice.tenants?.last_name}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">PG</span>
                  <p className="font-medium">{viewInvoice.pgs?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Period</span>
                  <p className="font-medium">
                    {formatDate(viewInvoice.period_start)} -{" "}
                    {formatDate(viewInvoice.period_end)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date</span>
                  <p className="font-medium">
                    {formatDate(viewInvoice.due_date)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[viewInvoice.status] || STATUS_BADGES.draft}`}
                    >
                      {viewInvoice.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Line items */}
              {viewInvoice.line_items && viewInvoice.line_items.length > 0 && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewInvoice.line_items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(viewInvoice.subtotal)}</span>
                </div>
                {viewInvoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(viewInvoice.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(viewInvoice.total_amount)}</span>
                </div>
              </div>

              {viewInvoice.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <p className="text-sm">{viewInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewInvoice(null)}>
              Close
            </Button>
            {viewInvoice?.status === "draft" && (
              <Button
                onClick={() => {
                  handleSendInvoice(viewInvoice);
                  setViewInvoice(null);
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Mark as Sent
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
