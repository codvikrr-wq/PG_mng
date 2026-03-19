"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Users, BedDouble, DoorOpen } from "lucide-react";
import Link from "next/link";

export default function PgDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { organization, setPgs } = useOrg();
  const supabase = createClient();

  const [pg, setPg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Stats
  const [roomCount, setRoomCount] = useState(0);
  const [bedCount, setBedCount] = useState(0);
  const [tenantCount, setTenantCount] = useState(0);

  // Edit form
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    async function load() {
      const { data: pgData } = await supabase
        .from("pgs")
        .select("*")
        .eq("id", id)
        .single();

      if (pgData) {
        setPg(pgData);
        setName(pgData.name);
        setAddress(pgData.address?.full || "");
        setCapacity(pgData.capacity?.toString() || "");
      }

      const [rooms, beds, tenants] = await Promise.all([
        supabase.from("rooms").select("id", { count: "exact" }).eq("pg_id", id),
        supabase.from("beds").select("id", { count: "exact" }).eq("pg_id", id),
        supabase.from("tenants").select("id", { count: "exact" }).eq("pg_id", id).eq("status", "active"),
      ]);

      setRoomCount(rooms.count || 0);
      setBedCount(beds.count || 0);
      setTenantCount(tenants.count || 0);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pgs")
        .update({
          name,
          address: { full: address },
          capacity: parseInt(capacity) || 0,
        })
        .eq("id", id);

      if (error) throw error;
      setPg((prev) => ({ ...prev, name, address: { full: address }, capacity: parseInt(capacity) || 0 }));
      setPgs((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
      toast.success("PG updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from("pgs").delete().eq("id", id);
      if (error) throw error;
      setPgs((prev) => prev.filter((p) => p.id !== id));
      toast.success("PG deleted");
      router.push("/pgs");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!pg) {
    return <div className="py-16 text-center">PG not found</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={pg.name}
        description={pg.address?.full}
        action={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete PG
          </Button>
        }
      />

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <DoorOpen className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{roomCount}</p>
              <p className="text-xs text-muted-foreground">Rooms</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <BedDouble className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{bedCount}</p>
              <p className="text-xs text-muted-foreground">Beds</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{tenantCount}</p>
              <p className="text-xs text-muted-foreground">Active Tenants</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="rooms">
            <Link href="/rooms">Rooms</Link>
          </TabsTrigger>
          <TabsTrigger value="tenants">
            <Link href="/tenants">Tenants</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>PG Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete PG"
        description="This will permanently delete this PG and all associated data. This action cannot be undone."
        confirmLabel="Delete PG"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
