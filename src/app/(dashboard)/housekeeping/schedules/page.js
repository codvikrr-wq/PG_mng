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
import { Switch } from "@/components/ui/switch";
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
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function HousekeepingSchedulesPage() {
  const { organization, currentPg, pgs } = useOrg();
  const { user } = useUser();
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
  const [task, setTask] = useState("");
  const [frequency, setFrequency] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let query = supabase
        .from("housekeeping_schedules")
        .select("*, rooms(room_number), users:assigned_to(full_name), pgs(name)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (currentPg) query = query.eq("pg_id", currentPg.id);
      const { data } = await query;
      setSchedules(data || []);

      // Load rooms for this org
      const { data: roomData } = await supabase
        .from("rooms")
        .select("id, room_number, pg_id")
        .eq("organization_id", organization.id)
        .order("room_number");
      setRooms(roomData || []);

      // Load staff users (non-tenant roles)
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

  function openCreate() {
    setEditing(null);
    setPgId(currentPg?.id || "");
    setRoomId("");
    setAssignedTo("");
    setTask("");
    setFrequency("");
    setDayOfWeek("");
    setTimeSlot("");
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(s) {
    setEditing(s);
    setPgId(s.pg_id || "");
    setRoomId(s.room_id || "");
    setAssignedTo(s.assigned_to || "");
    setTask(s.task || "");
    setFrequency(s.frequency || "");
    setDayOfWeek(s.day_of_week || "");
    setTimeSlot(s.time_slot || "");
    setIsActive(s.is_active ?? true);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!task || !frequency) {
      toast.error("Task and frequency are required");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        organization_id: organization.id,
        pg_id: pgId || null,
        room_id: roomId || null,
        assigned_to: assignedTo || null,
        task,
        frequency,
        day_of_week: frequency === "weekly" ? dayOfWeek || null : null,
        time_slot: timeSlot || null,
        is_active: isActive,
      };

      if (editing) {
        const { data, error } = await supabase
          .from("housekeeping_schedules")
          .update(payload)
          .eq("id", editing.id)
          .select("*, rooms(room_number), users:assigned_to(full_name), pgs(name)")
          .single();
        if (error) throw error;
        setSchedules((prev) => prev.map((s) => (s.id === data.id ? data : s)));
        toast.success("Schedule updated");
      } else {
        const { data, error } = await supabase
          .from("housekeeping_schedules")
          .insert(payload)
          .select("*, rooms(room_number), users:assigned_to(full_name), pgs(name)")
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
                <TableHead>Task</TableHead>
                <TableHead>PG</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.task}</TableCell>
                  <TableCell>{s.pgs?.name || "—"}</TableCell>
                  <TableCell>{s.rooms?.room_number || "—"}</TableCell>
                  <TableCell>{s.users?.full_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{s.frequency}</Badge>
                  </TableCell>
                  <TableCell>{s.frequency === "weekly" ? s.day_of_week || "—" : "—"}</TableCell>
                  <TableCell>{s.time_slot || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? "default" : "secondary"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
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
              <Label>Task</Label>
              <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Floor mopping, Bathroom cleaning" />
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
                    <SelectItem value="">All Rooms</SelectItem>
                    {filteredRooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {staffUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue placeholder="Select Frequency" /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => <SelectItem key={f} value={f} className="capitalize">{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {frequency === "weekly" && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger><SelectValue placeholder="Select Day" /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <Input type="time" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
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
