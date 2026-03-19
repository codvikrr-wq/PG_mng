"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { useUser } from "@/context/user-context";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  MessageSquareWarning,
  Plus,
  Loader2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { COMPLAINT_STATUS, COMPLAINT_CATEGORIES } from "@/lib/constants";
import { formatDistanceToNow, format } from "date-fns";

const statusConfig = {
  open: { label: "Open", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", icon: CheckCircle },
};

const priorityConfig = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function ComplaintsPage() {
  const { organization, currentPg } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [tenants, setTenants] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Form
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let query = supabase
        .from("complaints")
        .select("*, tenants(first_name, last_name), pgs(name)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (currentPg) query = query.eq("pg_id", currentPg.id);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data } = await query;
      setComplaints(data || []);

      // Load tenants for the create form
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
    if (!tenantId || !category || !title) {
      toast.error("Tenant, category, and title are required");
      return;
    }
    setCreating(true);
    try {
      const tenant = tenants.find((t) => t.id === tenantId);
      const { data, error } = await supabase
        .from("complaints")
        .insert({
          organization_id: organization.id,
          pg_id: tenant?.pg_id || currentPg?.id,
          tenant_id: tenantId,
          category,
          title,
          description,
          priority,
        })
        .select("*, tenants(first_name, last_name), pgs(name)")
        .single();

      if (error) throw error;
      setComplaints((prev) => [data, ...prev]);
      setDialogOpen(false);
      resetForm();
      toast.success("Complaint logged");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setTenantId("");
    setCategory("");
    setTitle("");
    setDescription("");
    setPriority("medium");
  }

  async function openDetail(complaint) {
    setSelectedComplaint(complaint);
    setDetailOpen(true);
    const { data } = await supabase
      .from("complaint_comments")
      .select("*, users(first_name, last_name)")
      .eq("complaint_id", complaint.id)
      .order("created_at");
    setComments(data || []);
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    try {
      const { data, error } = await supabase
        .from("complaint_comments")
        .insert({
          complaint_id: selectedComplaint.id,
          user_id: user.id,
          body: newComment,
        })
        .select("*, users(first_name, last_name)")
        .single();

      if (error) throw error;
      setComments((prev) => [...prev, data]);
      setNewComment("");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function updateStatus(complaintId, newStatus) {
    try {
      const updates = { status: newStatus };
      if (newStatus === "assigned") updates.assigned_to = user.id;

      const { error } = await supabase
        .from("complaints")
        .update(updates)
        .eq("id", complaintId);

      if (error) throw error;
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, ...updates } : c))
      );
      if (selectedComplaint?.id === complaintId) {
        setSelectedComplaint((prev) => ({ ...prev, ...updates }));
      }
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error(error.message);
    }
  }

  const filtered = complaints.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(s) ||
      c.tenants?.first_name?.toLowerCase().includes(s) ||
      c.tenants?.last_name?.toLowerCase().includes(s) ||
      c.category?.toLowerCase().includes(s)
    );
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
        title="Complaints"
        description={`${complaints.length} complaint${complaints.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Complaint
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search complaints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(COMPLAINT_STATUS).map(([key, val]) => (
              <SelectItem key={val} value={val}>
                {statusConfig[val]?.label || val}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="No complaints"
          description={search ? "No complaints match your search" : "All caught up! No complaints logged."}
          action={
            !search && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Log Complaint
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {c.title}
                  </TableCell>
                  <TableCell>
                    {c.tenants?.first_name} {c.tenants?.last_name}
                  </TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityConfig[c.priority]}`}>
                      {c.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusConfig[c.status]?.color}`}>
                      {statusConfig[c.status]?.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetail(c)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Complaint</DialogTitle>
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
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLAINT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedComplaint && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedComplaint.title}</SheetTitle>
                <SheetDescription>
                  {selectedComplaint.category} &middot;{" "}
                  {selectedComplaint.tenants?.first_name}{" "}
                  {selectedComplaint.tenants?.last_name}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Status and priority */}
                <div className="flex gap-2">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${statusConfig[selectedComplaint.status]?.color}`}>
                    {statusConfig[selectedComplaint.status]?.label}
                  </span>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${priorityConfig[selectedComplaint.priority]}`}>
                    {selectedComplaint.priority}
                  </span>
                </div>

                {/* Description */}
                {selectedComplaint.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedComplaint.description}
                    </p>
                  </div>
                )}

                {/* Status actions */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Update Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {["assigned", "in_progress", "resolved", "closed"].map(
                      (s) =>
                        s !== selectedComplaint.status && (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus(selectedComplaint.id, s)
                            }
                          >
                            {statusConfig[s]?.label}
                          </Button>
                        )
                    )}
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Comments ({comments.length})
                  </h4>
                  <div className="space-y-3 mb-4">
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-md bg-muted p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">
                            {c.users?.first_name} {c.users?.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(c.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm">{c.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddComment()
                      }
                    />
                    <Button size="sm" onClick={handleAddComment}>
                      Send
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created{" "}
                  {format(
                    new Date(selectedComplaint.created_at),
                    "MMM d, yyyy h:mm a"
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
