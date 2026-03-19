"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { BedDouble, Users, Building2, Percent } from "lucide-react";

const COLORS = ["#00C853", "#FF5252", "#FFAB00", "#007BFF"];
const STATUS_COLORS = { occupied: "#00C853", available: "#007BFF", maintenance: "#FFAB00" };

export default function OccupancyAnalyticsPage() {
  const { organization, currentPg, pgs } = useOrg();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, occupied: 0, available: 0, maintenance: 0 });
  const [pgChartData, setPgChartData] = useState([]);
  const [statusPieData, setStatusPieData] = useState([]);
  const [pgBreakdown, setPgBreakdown] = useState([]);

  useEffect(() => {
    if (!organization) return;

    async function load() {
      setLoading(true);

      let query = supabase
        .from("beds")
        .select("id, status, rooms(id, room_number, pgs(id, name))")
        .eq("rooms.pgs.organization_id", organization.id);

      if (currentPg) {
        query = query.eq("rooms.pgs.id", currentPg.id);
      }

      const { data: beds } = await query;

      // Filter out beds where the join didn't match (null pgs due to inner filter)
      const validBeds = (beds || []).filter((b) => b.rooms?.pgs);

      const total = validBeds.length;
      const occupied = validBeds.filter((b) => b.status === "occupied").length;
      const available = validBeds.filter((b) => b.status === "available").length;
      const maintenance = validBeds.filter((b) => b.status === "maintenance").length;

      setSummary({ total, occupied, available, maintenance });

      // Status pie chart
      setStatusPieData([
        { name: "Occupied", value: occupied },
        { name: "Available", value: available },
        { name: "Maintenance", value: maintenance },
      ].filter((d) => d.value > 0));

      // Group by PG
      const pgMap = {};
      validBeds.forEach((bed) => {
        const pgName = bed.rooms.pgs.name;
        const pgId = bed.rooms.pgs.id;
        if (!pgMap[pgId]) {
          pgMap[pgId] = { name: pgName, total: 0, occupied: 0, available: 0, maintenance: 0 };
        }
        pgMap[pgId].total += 1;
        if (bed.status === "occupied") pgMap[pgId].occupied += 1;
        else if (bed.status === "available") pgMap[pgId].available += 1;
        else if (bed.status === "maintenance") pgMap[pgId].maintenance += 1;
      });

      const pgList = Object.values(pgMap);
      setPgChartData(pgList.map((p) => ({ name: p.name, Occupied: p.occupied, Total: p.total })));
      setPgBreakdown(
        pgList.map((p) => ({
          ...p,
          occupancyRate: p.total > 0 ? ((p.occupied / p.total) * 100).toFixed(1) : "0.0",
        }))
      );

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

  const occupancyRate = summary.total > 0 ? ((summary.occupied / summary.total) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <PageHeader title="Occupancy Analytics" />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BedDouble className="h-4 w-4 text-blue-500" />
              Total Beds
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-green-500" />
              Occupied
            </div>
            <p className="mt-1 text-2xl font-bold text-green-600">{summary.occupied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 text-red-500" />
              Vacant
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">{summary.available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Percent className="h-4 w-4 text-purple-500" />
              Occupancy Rate
            </div>
            <p className="mt-1 text-2xl font-bold">{occupancyRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Occupancy by PG</CardTitle>
          </CardHeader>
          <CardContent>
            {pgChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pgChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="Occupied" fill="#00C853" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Total" fill="#E0E0E0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bed Status Distribution</CardTitle>
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
                        fill={
                          STATUS_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]
                        }
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

      {/* PG Breakdown Table */}
      {pgBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PG-wise Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PG Name</TableHead>
                  <TableHead className="text-right">Total Beds</TableHead>
                  <TableHead className="text-right">Occupied</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Maintenance</TableHead>
                  <TableHead className="text-right">Occupancy %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pgBreakdown.map((pg) => (
                  <TableRow key={pg.name}>
                    <TableCell className="font-medium">{pg.name}</TableCell>
                    <TableCell className="text-right">{pg.total}</TableCell>
                    <TableCell className="text-right text-green-600">{pg.occupied}</TableCell>
                    <TableCell className="text-right text-blue-600">{pg.available}</TableCell>
                    <TableCell className="text-right text-yellow-600">{pg.maintenance}</TableCell>
                    <TableCell className="text-right font-medium">{pg.occupancyRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
