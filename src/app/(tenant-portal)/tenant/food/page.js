"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UtensilsCrossed, Coffee, Sun, Moon, Cookie } from "lucide-react";
import { format, addDays } from "date-fns";
import { MEAL_TYPES } from "@/lib/constants";

const mealIcons = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

export default function TenantFoodPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [tenant, setTenant] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [todayMenu, setTodayMenu] = useState([]);
  const [mealOrders, setMealOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, pg_id, organization_id")
        .eq("user_id", user.id)
        .single();

      if (!tenantData) return;
      setTenant(tenantData);

      // Load meal plan
      const { data: planData } = await supabase
        .from("tenant_meal_plans")
        .select("*, meal_plans(*)")
        .eq("tenant_id", tenantData.id)
        .eq("status", "active")
        .maybeSingle();

      setMealPlan(planData?.meal_plans || null);

      // Load today's menu
      const { data: menuData } = await supabase
        .from("menus")
        .select("*")
        .eq("pg_id", tenantData.pg_id)
        .eq("date", today);

      setTodayMenu(menuData || []);

      // Load meal orders for today and tomorrow
      const { data: orderData } = await supabase
        .from("meal_orders")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .in("date", [today, tomorrow]);

      const orderMap = {};
      (orderData || []).forEach((o) => {
        orderMap[`${o.date}_${o.meal_type}`] = o;
      });
      setMealOrders(orderMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleMealOrder(date, mealType, optIn) {
    const key = `${date}_${mealType}`;
    setToggling(key);
    try {
      const existing = mealOrders[key];
      const newStatus = optIn ? "confirmed" : "cancelled";
      if (existing) {
        const { error } = await supabase
          .from("meal_orders")
          .update({ status: newStatus })
          .eq("id", existing.id);
        if (error) throw error;
        setMealOrders((prev) => ({
          ...prev,
          [key]: { ...existing, status: newStatus },
        }));
      } else {
        const { data, error } = await supabase
          .from("meal_orders")
          .insert({
            tenant_id: tenant.id,
            pg_id: tenant.pg_id,
            organization_id: tenant.organization_id,
            date,
            meal_type: mealType,
            quantity: 1,
            status: newStatus,
          })
          .select()
          .single();
        if (error) throw error;
        setMealOrders((prev) => ({ ...prev, [key]: data }));
      }
      toast.success(optIn ? "Opted in" : "Opted out");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setToggling(null);
    }
  }

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Food & Meals</h1>
        <p className="text-muted-foreground">Your meal plan and menu</p>
      </div>

      {/* Meal Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Meal Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {mealPlan ? (
            <div>
              <p className="font-medium">{mealPlan.name}</p>
              {mealPlan.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {mealPlan.description}
                </p>
              )}
              {mealPlan.price && (
                <p className="text-sm font-medium mt-2">
                  Price: {Number(mealPlan.price).toLocaleString("en-IN")}/month
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UtensilsCrossed className="h-5 w-5" />
              <span className="text-sm">No meal plan assigned</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Menu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Today&apos;s Menu — {format(new Date(), "EEEE, MMM d")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayMenu.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No menu posted for today
            </p>
          ) : (
            <div className="space-y-3">
              {todayMenu.map((m) => {
                const Icon = mealIcons[m.meal_type] || UtensilsCrossed;
                return (
                  <div key={m.id} className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {m.meal_type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {m.items || m.description || "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meal Opt-in/out for upcoming */}
      {mealPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meal Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { date: today, label: `Today (${format(new Date(), "MMM d")})` },
              { date: tomorrow, label: `Tomorrow (${format(addDays(new Date(), 1), "MMM d")})` },
            ].map(({ date, label }) => (
              <div key={date}>
                <p className="text-sm font-medium mb-2">{label}</p>
                <div className="grid grid-cols-2 gap-3">
                  {MEAL_TYPES.map((type) => {
                    const key = `${date}_${type}`;
                    const order = mealOrders[key];
                    const isOptedIn = order ? order.status === "confirmed" : true;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <Label className="capitalize text-sm">{type}</Label>
                        <Switch
                          checked={isOptedIn}
                          disabled={toggling === key}
                          onCheckedChange={(checked) =>
                            toggleMealOrder(date, type, checked)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
                <Separator className="mt-4" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
