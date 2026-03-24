"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/user-context";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users, IndianRupee, MessageSquareWarning, BedDouble,
  UserPlus, CreditCard, Receipt, FileWarning,
} from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth } from "date-fns";

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div
            className="rounded-lg p-2.5"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ href, icon: Icon, label }) {
  return (
    <Link href={href}>
      <Button
        variant="outline"
        className="flex h-auto flex-col gap-2 p-4 hover:border-primary hover:-translate-y-0.5 transition-all"
      >
        <Icon className="h-5 w-5" />
        <span className="text-xs">{label}</span>
      </Button>
    </Link>
  );
}

export default function DashboardPage() {
  const { profile, loading: userLoading } = useUser();
  const { organization, currentPg, loading: orgLoading } = useOrg();
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [stats, setStats] = useState({ activeTenants: 0, collectedMonth: 0, pendingAmount: 0, openComplaints: 0, vacantBeds: 0, totalBeds: 0 });
  const [recentPayments, setRecentPayments] = useState([]);
  const [upcomingLeaseEnds, setUpcomingLeaseEnds] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!organization) return;
    setStatsLoading(true);
    try {
      const pgId = currentPg?.id;
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");
      const thirtyDaysLater = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

      // Build all queries
      let tenantQ = supabase.from("tenants").select("*", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "active");
      let paymentQ = supabase.from("payments").select("amount").eq("organization_id", organization.id).gte("payment_date", monthStart).lte("payment_date", monthEnd);
      let invoiceQ = supabase.from("invoices").select("total_amount").eq("organization_id", organization.id).in("status", ["sent", "partial", "overdue"]);
      let complaintQ = supabase.from("complaints").select("*", { count: "exact", head: true }).eq("organization_id", organization.id).in("status", ["open", "assigned", "in_progress"]);
      let bedQ = supabase.from("beds").select("status").eq("organization_id", organization.id);
      let recentPmtQ = supabase.from("payments").select("id, amount, payment_date, method, created_at, tenants(first_name, last_name)").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(5);
      let leaseQ = supabase.from("leases").select("id, end_date, tenants(id, first_name, last_name), rooms(name)").eq("organization_id", organization.id).eq("status", "active").gte("end_date", today).lte("end_date", thirtyDaysLater).order("end_date").limit(5);

      // Apply PG filter if set
      if (pgId) {
        tenantQ = tenantQ.eq("pg_id", pgId);
        paymentQ = paymentQ.eq("pg_id", pgId);
        invoiceQ = invoiceQ.eq("pg_id", pgId);
        complaintQ = complaintQ.eq("pg_id", pgId);
        bedQ = bedQ.eq("pg_id", pgId);
        recentPmtQ = recentPmtQ.eq("pg_id", pgId);
        leaseQ = leaseQ.eq("pg_id", pgId);
      }

      // Fire all queries in parallel
      const [
        { count: activeTenants },
        { data: payments },
        { data: pendingInvoices },
        { count: openComplaints },
        { data: beds },
        { data: recentPmtData },
        { data: leaseData },
      ] = await Promise.all([tenantQ, paymentQ, invoiceQ, complaintQ, bedQ, recentPmtQ, leaseQ]);

      const collectedMonth = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingAmount = (pendingInvoices || []).reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const validBeds = beds || [];
      const totalBeds = validBeds.length;
      const vacantBeds = validBeds.filter((b) => b.status === "available").length;

      setStats({ activeTenants: activeTenants || 0, collectedMonth, pendingAmount, openComplaints: openComplaints || 0, vacantBeds, totalBeds });
      setRecentPayments(recentPmtData || []);
      setUpcomingLeaseEnds(leaseData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  }, [organization, currentPg]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const loading = userLoading || orgLoading;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${profile?.first_name || "there"}!`}
        description="Here's how your business is doing today"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <StatCard
              title="Active Tenants"
              value={stats.activeTenants}
              subtitle={`${stats.vacantBeds} vacant bed${stats.vacantBeds !== 1 ? "s" : ""}`}
              icon={Users}
              color="#007BFF"
            />
            <StatCard
              title="Collected This Month"
              value={`₹${stats.collectedMonth.toLocaleString("en-IN")}`}
              subtitle={stats.pendingAmount > 0 ? `₹${stats.pendingAmount.toLocaleString("en-IN")} pending` : "No pending dues"}
              icon={IndianRupee}
              color="#00C853"
            />
            <StatCard
              title="Open Complaints"
              value={stats.openComplaints}
              subtitle={stats.openComplaints > 0 ? "Needs attention" : "All caught up!"}
              icon={MessageSquareWarning}
              color="#FF5252"
            />
            <StatCard
              title="Vacant Beds"
              value={stats.vacantBeds}
              subtitle={`${stats.totalBeds} total beds`}
              icon={BedDouble}
              color="#FFAB00"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <QuickAction href="/tenants/new" icon={UserPlus} label="Add Tenant" />
          <QuickAction href="/payments/records" icon={CreditCard} label="Record Payment" />
          <QuickAction href="/payments/expenses" icon={Receipt} label="Add Expense" />
          <QuickAction href="/complaints" icon={FileWarning} label="Log Complaint" />
        </div>
      </div>

      {/* Recent Payments & Upcoming Lease Ends */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.payment_date || p.created_at), "MMM d, yyyy")} · {p.method || "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      ₹{(p.amount || 0).toLocaleString("en-IN")}
                    </Badge>
                  </div>
                ))}
                <Button variant="ghost" size="sm" asChild className="mt-1 w-full">
                  <Link href="/payments/records">View all payments</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Lease Ends (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : upcomingLeaseEnds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leases ending in the next 30 days.</p>
            ) : (
              <div className="space-y-3">
                {upcomingLeaseEnds.map((l) => (
                  <div key={l.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">{l.rooms?.name || "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      {format(new Date(l.end_date), "MMM d")}
                    </Badge>
                  </div>
                ))}
                <Button variant="ghost" size="sm" asChild className="mt-1 w-full">
                  <Link href="/tenants">View all tenants</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
