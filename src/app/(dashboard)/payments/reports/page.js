"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "recharts";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Percent,
  Download,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  differenceInDays,
} from "date-fns";

const COLORS = ["#00C853", "#FF5252", "#FFAB00", "#007BFF"];

export default function FinanceReportsPage() {
  const { organization } = useOrg();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("this_month");
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, collected: 0, expected: 0 });
  const [aging, setAging] = useState([]);
  const [overdueList, setOverdueList] = useState([]);

  useEffect(() => {
    if (!organization) return;

    async function load() {
      setLoading(true);
      const now = new Date();
      let start, end;

      switch (range) {
        case "last_month":
          start = startOfMonth(subMonths(now, 1));
          end = endOfMonth(subMonths(now, 1));
          break;
        case "last_3":
          start = startOfMonth(subMonths(now, 2));
          end = endOfMonth(now);
          break;
        default:
          start = startOfMonth(now);
          end = endOfMonth(now);
      }

      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      // Revenue from payments
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("organization_id", organization.id)
        .eq("status", "completed")
        .gte("created_at", startStr)
        .lte("created_at", endStr);

      const revenue = (payments || []).reduce((s, p) => s + Number(p.amount), 0);

      // Expenses
      const { data: expData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("organization_id", organization.id)
        .gte("date", startStr)
        .lte("date", endStr);

      const expenseTotal = (expData || []).reduce((s, e) => s + Number(e.amount), 0);

      // Invoices for collection rate
      const { data: invData } = await supabase
        .from("invoices")
        .select("total_amount, status")
        .eq("organization_id", organization.id)
        .gte("created_at", startStr)
        .lte("created_at", endStr);

      const expected = (invData || []).reduce((s, i) => s + Number(i.total_amount), 0);
      const collected = (invData || []).filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0);

      setStats({ revenue, expenses: expenseTotal, collected, expected });

      // AR aging
      const { data: overdueInv } = await supabase
        .from("invoices")
        .select("*, tenants(first_name, last_name)")
        .eq("organization_id", organization.id)
        .in("status", ["sent", "partial", "overdue"])
        .order("due_date");

      const agingBuckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
      const overdueItems = [];

      (overdueInv || []).forEach((inv) => {
        if (!inv.due_date) return;
        const days = differenceInDays(now, new Date(inv.due_date));
        if (days <= 0) return;
        const amt = Number(inv.total_amount);
        if (days <= 30) agingBuckets["0-30"] += amt;
        else if (days <= 60) agingBuckets["31-60"] += amt;
        else if (days <= 90) agingBuckets["61-90"] += amt;
        else agingBuckets["90+"] += amt;
        overdueItems.push({ ...inv, days_overdue: days });
      });

      setAging(
        Object.entries(agingBuckets).map(([name, value]) => ({ name, value }))
      );
      setOverdueList(overdueItems.sort((a, b) => b.days_overdue - a.days_overdue).slice(0, 5));
      setLoading(false);
    }

    load();
  }, [organization, range]);

  function exportCSV() {
    const rows = [["Metric", "Value"]];
    rows.push(["Total Revenue", stats.revenue]);
    rows.push(["Total Expenses", stats.expenses]);
    rows.push(["Net", stats.revenue - stats.expenses]);
    rows.push(["Collection Rate %", stats.expected > 0 ? ((stats.collected / stats.expected) * 100).toFixed(1) : 0]);

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-report-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  const collectionRate = stats.expected > 0 ? ((stats.collected / stats.expected) * 100).toFixed(1) : 0;
  const net = stats.revenue - stats.expenses;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Reports"
        action={
          <div className="flex gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-green-500" />Revenue</div>
            <p className="mt-1 text-2xl font-bold">₹{stats.revenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="h-4 w-4 text-red-500" />Expenses</div>
            <p className="mt-1 text-2xl font-bold">₹{stats.expenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><IndianRupee className="h-4 w-4 text-blue-500" />Net</div>
            <p className={`mt-1 text-2xl font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>₹{net.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Percent className="h-4 w-4 text-purple-500" />Collection Rate</div>
            <p className="mt-1 text-2xl font-bold">{collectionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">AR Aging</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={aging}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Bar dataKey="value" fill="#FF5252" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={[{ name: "Revenue", value: stats.revenue }, { name: "Expenses", value: stats.expenses }]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}>
                  <Cell fill="#00C853" />
                  <Cell fill="#FF5252" />
                </Pie>
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Overdue tenants */}
      {overdueList.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top Overdue Tenants</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueList.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.tenants?.first_name} {inv.tenants?.last_name}</TableCell>
                    <TableCell>{inv.invoice_number}</TableCell>
                    <TableCell>₹{Number(inv.total_amount).toLocaleString()}</TableCell>
                    <TableCell><span className="text-red-600 font-medium">{inv.days_overdue} days</span></TableCell>
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
