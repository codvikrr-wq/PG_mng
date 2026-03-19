"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Plus, MapPin, Users, Loader2 } from "lucide-react";

export default function PgsPage() {
  const { organization, pgs, setPgs } = useOrg();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pgStats, setPgStats] = useState({});
  const supabase = createClient();

  // Form
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    async function loadStats() {
      if (!organization) return;
      try {
        // Get tenant counts per PG
        const { data: tenants } = await supabase
          .from("tenants")
          .select("pg_id, status")
          .eq("organization_id", organization.id)
          .eq("status", "active");

        const stats = {};
        (tenants || []).forEach((t) => {
          stats[t.pg_id] = (stats[t.pg_id] || 0) + 1;
        });
        setPgStats(stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [organization]);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("PG name is required");
      return;
    }
    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("pgs")
        .insert({
          organization_id: organization.id,
          name,
          address: { full: address },
          capacity: parseInt(capacity) || 0,
          manager_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setPgs((prev) => [...prev, data]);
      setDialogOpen(false);
      setName("");
      setAddress("");
      setCapacity("");
      toast.success("PG created successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="PG Properties"
        description={`${pgs.length} propert${pgs.length === 1 ? "y" : "ies"} in your organization`}
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add PG
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New PG</DialogTitle>
                <DialogDescription>
                  Add a new property to your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>PG Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sunrise PG"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, City"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacity (beds)</Label>
                  <Input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create PG
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {pgs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No PG properties yet"
          description="Add your first property to start managing rooms and tenants"
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add PG
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pgs.map((pg) => (
            <Link key={pg.id} href={`/pgs/${pg.id}`}>
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{pg.name}</CardTitle>
                    <Badge variant="outline">
                      {pgStats[pg.id] || 0} / {pg.capacity || "∞"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {pg.address?.full && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      {pg.address.full}
                    </p>
                  )}
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {pgStats[pg.id] || 0} active tenants
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
