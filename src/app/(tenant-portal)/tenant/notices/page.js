"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/user-context";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Pin } from "lucide-react";
import { format } from "date-fns";

export default function TenantNoticesPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, pg_id")
        .eq("user_id", user.id)
        .single();

      if (!tenantData) return;

      const { data } = await supabase
        .from("notices")
        .select("*, users(first_name, last_name)")
        .or(`pg_id.eq.${tenantData.pg_id},pg_id.is.null`)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      setNotices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notices</h1>
        <p className="text-muted-foreground">
          Announcements from your PG management
        </p>
      </div>

      {notices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No notices at the moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id} className={n.is_pinned ? "border-primary/50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  {n.is_pinned && (
                    <Pin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium">{n.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(n.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {n.body}
                    </p>
                    {n.users && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        — {n.users.first_name} {n.users.last_name}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
