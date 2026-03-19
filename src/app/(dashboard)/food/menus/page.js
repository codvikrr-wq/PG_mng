"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { useUser } from "@/context/user-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  UtensilsCrossed, Loader2, ChevronLeft, ChevronRight, Copy, Save, X, Plus,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { MEAL_TYPES } from "@/lib/constants";

const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snacks", dinner: "Dinner" };

export default function MenusPage() {
  const { organization, currentPg } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [menus, setMenus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [copying, setCopying] = useState(false);
  const [editItems, setEditItems] = useState({});
  const [newItemInputs, setNewItemInputs] = useState({});

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const loadMenus = useCallback(async () => {
    if (!organization || !currentPg) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("menus")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("pg_id", currentPg.id)
        .eq("date", dateStr);

      const menuMap = {};
      (data || []).forEach((m) => {
        menuMap[m.meal_type] = m;
      });
      setMenus(menuMap);

      const itemsMap = {};
      MEAL_TYPES.forEach((mt) => {
        itemsMap[mt] = menuMap[mt]?.items || [];
      });
      setEditItems(itemsMap);
      setNewItemInputs({});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [organization, currentPg, dateStr]);

  useEffect(() => { loadMenus(); }, [loadMenus]);

  function removeItem(mealType, index) {
    setEditItems((prev) => ({
      ...prev,
      [mealType]: prev[mealType].filter((_, i) => i !== index),
    }));
  }

  function addItem(mealType) {
    const value = (newItemInputs[mealType] || "").trim();
    if (!value) return;
    setEditItems((prev) => ({
      ...prev,
      [mealType]: [...(prev[mealType] || []), value],
    }));
    setNewItemInputs((prev) => ({ ...prev, [mealType]: "" }));
  }

  function handleKeyDown(e, mealType) {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem(mealType);
    }
  }

  async function handleSave(mealType) {
    if (!currentPg) { toast.error("Please select a PG first"); return; }
    setSaving((prev) => ({ ...prev, [mealType]: true }));
    try {
      const items = editItems[mealType] || [];
      const existing = menus[mealType];

      if (existing) {
        const { data, error } = await supabase
          .from("menus")
          .update({ items })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        setMenus((prev) => ({ ...prev, [mealType]: data }));
      } else {
        const { data, error } = await supabase
          .from("menus")
          .insert({
            organization_id: organization.id,
            pg_id: currentPg.id,
            date: dateStr,
            meal_type: mealType,
            items,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        setMenus((prev) => ({ ...prev, [mealType]: data }));
      }
      toast.success(`${MEAL_LABELS[mealType]} menu saved`);
    } catch (error) { toast.error(error.message); }
    finally { setSaving((prev) => ({ ...prev, [mealType]: false })); }
  }

  async function copyPreviousDay() {
    if (!currentPg) { toast.error("Please select a PG first"); return; }
    setCopying(true);
    try {
      const prevDate = format(subDays(selectedDate, 1), "yyyy-MM-dd");
      const { data } = await supabase
        .from("menus")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("pg_id", currentPg.id)
        .eq("date", prevDate);

      if (!data?.length) {
        toast.error("No menu found for the previous day");
        return;
      }

      const itemsMap = { ...editItems };
      data.forEach((m) => {
        itemsMap[m.meal_type] = m.items || [];
      });
      setEditItems(itemsMap);
      toast.success("Copied previous day's menu. Click Save to confirm each meal.");
    } catch (error) { toast.error(error.message); }
    finally { setCopying(false); }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" />{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Menus"
        description="Manage daily meal menus for your PG"
        action={
          <Button variant="outline" onClick={copyPreviousDay} disabled={copying}>
            {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Copy Previous Day
          </Button>
        }
      />

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
          <span className="text-sm text-muted-foreground">{format(selectedDate, "EEEE")}</span>
        </div>
        <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Today</Button>
      </div>

      {!currentPg ? (
        <EmptyState icon={UtensilsCrossed} title="Select a PG" description="Choose a PG from the sidebar to manage its menus" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {MEAL_TYPES.map((mealType) => {
            const items = editItems[mealType] || [];
            const isSaving = saving[mealType];
            return (
              <Card key={mealType}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">{MEAL_LABELS[mealType]}</CardTitle>
                    <Button size="sm" onClick={() => handleSave(mealType)} disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
                      Save
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1 min-h-[32px]">
                    {items.length === 0 && (
                      <span className="text-sm text-muted-foreground">No items added</span>
                    )}
                    {items.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {item}
                        <button onClick={() => removeItem(mealType, idx)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newItemInputs[mealType] || ""}
                      onChange={(e) => setNewItemInputs((prev) => ({ ...prev, [mealType]: e.target.value }))}
                      onKeyDown={(e) => handleKeyDown(e, mealType)}
                      placeholder="Add dish name and press Enter"
                      className="text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={() => addItem(mealType)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
