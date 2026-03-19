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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  MessageSquareWarning, Plus, Loader2, Eye, AlertCircle, Clock, CheckCircle,
} from "lucide-react";
import { COMPLAINT_CATEGORIES } from "@/lib/constants";
import { format, formatDistanceToNow } from "date-fns";

const statusConfig = {
  open: { label: "Open", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
};

export default function TenantComplaintsPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [tenant, setTenant] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  // Form
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

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
        .from("complaints")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .order("created_at", { ascending: false });

      setComplaints(data || []);
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
    if (!category || !subject) {
      toast.error("Category and subject are required");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("complaints")
        .insert({
          organization_id: tenant.organization_id,
          pg_id: tenant.pg_id,
          tenant_id: tenant.id,
          category,
          title: subject,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      setComplaints((prev) => [data, ...prev]);
      setDialogOpen(false);
      setCategory("");
      setSubject("");
      setDescription("");
      toast.success("Complaint submitted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function openDetail(complaint) {
    setSelected(complaint);
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
          complaint_id: selected.id,
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
          <h1 className="text-2xl font-bold">Complaints</h1>
          <p className="text-muted-foreground">
            {complaints.length} complaint{complaints.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>

      {complaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquareWarning className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No complaints filed</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Report an Issue
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => openDetail(c)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{c.title}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusConfig[c.status]?.color}`}>
                        {statusConfig[c.status]?.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {c.category}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
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
            <DialogTitle>Report an Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
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
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of the issue"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more details..."
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
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>{selected.category}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <span className={`rounded px-2 py-1 text-xs font-medium ${statusConfig[selected.status]?.color}`}>
                  {statusConfig[selected.status]?.label}
                </span>

                {selected.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selected.description}
                    </p>
                  </div>
                )}

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
                  Submitted{" "}
                  {format(new Date(selected.created_at), "MMM d, yyyy h:mm a")}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
