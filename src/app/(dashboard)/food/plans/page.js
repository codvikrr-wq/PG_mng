"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { useUser } from "@/context/user-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UtensilsCrossed, Plus, Loader2, Users, Pencil, Trash2, IndianRupee } from "lucide-react";
import { MEAL_TYPES } from "@/lib/constants";

export default function MealPlansPage() {
  const { organization, currentPg, pgs } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [plans, setPlans] = useState([]);
  const [tenantCounts, setTenantCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletePlan, setDeletePlan] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pgId, setPgId] = useState("");
  const [mealsIncluded, setMealsIncluded] = useState([]);
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let plansQ = supabase.from("meal_plans").select("*, pgs(name)").eq("organization_id", organization.id).order("created_at", { ascending: false });
      if (currentPg) plansQ = plansQ.eq("pg_id", currentPg.id);

      const [{ data }, { data: tenantPlans }] = await Promise.all([
        plansQ,
        supabase.from("tenant_meal_plans").select("meal_plan_id").eq("organization_id", organization.id),
      ]);
      setPlans(data || []);

      const counts = {};
      (tenantPlans || []).forEach((tp) => {
        counts[tp.meal_plan_id] = (counts[tp.meal_plan_id] || 0) + 1;
      });
      setTenantCounts(counts);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [organization, currentPg]);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() {
    setEditing(null); setName(""); setDescription(""); setPrice(""); setPgId(currentPg?.id || ""); setMealsIncluded([]); setIsActive(true); setDialogOpen(true);
  }

  function openEdit(plan) {
    setEditing(plan); setName(plan.name); setDescription(plan.description || ""); setPrice(plan.price?.toString() || ""); setPgId(plan.pg_id || ""); setMealsIncluded(plan.meals_included || []); setIsActive(plan.status === "active"); setDialogOpen(true);
  }

  function toggleMeal(meal) {
    setMealsIncluded((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    );
  }

  async function handleToggleActive(plan) {
    try {
      const newStatus = plan.status === "active" ? "inactive" : "active";
      const { data, error } = await supabase
        .from("meal_plans")
        .update({ status: newStatus })
        .eq("id", plan.id)
        .select("*, pgs(name)")
        .single();
      if (error) throw error;
      setPlans((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      toast.success(data.status === "active" ? "Plan activated" : "Plan deactivated");
    } catch (error) { toast.error(error.message); }
  }

  async function handleSave() {
    if (!name || !price || mealsIncluded.length === 0) {
      toast.error("Name, price, and at least one meal type are required");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        organization_id: organization.id,
        pg_id: pgId || null,
        name,
        description,
        price: parseFloat(price),
        meals_included: mealsIncluded,
        status: isActive ? "active" : "inactive",
      };
      if (editing) {
        const { data, error } = await supabase.from("meal_plans").update(payload).eq("id", editing.id).select("*, pgs(name)").single();
        if (error) throw error;
        setPlans((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        toast.success("Meal plan updated");
      } else {
        const { data, error } = await supabase.from("meal_plans").insert(payload).select("*, pgs(name)").single();
        if (error) throw error;
        setPlans((prev) => [data, ...prev]);
        toast.success("Meal plan created");
      }
      setDialogOpen(false);
    } catch (error) { toast.error(error.message); }
    finally { setCreating(false); }
  }

  async function handleDelete() {
    if (!deletePlan) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("meal_plans").delete().eq("id", deletePlan.id);
      if (error) throw error;
      setPlans((prev) => prev.filter((p) => p.id !== deletePlan.id));
      setDeletePlan(null);
      toast.success("Meal plan deleted");
    } catch (error) { toast.error(error.message); }
    finally { setDeleting(false); }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Meal Plans" description="Create and manage meal plans for tenants" action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Plan</Button>} />

      {plans.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="No meal plans yet" description="Create meal plans that tenants can subscribe to" action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Plan</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const count = tenantCounts[plan.id] || 0;
            return (
              <Card key={plan.id} className={plan.status !== "active" ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Switch checked={plan.status === "active"} onCheckedChange={() => handleToggleActive(plan)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletePlan(plan)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <IndianRupee className="h-3 w-3" />
                    {plan.price?.toLocaleString("en-IN")}
                    <span className="font-normal text-muted-foreground">/ month</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(plan.meals_included || []).map((meal) => (
                      <Badge key={meal} variant="secondary" className="capitalize">{meal}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {count} tenant{count !== 1 ? "s" : ""}
                    </div>
                    <Badge variant="outline">{plan.pgs?.name || "All PGs"}</Badge>
                    {plan.status !== "active" && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Meal Plan" : "Create Meal Plan"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Full Board" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Plan description" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (per month)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>PG</Label>
                <Select value={pgId} onValueChange={setPgId}><SelectTrigger><SelectValue placeholder="All PGs" /></SelectTrigger><SelectContent><SelectItem value="">All PGs</SelectItem>{pgs.map((pg) => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meals Included</Label>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_TYPES.map((meal) => (
                  <div key={meal} className="flex items-center gap-2">
                    <Checkbox
                      id={`meal-${meal}`}
                      checked={mealsIncluded.includes(meal)}
                      onCheckedChange={() => toggleMeal(meal)}
                    />
                    <Label htmlFor={`meal-${meal}`} className="capitalize cursor-pointer">{meal}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={creating}>{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deletePlan} onOpenChange={() => setDeletePlan(null)} title="Delete Meal Plan" description="This meal plan will be permanently removed. Tenants on this plan will need to be reassigned." confirmLabel="Delete" onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
