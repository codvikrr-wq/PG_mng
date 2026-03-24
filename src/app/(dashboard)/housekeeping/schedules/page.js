"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { CalendarClock, Plus, Loader2, Pencil, Trash2 } from "lucide-react";

const FREQUENCIES = ["daily", "weekly", "monthly"];
const SCHEDULE_TYPES = ["cleaning", "laundry", "pest_control", "maintenance", "inspection", "other"];

export default function HousekeepingSchedulesPage() {
  const { organization, currentPg, pgs } = useOrg();
  const supabase = createClient();

  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteSchedule, setDeleteSchedule] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [pgId, setPgId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [type, setType] = useState("");
  const [frequency, setFrequency] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let schedulesQ = supabase
        .from("housekeeping_schedules")
        .select("*, users:assigned_to(first_name, last_name), pgs(name)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (currentPg) schedulesQ = schedulesQ.eq("pg_id", currentPg.id);

      const [{ data }, { data: roomData }, { data: staffData }] = await Promise.all([
        schedulesQ,
        supabase.from("rooms").select("id, name, pg_id").eq("organization_id", organization.id).order("name"),
        supabase.from("users").select("id, first_name, last_name").eq("organization_id", organization.id).order("first_name"),
      ]);
      setSchedules(data || []);
      setRooms(roomData || []);
      setStaffUsers(staffData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization, currentPg]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRooms = pgId ? rooms.filter((r) => r.pg_id === pgId) : rooms;

  function openCreate() {
    setEditing(null);
    setPgId(currentPg?.id || "");
    setRoomId("");
    setAssignedTo("");
    setType("");
    setFrequency("");
    setNotes("");
    setDialogOpen(true);
  }

  function openEdit(s) {
    setEditing(s);
    setPgId(s.pg_id || "");
    setRoomId((s.rooms_assigned && s.rooms_assigned[0]) || "");
    setAssignedTo(s.assigned_to || "");
    setType(s.type || "");
    setFrequency(s.frequency || "");
    setNotes(s.notes || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!type || !frequency) {
      toast.error("Type and frequency are required");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        organization_id: organization.id,
        pg_id: pgId || null,
        assigned_to: assignedTo || null,
        type,
        frequency,
        rooms_assigned: roomId ? [roomId] : [],
        notes: notes || null,
      };

      const selectQuery = "*, users:assigned_to(first_name, last_name), pgs(name)";

      if (editing) {
        const { data, error } = await supabase
          .from("housekeeping_schedules")
          .update(payload)
          .eq("id", editing.id)
          .select(selectQuery)
          .single();
        if (error) throw error;
        setSchedules((prev) => prev.map((s) => (s.id === data.id ? data : s)));
        toast.success("Schedule updated");
      } else {
        const { data, error } = await supabase
          .from("housekeeping_schedules")
          .insert(payload)
          .select(selectQuery)
          .single();
        if (error) throw error;
        setSchedules((prev) => [data, ...prev]);
        toast.success("Schedule created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteSchedule) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("housekeeping_schedules").delete().eq("id", deleteSchedule.id);
      if (error) throw error;
      setSchedules((prev) => prev.filter((s) => s.id !== deleteSchedule.id));
      setDeleteSchedule(null);
      toast.success("Schedule deleted");
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
        title="Housekeeping Schedules"
        description={`${schedules.length} schedule${schedules.length !== 1 ? "s" : ""}`}
        action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Schedule</Button>}
      />

      {schedules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No schedules yet"
          description="Create housekeeping schedules to keep your PG clean and organized"
          action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Schedule</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>PG</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium capitalize">{s.type?.replace(/_/g, " ")}</TableCell>
                  <TableCell>{s.pgs?.name || "—"}</TableCell>
                  <TableCell>{s.users ? `${s.users.first_name || ""} ${s.users.last_name || ""}`.trim() : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{s.frequency}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{s.notes || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteSchedule(s)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Schedule" : "Add Schedule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {SCHEDULE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PG</Label>
                <Select value={pgId} onValueChange={(val) => { setPgId(val); setRoomId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select PG" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All PGs</SelectItem>
                    {pgs.map((pg) => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger><SelectValue placeholder="Select Room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Rooms</SelectItem>
                    {filteredRooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency <span className="text-destructive">*</span></Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue placeholder="Select Frequency" /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => <SelectItem key={f} value={f} className="capitalize">{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {staffUsers.map((u) => <SelectItem key={u.id} value={u.id}>{`${u.first_name || ""} ${u.last_name || ""}`.trim()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any special instructions..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteSchedule}
        onOpenChange={() => setDeleteSchedule(null)}
        title="Delete Schedule"
        description="This housekeeping schedule will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
