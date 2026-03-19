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
import { CalendarOff, Plus, Loader2, Check, X } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function AbsencesPage() {
  const { organization, currentPg } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Form
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let query = supabase
        .from("absence_reports")
        .select("*, tenants(first_name, last_name), pgs(name)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (currentPg) query = query.eq("pg_id", currentPg.id);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data } = await query;
      setAbsences(data || []);

      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, first_name, last_name, pg_id")
        .eq("organization_id", organization.id)
        .eq("status", "active");
      setTenants(tenantData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization, currentPg, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate() {
    if (!tenantId || !startDate || !endDate) {
      toast.error("Tenant, start date, and end date are required");
      return;
    }
    setCreating(true);
    try {
      const tenant = tenants.find((t) => t.id === tenantId);
      const { data, error } = await supabase
        .from("absence_reports")
        .insert({
          organization_id: organization.id,
          pg_id: tenant?.pg_id || currentPg?.id,
          tenant_id: tenantId,
          start_date: startDate,
          end_date: endDate,
          reason,
        })
        .select("*, tenants(first_name, last_name), pgs(name)")
        .single();

      if (error) throw error;
      setAbsences((prev) => [data, ...prev]);
      setDialogOpen(false);
      setTenantId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      toast.success("Absence report created");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleApproval(id, status) {
    try {
      const { error } = await supabase
        .from("absence_reports")
        .update({ status, approved_by: user.id })
        .eq("id", id);
      if (error) throw error;
      setAbsences((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      toast.success(`Absence ${status}`);
    } catch (error) {
      toast.error(error.message);
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
        title="Absence Reports"
        description={`${absences.length} report${absences.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Report Absence
          </Button>
        }
      />

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {absences.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No absence reports"
          description="No tenants have reported absences"
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>PG</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absences.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.tenants?.first_name} {a.tenants?.last_name}
                  </TableCell>
                  <TableCell>{a.pgs?.name}</TableCell>
                  <TableCell>{format(new Date(a.start_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{format(new Date(a.end_date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {a.reason || "—"}
                  </TableCell>
                  <TableCell>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusConfig[a.status]}`}>
                      {a.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {a.status === "pending" && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleApproval(a.id, "approved")}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleApproval(a.id, "rejected")}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
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
            <DialogTitle>Report Absence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.first_name} {t.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional reason for absence"
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
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
