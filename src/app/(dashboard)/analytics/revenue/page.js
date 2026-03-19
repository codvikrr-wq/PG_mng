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
  LineChart,
  Line,
  Legend,
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
  startOfYear,
  endOfYear,
  format,
  eachMonthOfInterval,
} from "date-fns";

const COLORS = ["#00C853", "#FF5252", "#FFAB00", "#007BFF", "#9C27B0", "#FF6F00", "#00BCD4", "#795548"];

export default function RevenueAnalyticsPage() {
  const { organization, currentPg, pgs } = useOrg();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("this_month");
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, netProfit: 0, growth: 0 });
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [revenueByPg, setRevenueByPg] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);

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
        case "last_6":
          start = startOfMonth(subMonths(now, 5));
          end = endOfMonth(now);
          break;
        case "this_year":
          start = startOfYear(now);
          end = endOfYear(now);
          break;
        default:
          start = startOfMonth(now);
          end = endOfMonth(now);
      }

      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      // Revenue from payments
      let paymentsQuery = supabase
        .from("payments")
        .select("amount, created_at, pg_id, pgs(name)")
        .eq("organization_id", organization.id)
        .eq("status", "completed")
        .gte("created_at", startStr)
        .lte("created_at", endStr);

      if (currentPg) {
        paymentsQuery = paymentsQuery.eq("pg_id", currentPg.id);
      }

      const { data: payments } = await paymentsQuery;

      const totalRevenue = (payments || []).reduce((s, p) => s + Number(p.amount), 0);

      // Expenses
      let expQuery = supabase
        .from("expenses")
        .select("amount, category, date, pg_id")
        .eq("organization_id", organization.id)
        .gte("date", startStr)
        .lte("date", endStr);

      if (currentPg) {
        expQuery = expQuery.eq("pg_id", currentPg.id);
      }

      const { data: expenses } = await expQuery;

      const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
      const netProfit = totalRevenue - totalExpenses;

      // Month-over-month growth: compare current period revenue to prior period
      const periodDuration = end.getTime() - start.getTime();
      const priorStart = new Date(start.getTime() - periodDuration);
      const priorStartStr = format(priorStart, "yyyy-MM-dd");
      const priorEndStr = format(new Date(start.getTime() - 1), "yyyy-MM-dd");

      let priorQuery = supabase
        .from("payments")
        .select("amount")
        .eq("organization_id", organization.id)
        .eq("status", "completed")
        .gte("created_at", priorStartStr)
        .lte("created_at", priorEndStr);

      if (currentPg) {
        priorQuery = priorQuery.eq("pg_id", currentPg.id);
      }

      const { data: priorPayments } = await priorQuery;
      const priorRevenue = (priorPayments || []).reduce((s, p) => s + Number(p.amount), 0);
      const growth = priorRevenue > 0 ? (((totalRevenue - priorRevenue) / priorRevenue) * 100) : 0;

      setSummary({ revenue: totalRevenue, expenses: totalExpenses, netProfit, growth: Number(growth.toFixed(1)) });

      // Monthly revenue trend
      const months = eachMonthOfInterval({ start, end });
      const monthlyData = months.map((m) => {
        const mKey = format(m, "yyyy-MM");
        const mLabel = format(m, "MMM yyyy");
        const mRevenue = (payments || [])
          .filter((p) => format(new Date(p.created_at), "yyyy-MM") === mKey)
          .reduce((s, p) => s + Number(p.amount), 0);
        const mExpenses = (expenses || [])
          .filter((e) => format(new Date(e.date), "yyyy-MM") === mKey)
          .reduce((s, e) => s + Number(e.amount), 0);
        return { month: mLabel, Revenue: mRevenue, Expenses: mExpenses };
      });
      setMonthlyTrend(monthlyData);

      // Revenue by PG
      const pgRevenueMap = {};
      (payments || []).forEach((p) => {
        const pgName = p.pgs?.name || "Unknown";
        pgRevenueMap[pgName] = (pgRevenueMap[pgName] || 0) + Number(p.amount);
      });
      setRevenueByPg(
        Object.entries(pgRevenueMap).map(([name, value]) => ({ name, value }))
      );

      // Expense breakdown by category
      const catMap = {};
      (expenses || []).forEach((e) => {
        const cat = e.category || "Other";
        catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
      });
      setExpenseBreakdown(
        Object.entries(catMap).map(([name, value]) => ({ name, value }))
      );

      setLoading(false);
    }

    load();
  }, [organization, currentPg, range]);

  function exportCSV() {
    const rows = [["Metric", "Value"]];
    rows.push(["Total Revenue", summary.revenue]);
    rows.push(["Total Expenses", summary.expenses]);
    rows.push(["Net Profit", summary.netProfit]);
    rows.push(["MoM Growth %", summary.growth]);
    rows.push([]);
    rows.push(["Month", "Revenue", "Expenses"]);
    monthlyTrend.forEach((m) => rows.push([m.month, m.Revenue, m.Expenses]));
    rows.push([]);
    rows.push(["PG", "Revenue"]);
    revenueByPg.forEach((p) => rows.push([p.name, p.value]));
    rows.push([]);
    rows.push(["Expense Category", "Amount"]);
    expenseBreakdown.forEach((e) => rows.push([e.name, e.value]));

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-report-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
      <PageHeader
        title="Revenue Analytics"
        action={
          <div className="flex gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3">Last 3 Months</SelectItem>
                <SelectItem value="last_6">Last 6 Months</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Revenue
            </div>
            <p className="mt-1 text-2xl font-bold">
              {"\u20B9"}{summary.revenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Total Expenses
            </div>
            <p className="mt-1 text-2xl font-bold">
              {"\u20B9"}{summary.expenses.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IndianRupee className="h-4 w-4 text-blue-500" />
              Net Profit
            </div>
            <p className={`mt-1 text-2xl font-bold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {"\u20B9"}{summary.netProfit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Percent className="h-4 w-4 text-purple-500" />
              MoM Growth
            </div>
            <p className={`mt-1 text-2xl font-bold ${summary.growth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {summary.growth > 0 ? "+" : ""}{summary.growth}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart - Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v) => `\u20B9${Number(v).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="Revenue" stroke="#00C853" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Expenses" stroke="#FF5252" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Bar + Pie Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by PG</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByPg.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueByPg}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v) => `\u20B9${Number(v).toLocaleString()}`} />
                  <Bar dataKey="value" fill="#007BFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: \u20B9${value.toLocaleString()}`}
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `\u20B9${Number(v).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
