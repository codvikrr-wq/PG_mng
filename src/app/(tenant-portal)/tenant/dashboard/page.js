"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BedDouble, FileText, MessageSquareWarning, CalendarOff,
  Megaphone, CreditCard, AlertCircle, Pin,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function TenantDashboardPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [tenant, setTenant] = useState(null);
  const [room, setRoom] = useState(null);
  const [bed, setBed] = useState(null);
  const [lease, setLease] = useState(null);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [activeComplaints, setActiveComplaints] = useState(0);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Get tenant record
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("*, rooms(name, room_type), beds(bed_number)")
        .eq("user_id", user.id)
        .single();

      if (!tenantData) return;
      setTenant(tenantData);
      setRoom(tenantData.rooms);
      setBed(tenantData.beds);

      // Active lease
      const { data: leaseData } = await supabase
        .from("leases")
        .select("end_date, rent_amount")
        .eq("tenant_id", tenantData.id)
        .eq("status", "active")
        .maybeSingle();
      setLease(leaseData);

      // Pending invoices
      const { count: invoiceCount } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantData.id)
        .in("status", ["sent", "partial", "overdue"]);
      setPendingInvoices(invoiceCount || 0);

      // Active complaints
      const { count: complaintCount } = await supabase
        .from("complaints")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantData.id)
        .in("status", ["open", "assigned", "in_progress"]);
      setActiveComplaints(complaintCount || 0);

      // Recent notices
      const { data: noticeData } = await supabase
        .from("notices")
        .select("*")
        .or(`pg_id.eq.${tenantData.pg_id},pg_id.is.null`)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      setNotices(noticeData || []);
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
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {tenant?.first_name || "Tenant"}
        </h1>
        <p className="text-muted-foreground">
          Here is your dashboard overview
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Room / Bed</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {room?.name || "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {room?.room_type} {bed ? `/ Bed ${bed.bed_number}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lease</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize">
              {tenant?.status || "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {lease?.end_date
                ? `Ends ${format(new Date(lease.end_date), "MMM d, yyyy")}`
                : "No lease date"}
              {lease?.rent_amount ? ` · ₹${Number(lease.rent_amount).toLocaleString("en-IN")}/mo` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {pendingInvoices > 0 ? "Action needed" : "All clear"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Complaints</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{activeComplaints}</div>
            <p className="text-xs text-muted-foreground">
              {activeComplaints > 0 ? "In progress" : "None open"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/tenant/invoices">
            <CreditCard className="mr-2 h-4 w-4" />
            Pay Invoice
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tenant/complaints">
            <MessageSquareWarning className="mr-2 h-4 w-4" />
            Report Issue
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tenant/absences">
            <CalendarOff className="mr-2 h-4 w-4" />
            Mark Absence
          </Link>
        </Button>
      </div>

      {/* Recent Notices */}
      <div>
        <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Recent Notices
        </h2>
        {notices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notices</p>
        ) : (
          <div className="space-y-3">
            {notices.map((n) => (
              <Card key={n.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {n.pinned && <Pin className="h-3 w-3 text-primary" />}
                        <h3 className="font-medium truncate">{n.title}</h3>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tenant/notices">View all notices</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
