"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/user-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CalendarDays, MapPin, Clock, Users, Check, X, HelpCircle,
} from "lucide-react";
import { format } from "date-fns";

const rsvpConfig = {
  yes: { label: "Going", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: Check },
  no: { label: "Not Going", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: X },
  maybe: { label: "Maybe", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: HelpCircle },
};

export default function TenantEventsPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [tenant, setTenant] = useState(null);
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, pg_id")
        .eq("user_id", user.id)
        .single();

      if (!tenantData) return;
      setTenant(tenantData);

      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("pg_id", tenantData.pg_id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });

      setEvents(eventData || []);

      // Load RSVPs
      if (eventData && eventData.length > 0) {
        const eventIds = eventData.map((e) => e.id);
        const { data: rsvpData } = await supabase
          .from("event_rsvps")
          .select("event_id, status")
          .eq("tenant_id", tenantData.id)
          .in("event_id", eventIds);

        const rsvpMap = {};
        (rsvpData || []).forEach((r) => {
          rsvpMap[r.event_id] = r.status;
        });
        setRsvps(rsvpMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRsvp(eventId, status) {
    setSubmitting(eventId);
    try {
      const { error } = await supabase
        .from("event_rsvps")
        .upsert(
          {
            event_id: eventId,
            tenant_id: tenant.id,
            status,
          },
          { onConflict: "event_id,tenant_id" }
        );

      if (error) throw error;
      setRsvps((prev) => ({ ...prev, [eventId]: status }));
      toast.success(`RSVP updated: ${rsvpConfig[status].label}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(null);
    }
  }

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-muted-foreground">Upcoming events at your PG</p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((e) => {
            const currentRsvp = rsvps[e.id];
            return (
              <Card key={e.id}>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{e.title}</h3>
                    {e.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {e.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(e.starts_at), "MMM d, yyyy")}
                      {` at ${format(new Date(e.starts_at), "h:mm a")}`}
                    </span>
                    {e.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {e.location}
                      </span>
                    )}
                    {e.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Capacity: {e.capacity}
                      </span>
                    )}
                  </div>

                  {/* RSVP */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-sm font-medium mr-1">RSVP:</span>
                    {["yes", "no", "maybe"].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={currentRsvp === status ? "default" : "outline"}
                        disabled={submitting === e.id}
                        onClick={() => handleRsvp(e.id, status)}
                        className="gap-1"
                      >
                        {status === "yes" && <Check className="h-3 w-3" />}
                        {status === "no" && <X className="h-3 w-3" />}
                        {status === "maybe" && <HelpCircle className="h-3 w-3" />}
                        {rsvpConfig[status].label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
