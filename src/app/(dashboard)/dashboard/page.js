"use client";

import { useUser } from "@/context/user-context";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, IndianRupee, MessageSquareWarning, BedDouble,
  UserPlus, CreditCard, Receipt, FileWarning,
} from "lucide-react";
import Link from "next/link";

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
  const { organization, loading: orgLoading } = useOrg();

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
        <StatCard
          title="Active Tenants"
          value="0"
          subtitle="0 moving out soon"
          icon={Users}
          color="#007BFF"
        />
        <StatCard
          title="Collected This Month"
          value="₹0"
          subtitle="₹0 pending"
          icon={IndianRupee}
          color="#00C853"
        />
        <StatCard
          title="Open Complaints"
          value="0"
          subtitle="All caught up!"
          icon={MessageSquareWarning}
          color="#FF5252"
        />
        <StatCard
          title="Vacant Beds"
          value="0"
          subtitle="0 total beds"
          icon={BedDouble}
          color="#FFAB00"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <QuickAction href="/tenants" icon={UserPlus} label="Add Tenant" />
          <QuickAction href="/payments/records" icon={CreditCard} label="Record Payment" />
          <QuickAction href="/payments/expenses" icon={Receipt} label="Add Expense" />
          <QuickAction href="/complaints" icon={FileWarning} label="Log Complaint" />
        </div>
      </div>

      {/* Placeholder sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent activity yet. Start by adding your first PG and tenants.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No upcoming events. Create events from the Events module.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
