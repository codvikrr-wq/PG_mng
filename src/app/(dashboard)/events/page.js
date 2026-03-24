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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarDays, Plus, Loader2, MapPin, Users, Clock, Pencil, Trash2 } from "lucide-react";
import { format, isPast } from "date-fns";

export default function EventsPage() {
  const { organization, currentPg, pgs } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [events, setEvents] = useState([]);
  const [rsvpCounts, setRsvpCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [pgId, setPgId] = useState("");
  const [rsvpEnabled, setRsvpEnabled] = useState(true);

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let eventsQ = supabase.from("events").select("*, pgs(name)").eq("organization_id", organization.id).order("starts_at", { ascending: false });
      if (currentPg) eventsQ = eventsQ.eq("pg_id", currentPg.id);

      const [{ data }, { data: rsvps }] = await Promise.all([
        eventsQ,
        supabase.from("event_rsvps").select("event_id, status").eq("organization_id", organization.id),
      ]);
      setEvents(data || []);

      const counts = {};
      (rsvps || []).forEach((r) => {
        if (!counts[r.event_id]) counts[r.event_id] = { yes: 0, no: 0, maybe: 0 };
        counts[r.event_id][r.status] = (counts[r.event_id][r.status] || 0) + 1;
      });
      setRsvpCounts(counts);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [organization, currentPg]);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() {
    setEditing(null); setTitle(""); setDescription(""); setLocation(""); setStartsAt(""); setEndsAt(""); setCapacity(""); setPgId(currentPg?.id || ""); setRsvpEnabled(true); setDialogOpen(true);
  }

  function openEdit(ev) {
    setEditing(ev); setTitle(ev.title); setDescription(ev.description || ""); setLocation(ev.location || ""); setStartsAt(ev.starts_at?.slice(0, 16) || ""); setEndsAt(ev.ends_at?.slice(0, 16) || ""); setCapacity(ev.capacity?.toString() || ""); setPgId(ev.pg_id || ""); setRsvpEnabled(ev.rsvp_enabled); setDialogOpen(true);
  }

  async function handleSave() {
    if (!title || !startsAt) { toast.error("Title and start time are required"); return; }
    setCreating(true);
    try {
      const payload = { organization_id: organization.id, pg_id: pgId || null, title, description, location, starts_at: startsAt, ends_at: endsAt || null, capacity: parseInt(capacity) || null, rsvp_enabled: rsvpEnabled, created_by: user.id };
      if (editing) {
        const { data, error } = await supabase.from("events").update(payload).eq("id", editing.id).select("*, pgs(name)").single();
        if (error) throw error;
        setEvents((prev) => prev.map((e) => (e.id === data.id ? data : e)));
        toast.success("Event updated");
      } else {
        const { data, error } = await supabase.from("events").insert(payload).select("*, pgs(name)").single();
        if (error) throw error;
        setEvents((prev) => [data, ...prev]);
        toast.success("Event created");
      }
      setDialogOpen(false);
    } catch (error) { toast.error(error.message); }
    finally { setCreating(false); }
  }

  async function handleDelete() {
    if (!deleteEvent) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("events").delete().eq("id", deleteEvent.id);
      if (error) throw error;
      setEvents((prev) => prev.filter((e) => e.id !== deleteEvent.id));
      setDeleteEvent(null);
      toast.success("Event deleted");
    } catch (error) { toast.error(error.message); }
    finally { setDeleting(false); }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Manage events and track RSVPs" action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Event</Button>} />

      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events yet" description="Create events for your tenants" action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Event</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => {
            const past = isPast(new Date(ev.starts_at));
            const counts = rsvpCounts[ev.id] || { yes: 0, no: 0, maybe: 0 };
            return (
              <Card key={ev.id} className={past ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{ev.title}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ev)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteEvent(ev)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(ev.starts_at), "MMM d, yyyy h:mm a")}
                  </div>
                  {ev.location && <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{ev.location}</div>}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-3 w-3" />{counts.yes} attending{ev.capacity ? ` / ${ev.capacity} max` : ""}</div>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="outline">{ev.pgs?.name || "All PGs"}</Badge>
                    {past && <Badge variant="secondary">Past</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Event" : "Create Event"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start</Label><Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
              <div className="space-y-2"><Label>End</Label><Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Event location" /></div>
              <div className="space-y-2"><Label>Capacity</Label><Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Unlimited" /></div>
            </div>
            <div className="space-y-2">
              <Label>PG</Label>
              <Select value={pgId} onValueChange={setPgId}><SelectTrigger><SelectValue placeholder="All PGs" /></SelectTrigger><SelectContent><SelectItem value="">All PGs</SelectItem>{pgs.map((pg) => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={rsvpEnabled} onCheckedChange={setRsvpEnabled} /><Label>Enable RSVP</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={creating}>{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteEvent} onOpenChange={() => setDeleteEvent(null)} title="Delete Event" description="This event and all RSVPs will be permanently removed." confirmLabel="Delete" onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
