"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { useUser } from "@/context/user-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { Megaphone, Plus, Loader2, Pin, Pencil, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function NoticesPage() {
  const { organization, currentPg, pgs } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pgId, setPgId] = useState("");
  const [pinned, setPinned] = useState(false);

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let query = supabase
        .from("notices")
        .select("*, pgs(name), users:created_by(first_name, last_name)")
        .eq("organization_id", organization.id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (currentPg) query = query.or(`pg_id.eq.${currentPg.id},pg_id.is.null`);

      const { data } = await query;
      setNotices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization, currentPg]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setBody("");
    setPgId("");
    setPinned(false);
    setDialogOpen(true);
  }

  function openEdit(notice) {
    setEditing(notice);
    setTitle(notice.title);
    setBody(notice.body || "");
    setPgId(notice.pg_id || "");
    setPinned(notice.pinned);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        organization_id: organization.id,
        pg_id: pgId || null,
        title,
        body,
        pinned,
        created_by: user.id,
      };

      if (editing) {
        const { data, error } = await supabase
          .from("notices")
          .update(payload)
          .eq("id", editing.id)
          .select("*, pgs(name), users:created_by(first_name, last_name)")
          .single();
        if (error) throw error;
        setNotices((prev) => prev.map((n) => (n.id === data.id ? data : n)));
        toast.success("Notice updated");
      } else {
        const { data, error } = await supabase
          .from("notices")
          .insert(payload)
          .select("*, pgs(name), users:created_by(first_name, last_name)")
          .single();
        if (error) throw error;
        setNotices((prev) => [data, ...prev]);
        toast.success("Notice published");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteNotice) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("notices")
        .delete()
        .eq("id", deleteNotice.id);
      if (error) throw error;
      setNotices((prev) => prev.filter((n) => n.id !== deleteNotice.id));
      setDeleteNotice(null);
      toast.success("Notice deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notices"
        description="Announcements for your tenants and staff"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Notice
          </Button>
        }
      />

      {notices.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No notices yet"
          description="Create your first notice to communicate with tenants"
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Notice
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {notice.pinned && (
                      <Pin className="h-4 w-4 text-primary" />
                    )}
                    <CardTitle className="text-base">{notice.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {notice.pgs?.name || "All PGs"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(notice)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDeleteNotice(notice)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {notice.body && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                    {notice.body}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  By {notice.users?.first_name} {notice.users?.last_name} &middot;{" "}
                  {formatDistanceToNow(new Date(notice.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Notice" : "Create Notice"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notice title"
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Notice content..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={pgId} onValueChange={setPgId}>
                <SelectTrigger>
                  <SelectValue placeholder="All PGs (org-wide)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All PGs</SelectItem>
                  {pgs.map((pg) => (
                    <SelectItem key={pg.id} value={pg.id}>
                      {pg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={pinned} onCheckedChange={setPinned} />
              <Label>Pin to top</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteNotice}
        onOpenChange={() => setDeleteNotice(null)}
        title="Delete Notice"
        description="This notice will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
