"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { useUser } from "@/context/user-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Wrench, Plus, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { TICKET_PRIORITY } from "@/lib/constants";

const STATUSES = ["open", "in_progress", "resolved", "closed"];

const PRIORITY_COLORS = {
  low: "bg-gray-100 text-gray-700 border-gray-300",
  medium: "bg-blue-100 text-blue-700 border-blue-300",
  high: "bg-yellow-100 text-yellow-700 border-yellow-300",
  urgent: "bg-red-100 text-red-700 border-red-300",
};

const STATUS_COLORS = {
  open: "bg-red-100 text-red-700 border-red-300",
  in_progress: "bg-yellow-100 text-yellow-700 border-yellow-300",
  resolved: "bg-green-100 text-green-700 border-green-300",
  closed: "bg-gray-100 text-gray-700 border-gray-300",
};

function statusLabel(s) {
  return s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MaintenanceTicketsPage() {
  const { organization, currentPg, pgs } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [tickets, setTickets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTicket, setDeleteTicket] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [pgId, setPgId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let query = supabase
        .from("maintenance_tickets")
        .select("*, rooms(room_number), reporter:reported_by(full_name), assignee:assigned_to(full_name), pgs(name)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (currentPg) query = query.eq("pg_id", currentPg.id);
      const { data } = await query;
      setTickets(data || []);

      const { data: roomData } = await supabase
        .from("rooms")
        .select("id, room_number, pg_id")
        .eq("organization_id", organization.id)
        .order("room_number");
      setRooms(roomData || []);

      const { data: staffData } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("organization_id", organization.id)
        .neq("system_role", "Tenant")
        .order("full_name");
      setStaffUsers(staffData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization, currentPg]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRooms = pgId ? rooms.filter((r) => r.pg_id === pgId) : rooms;
  const filteredTickets = statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

  function openCreate() {
    setPgId(currentPg?.id || "");
    setRoomId("");
    setTitle("");
    setDescription("");
    setPriority("");
    setDialogOpen(true);
  }

  function openSheet(ticket) {
    setSelectedTicket(ticket);
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!title || !priority) {
      toast.error("Title and priority are required");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        organization_id: organization.id,
        pg_id: pgId || null,
        room_id: roomId || null,
        reported_by: user.id,
        title,
        description,
        priority,
        status: "open",
      };

      const { data, error } = await supabase
        .from("maintenance_tickets")
        .insert(payload)
        .select("*, rooms(room_number), reporter:reported_by(full_name), assignee:assigned_to(full_name), pgs(name)")
        .single();
      if (error) throw error;
      setTickets((prev) => [data, ...prev]);
      toast.success("Ticket created");
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(newStatus) {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const updates = { status: newStatus };
      if (newStatus === "resolved") updates.resolved_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("maintenance_tickets")
        .update(updates)
        .eq("id", selectedTicket.id)
        .select("*, rooms(room_number), reporter:reported_by(full_name), assignee:assigned_to(full_name), pgs(name)")
        .single();
      if (error) throw error;
      setTickets((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      setSelectedTicket(data);
      toast.success(`Status changed to ${statusLabel(newStatus)}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleAssign(userId) {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .update({ assigned_to: userId || null })
        .eq("id", selectedTicket.id)
        .select("*, rooms(room_number), reporter:reported_by(full_name), assignee:assigned_to(full_name), pgs(name)")
        .single();
      if (error) throw error;
      setTickets((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      setSelectedTicket(data);
      toast.success("Assignee updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTicket) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("maintenance_tickets").delete().eq("id", deleteTicket.id);
      if (error) throw error;
      setTickets((prev) => prev.filter((t) => t.id !== deleteTicket.id));
      setDeleteTicket(null);
      if (selectedTicket?.id === deleteTicket.id) {
        setSheetOpen(false);
        setSelectedTicket(null);
      }
      toast.success("Ticket deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Tickets"
        description={`${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}`}
        action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Ticket</Button>}
      />

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>
          All ({tickets.length})
        </Button>
        {STATUSES.map((s) => {
          const count = tickets.filter((t) => t.status === s).length;
          return (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
              {statusLabel(s)} ({count})
            </Button>
          );
        })}
      </div>

      {filteredTickets.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance tickets"
          description={statusFilter === "all" ? "Create a ticket when something needs fixing" : `No ${statusLabel(statusFilter).toLowerCase()} tickets`}
          action={statusFilter === "all" ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Ticket</Button> : null}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>PG</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => openSheet(t)}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{t.pgs?.name || "—"}</TableCell>
                  <TableCell>{t.rooms?.room_number || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${PRIORITY_COLORS[t.priority] || ""}`}>
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${STATUS_COLORS[t.status] || ""}`}>
                      {statusLabel(t.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.assignee?.full_name || "—"}</TableCell>
                  <TableCell>{format(new Date(t.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); setDeleteTicket(t); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          {selectedTicket && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedTicket.title}</SheetTitle>
                <SheetDescription>
                  Reported by {selectedTicket.reporter?.full_name || "Unknown"} on{" "}
                  {format(new Date(selectedTicket.created_at), "MMM d, yyyy h:mm a")}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p className="text-sm">{selectedTicket.description || "No description provided."}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">PG</Label>
                    <p className="text-sm">{selectedTicket.pgs?.name || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Room</Label>
                    <p className="text-sm">{selectedTicket.rooms?.room_number || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Priority</Label>
                    <div>
                      <Badge variant="outline" className={`capitalize ${PRIORITY_COLORS[selectedTicket.priority] || ""}`}>
                        {selectedTicket.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div>
                      <Badge variant="outline" className={`${STATUS_COLORS[selectedTicket.status] || ""}`}>
                        {statusLabel(selectedTicket.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedTicket.resolved_at && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Resolved At</Label>
                    <p className="text-sm">{format(new Date(selectedTicket.resolved_at), "MMM d, yyyy h:mm a")}</p>
                  </div>
                )}

                {/* Assign to */}
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={selectedTicket.assigned_to || ""}
                    onValueChange={handleAssign}
                    disabled={updating}
                  >
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {staffUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status change buttons */}
                <div className="space-y-2">
                  <Label>Change Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.filter((s) => s !== selectedTicket.status).map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        disabled={updating}
                        onClick={() => handleStatusChange(s)}
                      >
                        {updating && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        {statusLabel(s)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <SheetFooter>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setDeleteTicket(selectedTicket); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />Delete Ticket
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Maintenance Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief summary of the issue" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detailed description of the problem" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PG</Label>
                <Select value={pgId} onValueChange={(val) => { setPgId(val); setRoomId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select PG" /></SelectTrigger>
                  <SelectContent>
                    {pgs.map((pg) => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger><SelectValue placeholder="Select Room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Common Area</SelectItem>
                    {filteredRooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue placeholder="Select Priority" /></SelectTrigger>
                <SelectContent>
                  {Object.values(TICKET_PRIORITY).map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTicket}
        onOpenChange={() => setDeleteTicket(null)}
        title="Delete Ticket"
        description="This maintenance ticket will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
