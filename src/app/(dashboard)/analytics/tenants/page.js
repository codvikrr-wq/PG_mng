"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Users, UserCheck, UserX, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const COLORS = ["#00C853", "#FF5252", "#FFAB00", "#007BFF", "#9C27B0"];
const STATUS_COLORS = {
  active: "#00C853",
  prospective: "#007BFF",
  on_leave: "#FFAB00",
  vacated: "#FF5252",
  blacklisted: "#9C27B0",
};

export default function TenantAnalyticsPage() {
  const { organization, currentPg, pgs } = useOrg();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, active: 0, vacated: 0, avgStay: 0 });
  const [pgChartData, setPgChartData] = useState([]);
  const [statusPieData, setStatusPieData] = useState([]);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [recentCheckOuts, setRecentCheckOuts] = useState([]);

  useEffect(() => {
    if (!organization) return;

    async function load() {
      setLoading(true);

      let query = supabase
        .from("tenants")
        .select("id, first_name, last_name, status, move_in_date, move_out_date, pg_id, pgs(id, name)")
        .eq("organization_id", organization.id);

      if (currentPg) {
        query = query.eq("pg_id", currentPg.id);
      }

      const { data: tenants } = await query;
      const all = tenants || [];

      const total = all.length;
      const active = all.filter((t) => t.status === "active").length;
      const vacated = all.filter((t) => t.status === "vacated").length;

      // Average stay duration for tenants who have both move_in_date and move_out_date
      const stayDurations = all
        .filter((t) => t.move_in_date && t.move_out_date)
        .map((t) => differenceInDays(new Date(t.move_out_date), new Date(t.move_in_date)));

      const avgStay = stayDurations.length > 0
        ? Math.round(stayDurations.reduce((s, d) => s + d, 0) / stayDurations.length)
        : 0;

      setSummary({ total, active, vacated, avgStay });

      // Status distribution for pie chart
      const statusMap = {};
      all.forEach((t) => {
        const st = t.status || "unknown";
        statusMap[st] = (statusMap[st] || 0) + 1;
      });
      setStatusPieData(
        Object.entries(statusMap)
          .map(([name, value]) => ({ name: name.replace("_", " "), value, key: name }))
          .filter((d) => d.value > 0)
      );

      // Group by PG
      const pgMap = {};
      all.forEach((t) => {
        const pgName = t.pgs?.name || "Unknown";
        pgMap[pgName] = (pgMap[pgName] || 0) + 1;
      });
      setPgChartData(
        Object.entries(pgMap).map(([name, count]) => ({ name, count }))
      );

      // Recent check-ins (sorted by move_in_date desc)
      const checkIns = [...all]
        .filter((t) => t.move_in_date)
        .sort((a, b) => new Date(b.move_in_date) - new Date(a.move_in_date))
        .slice(0, 10);
      setRecentCheckIns(checkIns);

      // Recent check-outs (sorted by move_out_date desc)
      const checkOuts = [...all]
        .filter((t) => t.move_out_date)
        .sort((a, b) => new Date(b.move_out_date) - new Date(a.move_out_date))
        .slice(0, 10);
      setRecentCheckOuts(checkOuts);

      setLoading(false);
    }

    load();
  }, [organization, currentPg]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tenant Analytics" />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-blue-500" />
              Total Tenants
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="h-4 w-4 text-green-500" />
              Active
            </div>
            <p className="mt-1 text-2xl font-bold text-green-600">{summary.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserX className="h-4 w-4 text-red-500" />
              Vacated
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">{summary.vacated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-purple-500" />
              Avg Stay
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.avgStay} days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenants by PG</CardTitle>
          </CardHeader>
          <CardContent>
            {pgChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pgChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#007BFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenant Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.key] || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCheckIns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>PG</TableHead>
                  <TableHead>Move-in Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCheckIns.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.first_name} {t.last_name}
                    </TableCell>
                    <TableCell>{t.pgs?.name || "-"}</TableCell>
                    <TableCell>{format(new Date(t.move_in_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "active" ? "default" : "secondary"}>
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent check-ins</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Check-outs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Check-outs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCheckOuts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>PG</TableHead>
                  <TableHead>Move-out Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCheckOuts.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.first_name} {t.last_name}
                    </TableCell>
                    <TableCell>{t.pgs?.name || "-"}</TableCell>
                    <TableCell>{format(new Date(t.move_out_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "vacated" ? "destructive" : "secondary"}>
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent check-outs</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
