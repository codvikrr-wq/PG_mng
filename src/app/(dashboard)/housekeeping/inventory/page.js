"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { useUser } from "@/context/user-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Package, Plus, Loader2, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const UNITS = ["pcs", "kg", "liters", "boxes", "rolls", "packets", "sets", "bottles"];

export default function InventoryPage() {
  const { organization, currentPg, pgs } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [pgId, setPgId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [lastRestocked, setLastRestocked] = useState("");

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let query = supabase
        .from("inventory_items")
        .select("*, pgs(name)")
        .eq("organization_id", organization.id)
        .order("name");

      if (currentPg) query = query.eq("pg_id", currentPg.id);
      const { data } = await query;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization, currentPg]);

  useEffect(() => { loadData(); }, [loadData]);

  const lowStockCount = items.filter((i) => i.quantity <= i.min_quantity).length;

  function openCreate() {
    setEditing(null);
    setPgId(currentPg?.id || "");
    setName("");
    setCategory("");
    setQuantity("");
    setUnit("");
    setMinQuantity("");
    setCostPerUnit("");
    setLastRestocked(new Date().toISOString().split("T")[0]);
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setPgId(item.pg_id || "");
    setName(item.name || "");
    setCategory(item.category || "");
    setQuantity(item.quantity?.toString() || "");
    setUnit(item.unit || "");
    setMinQuantity(item.min_quantity?.toString() || "");
    setCostPerUnit(item.cost_per_unit?.toString() || "");
    setLastRestocked(item.last_restocked || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name || !quantity || !unit) {
      toast.error("Name, quantity, and unit are required");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        organization_id: organization.id,
        pg_id: pgId || null,
        name,
        category: category || null,
        quantity: parseInt(quantity),
        unit,
        min_quantity: parseInt(minQuantity) || 0,
        cost_per_unit: parseFloat(costPerUnit) || 0,
        last_restocked: lastRestocked || null,
      };

      if (editing) {
        const { data, error } = await supabase
          .from("inventory_items")
          .update(payload)
          .eq("id", editing.id)
          .select("*, pgs(name)")
          .single();
        if (error) throw error;
        setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
        toast.success("Item updated");
      } else {
        const { data, error } = await supabase
          .from("inventory_items")
          .insert(payload)
          .select("*, pgs(name)")
          .single();
        if (error) throw error;
        setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Item added");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("inventory_items").delete().eq("id", deleteItem.id);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
      setDeleteItem(null);
      toast.success("Item deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Manage housekeeping supplies and inventory"
        action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Item</Button>}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Package className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : ""}>
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertTriangle className={`h-8 w-8 ${lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
            <div>
              <p className="text-2xl font-bold">{lowStockCount}</p>
              <p className="text-sm text-muted-foreground">Low Stock</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory items"
          description="Track your housekeeping supplies and inventory"
          action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Item</Button>}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>PG</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Cost/Unit</TableHead>
                <TableHead>Last Restocked</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isLow = item.quantity <= item.min_quantity;
                return (
                  <TableRow key={item.id} className={isLow ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.name}
                        {isLow && (
                          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-xs">
                            <AlertTriangle className="mr-1 h-3 w-3" />Low Stock
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.pgs?.name || "—"}</TableCell>
                    <TableCell>{item.category || "—"}</TableCell>
                    <TableCell>
                      <span className={isLow ? "text-red-600 font-semibold" : ""}>
                        {item.quantity}
                      </span>
                      {item.min_quantity > 0 && (
                        <span className="text-muted-foreground text-xs ml-1">/ min {item.min_quantity}</span>
                      )}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.cost_per_unit ? `₹${Number(item.cost_per_unit).toLocaleString()}` : "—"}</TableCell>
                    <TableCell>{item.last_restocked ? format(new Date(item.last_restocked), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteItem(item)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PG</Label>
                <Select value={pgId} onValueChange={setPgId}>
                  <SelectTrigger><SelectValue placeholder="Select PG" /></SelectTrigger>
                  <SelectContent>
                    {pgs.map((pg) => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Cleaning, Toiletries" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" min="0" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min Quantity</Label>
                <Input type="number" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} placeholder="0" min="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost per Unit (₹)</Label>
                <Input type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} placeholder="0" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label>Last Restocked</Label>
                <Input type="date" value={lastRestocked} onChange={(e) => setLastRestocked(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="Delete Item"
        description="This inventory item will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
