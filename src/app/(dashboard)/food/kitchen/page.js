"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ChefHat, Loader2, CheckCircle2, XCircle, UtensilsCrossed, Users, ChevronLeft, ChevronRight,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { MEAL_TYPES } from "@/lib/constants";

const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snacks", dinner: "Dinner" };
const STATUS_COLORS = { confirmed: "default", cancelled: "destructive", delivered: "secondary" };

export default function KitchenPage() {
  const { organization, currentPg } = useOrg();
  const supabase = createClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealFilter, setMealFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const loadOrders = useCallback(async () => {
    if (!organization || !currentPg) return;
    setLoading(true);
    try {
      let query = supabase
        .from("meal_orders")
        .select("*, tenants(first_name, last_name, rooms(name))")
        .eq("organization_id", organization.id)
        .eq("pg_id", currentPg.id)
        .eq("date", dateStr)
        .order("meal_type")
        .order("status");

      if (mealFilter !== "all") {
        query = query.eq("meal_type", mealFilter);
      }

      const { data } = await query;
      setOrders(data || []);
      setSelectedOrders([]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [organization, currentPg, dateStr, mealFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const summaryByMeal = MEAL_TYPES.reduce((acc, mt) => {
    const mealOrders = orders.filter((o) => o.meal_type === mt);
    acc[mt] = {
      total: mealOrders.length,
      confirmed: mealOrders.filter((o) => o.status === "confirmed").length,
      delivered: mealOrders.filter((o) => o.status === "delivered").length,
      cancelled: mealOrders.filter((o) => o.status === "cancelled").length,
    };
    return acc;
  }, {});

  const filteredOrders = mealFilter === "all" ? orders : orders.filter((o) => o.meal_type === mealFilter);
  const pendingOrders = filteredOrders.filter((o) => o.status === "confirmed");

  function toggleOrderSelection(orderId) {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  }

  function toggleSelectAll() {
    if (selectedOrders.length === pendingOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map((o) => o.id));
    }
  }

  async function bulkMarkDelivered() {
    if (selectedOrders.length === 0) { toast.error("No orders selected"); return; }
    setMarkingDelivered(true);
    try {
      const { error } = await supabase
        .from("meal_orders")
        .update({ status: "delivered" })
        .in("id", selectedOrders);
      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => selectedOrders.includes(o.id) ? { ...o, status: "delivered" } : o)
      );
      setSelectedOrders([]);
      toast.success(`${selectedOrders.length} order(s) marked as delivered`);
    } catch (error) { toast.error(error.message); }
    finally { setMarkingDelivered(false); }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><div className="grid gap-4 grid-cols-2 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Kitchen Dashboard" description="Today's meal orders and delivery status" />

      {/* Date navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => subDays(d, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateStr}
            onChange={(e) => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">{format(selectedDate, "EEEE, MMM d")}</span>
        </div>
        <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Today</Button>
      </div>

      {!currentPg ? (
        <EmptyState icon={ChefHat} title="Select a PG" description="Choose a PG from the sidebar to view kitchen orders" />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {MEAL_TYPES.map((mt) => {
              const s = summaryByMeal[mt];
              return (
                <Card key={mt} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setMealFilter(mealFilter === mt ? "all" : mt)}>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground capitalize">{MEAL_LABELS[mt]}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-2xl font-bold">{s.total}</div>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-green-600">{s.confirmed} pending</span>
                      <span className="text-blue-600">{s.delivered} delivered</span>
                      <span className="text-red-600">{s.cancelled} cancelled</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters and bulk action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Select value={mealFilter} onValueChange={setMealFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Meals</SelectItem>
                  {MEAL_TYPES.map((mt) => (
                    <SelectItem key={mt} value={mt} className="capitalize">{MEAL_LABELS[mt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{filteredOrders.length} order(s)</span>
            </div>
            {pendingOrders.length > 0 && (
              <Button onClick={bulkMarkDelivered} disabled={markingDelivered || selectedOrders.length === 0}>
                {markingDelivered ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Mark Delivered ({selectedOrders.length})
              </Button>
            )}
          </div>

          {/* Orders table */}
          {filteredOrders.length === 0 ? (
            <EmptyState icon={UtensilsCrossed} title="No orders" description={`No meal orders for ${format(selectedDate, "MMM d, yyyy")}`} />
          ) : (
            <Card>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      {pendingOrders.length > 0 && (
                        <Checkbox
                          checked={selectedOrders.length === pendingOrders.length && pendingOrders.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      )}
                    </TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Meal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className={order.status === "cancelled" ? "opacity-50" : ""}>
                      <TableCell>
                        {order.status === "confirmed" && (
                          <Checkbox
                            checked={selectedOrders.includes(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{order.tenants ? `${order.tenants.first_name} ${order.tenants.last_name}` : "Unknown"}</TableCell>
                      <TableCell>{order.tenants?.rooms?.name || "-"}</TableCell>
                      <TableCell className="capitalize">{MEAL_LABELS[order.meal_type] || order.meal_type}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[order.status] || "outline"} className="capitalize">
                          {order.status === "delivered" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {order.status === "cancelled" && <XCircle className="mr-1 h-3 w-3" />}
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </Card>
          )}

          {/* Opt-out summary */}
          {filteredOrders.some((o) => o.status === "cancelled") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Opted Out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {filteredOrders
                    .filter((o) => o.status === "cancelled")
                    .map((o) => (
                      <Badge key={o.id} variant="outline">
                        {o.tenants ? `${o.tenants.first_name} ${o.tenants.last_name}` : "Unknown"}
                        <span className="ml-1 text-muted-foreground capitalize">({MEAL_LABELS[o.meal_type]})</span>
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
