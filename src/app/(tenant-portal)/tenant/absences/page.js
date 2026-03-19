"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/user-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarOff, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

export default function TenantAbsencesPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [tenant, setTenant] = useState(null);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, pg_id, organization_id")
        .eq("user_id", user.id)
        .single();

      if (!tenantData) return;
      setTenant(tenantData);

      const { data } = await supabase
        .from("absence_reports")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .order("created_at", { ascending: false });

      setAbsences(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate() {
    if (!fromDate || !toDate) {
      toast.error("Start and end dates are required");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("absence_reports")
        .insert({
          organization_id: tenant.organization_id,
          pg_id: tenant.pg_id,
          tenant_id: tenant.id,
          start_date: fromDate,
          end_date: toDate,
          reason,
        })
        .select()
        .single();

      if (error) throw error;
      setAbsences((prev) => [data, ...prev]);
      setDialogOpen(false);
      setFromDate("");
      setToDate("");
      setReason("");
      toast.success("Absence reported");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Absences</h1>
          <p className="text-muted-foreground">
            {absences.length} report{absences.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Report
        </Button>
      </div>

      {absences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarOff className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No absence reports</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Report Absence
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {absences.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {format(new Date(a.start_date), "MMM d")} —{" "}
                        {format(new Date(a.end_date), "MMM d, yyyy")}
                      </span>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusConfig[a.status]?.color}`}>
                        {statusConfig[a.status]?.label}
                      </span>
                    </div>
                    {a.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {a.reason}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Absence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Going home, travel, etc."
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
