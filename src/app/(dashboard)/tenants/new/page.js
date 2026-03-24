"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTenantPage() {
  const router = useRouter();
  const { organization, currentPg, pgs } = useOrg();
  const supabase = createClient();

  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [saving, setSaving] = useState(false);

  const [pgId, setPgId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [bedId, setBedId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [status, setStatus] = useState("active");

  // Initialize pgId from currentPg
  useEffect(() => {
    if (currentPg && !pgId) setPgId(currentPg.id);
  }, [currentPg]);

  // Load rooms when pg changes
  useEffect(() => {
    async function loadRooms() {
      if (!pgId || !organization) return;
      const { data } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("organization_id", organization.id)
        .eq("pg_id", pgId)
        .order("name");
      setRooms(data || []);
      setRoomId("");
      setBedId("");
      setBeds([]);
    }
    loadRooms();
  }, [pgId, organization]);

  // Load available beds when room changes
  useEffect(() => {
    async function loadBeds() {
      if (!roomId) { setBeds([]); setBedId(""); return; }
      const { data } = await supabase
        .from("beds")
        .select("id, bed_number")
        .eq("room_id", roomId)
        .eq("status", "available")
        .order("bed_number");
      setBeds(data || []);
      setBedId("");
    }
    loadBeds();
  }, [roomId]);

  async function handleSave() {
    if (!firstName.trim()) { toast.error("First name is required"); return; }
    if (!pgId) { toast.error("Please select a PG"); return; }

    setSaving(true);
    try {
      const payload = {
        organization_id: organization.id,
        pg_id: pgId,
        room_id: roomId || null,
        bed_id: bedId || null,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        status,
      };

      const { data: tenant, error } = await supabase
        .from("tenants")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      // Create lease record if lease start date provided (start_date is NOT NULL in schema)
      if (leaseStart) {
        await supabase.from("leases").insert({
          organization_id: organization.id,
          tenant_id: tenant.id,
          pg_id: pgId,
          room_id: roomId || null,
          bed_id: bedId || null,
          start_date: leaseStart || null,
          end_date: leaseEnd || null,
          rent_amount: rentAmount ? parseFloat(rentAmount) : 0,
          status: "active",
        });
      }

      // Mark bed as occupied
      if (bedId) {
        await supabase.from("beds").update({ status: "occupied" }).eq("id", bedId);
      }

      toast.success("Tenant created successfully");
      router.push(`/tenants/${tenant.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Tenant"
        description="Create a new tenant record"
        action={
          <Button variant="outline" asChild>
            <Link href="/tenants"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Personal Info */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Personal Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tenant@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>

          {/* Room Assignment */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Room Assignment</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>PG <span className="text-destructive">*</span></Label>
                <Select value={pgId} onValueChange={setPgId}>
                  <SelectTrigger><SelectValue placeholder="Select PG" /></SelectTrigger>
                  <SelectContent>
                    {pgs.map((pg) => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={roomId} onValueChange={setRoomId} disabled={!pgId}>
                  <SelectTrigger><SelectValue placeholder="Select Room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No room</SelectItem>
                    {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bed</Label>
                <Select value={bedId} onValueChange={setBedId} disabled={!roomId}>
                  <SelectTrigger><SelectValue placeholder="Select Bed" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No bed</SelectItem>
                    {beds.map((b) => <SelectItem key={b.id} value={b.id}>Bed {b.bed_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lease Details */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Lease Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Lease Start</Label>
                <Input type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Lease End</Label>
                <Input type="date" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Monthly Rent (₹)</Label>
                <Input type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} placeholder="0" min="0" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prospective">Prospective</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="vacated">Vacated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tenant
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tenants">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
