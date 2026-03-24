"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { useUser } from "@/context/user-context";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Pencil,
  LogIn,
  LogOut,
  Upload,
  FileText,
  Eye,
  Trash2,
  Download,
  X,
  Plus,
  Calendar,
  Phone,
  Mail,
  User,
  Ban,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TENANT_STATUS, INVOICE_STATUS, COMPLAINT_STATUS } from "@/lib/constants";

const STATUS_COLORS = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  prospective:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  on_leave:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  vacated:
    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  blacklisted:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS = {
  active: "Active",
  prospective: "Prospective",
  on_leave: "On Leave",
  vacated: "Vacated",
  blacklisted: "Blacklisted",
};

const INVOICE_STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  partial:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled:
    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const COMPLAINT_STATUS_COLORS = {
  open: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  assigned:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function TenantDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization, pgs } = useOrg();
  const { user } = useUser();
  const supabase = createClient();

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [activeTab, setActiveTab] = useState("overview");

  // Related data
  const [pgName, setPgName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [bedNumber, setBedNumber] = useState("");

  // Edit form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("");

  // Documents tab state
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Lease tab state
  const [lease, setLease] = useState(null);
  const [leaseLoading, setLeaseLoading] = useState(false);
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [leaseRent, setLeaseRent] = useState("");
  const [leaseDeposit, setLeaseDeposit] = useState("");
  const [leaseSaving, setLeaseSaving] = useState(false);

  // Invoices tab state
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Complaints tab state
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  // Absences tab state
  const [absences, setAbsences] = useState([]);
  const [absencesLoading, setAbsencesLoading] = useState(false);

  // Check-in/out dialogs
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Blacklist dialog
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [blacklisting, setBlacklisting] = useState(false);

  // Deposit refund dialog
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [refunding, setRefunding] = useState(false);

  // Load tenant
  const loadTenant = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return;

      setTenant(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setDob(data.date_of_birth || "");
      setGender(data.gender || "");

      const ec = data.emergency_contact || {};
      setEmergencyContactName(ec.name || "");
      setEmergencyContactPhone(ec.phone || "");
      setEmergencyContactRelation(ec.relation || "");

      setDocuments(data.id_documents || []);

      // Load PG name
      if (data.pg_id) {
        const pg = pgs.find((p) => p.id === data.pg_id);
        setPgName(pg?.name || "");
      }

      // Load room, bed, and lease in parallel
      const [roomResult, bedResult, leaseResult] = await Promise.all([
        data.room_id ? supabase.from("rooms").select("name").eq("id", data.room_id).single() : Promise.resolve({ data: null }),
        data.bed_id ? supabase.from("beds").select("bed_number").eq("id", data.bed_id).single() : Promise.resolve({ data: null }),
        supabase.from("leases").select("*").eq("tenant_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setRoomName(roomResult.data?.name || "");
      setBedNumber(bedResult.data?.bed_number || "");
      if (leaseResult.data) setLease(leaseResult.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load tenant");
    } finally {
      setLoading(false);
    }
  }, [id, pgs]);

  useEffect(() => {
    if (pgs.length > 0 || !organization) {
      loadTenant();
    }
  }, [loadTenant, pgs, organization]);

  // Load tab data on tab change
  useEffect(() => {
    if (!tenant) return;

    if (activeTab === "lease" && !lease && !leaseLoading) {
      loadLease();
    }
    if (activeTab === "invoices" && invoices.length === 0 && !invoicesLoading) {
      loadInvoices();
    }
    if (
      activeTab === "complaints" &&
      complaints.length === 0 &&
      !complaintsLoading
    ) {
      loadComplaints();
    }
    if (activeTab === "absences" && absences.length === 0 && !absencesLoading) {
      loadAbsences();
    }
  }, [activeTab, tenant]);

  async function loadLease() {
    setLeaseLoading(true);
    try {
      const { data, error } = await supabase
        .from("leases")
        .select("*")
        .eq("tenant_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLease(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLeaseLoading(false);
    }
  }

  async function loadInvoices() {
    setInvoicesLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setInvoicesLoading(false);
    }
  }

  async function loadComplaints() {
    setComplaintsLoading(true);
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("tenant_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setComplaintsLoading(false);
    }
  }

  async function loadAbsences() {
    setAbsencesLoading(true);
    try {
      const { data, error } = await supabase
        .from("absence_reports")
        .select("*")
        .eq("tenant_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAbsences(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setAbsencesLoading(false);
    }
  }

  async function handleSaveDetails() {
    setSaving(true);
    try {
      const updates = {
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        date_of_birth: dob || null,
        gender: gender || null,
        emergency_contact: {
          name: emergencyContactName || null,
          phone: emergencyContactPhone || null,
          relation: emergencyContactRelation || null,
        },
      };

      const { error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setTenant((prev) => ({ ...prev, ...updates }));
      setEditing(false);
      toast.success("Tenant details updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDocumentUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      // Path must start with org_id to satisfy storage RLS policy
      const fileName = `${organization.id}/${id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("id-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const newDoc = {
        name: file.name,
        path: fileName,
        type: file.type,
        uploaded_at: new Date().toISOString(),
      };

      const updatedDocs = [...documents, newDoc];

      const { error } = await supabase
        .from("tenants")
        .update({ id_documents: updatedDocs })
        .eq("id", id);

      if (error) throw error;

      setDocuments(updatedDocs);
      toast.success("Document uploaded");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function openDocument(doc, download = false) {
    try {
      if (!doc.path) {
        // Legacy doc with direct URL
        window.open(doc.url, "_blank");
        return;
      }
      const { data, error } = await supabase.storage
        .from("id-documents")
        .createSignedUrl(doc.path, 3600);
      if (error) throw error;
      if (download) {
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.download = doc.name;
        a.click();
      } else {
        window.open(data.signedUrl, "_blank");
      }
    } catch (err) {
      toast.error("Could not open document");
    }
  }

  async function handleDeleteDocument(index) {
    try {
      const doc = documents[index];

      // Delete from storage
      if (doc.path) {
        await supabase.storage.from("id-documents").remove([doc.path]);
      }

      const updatedDocs = documents.filter((_, i) => i !== index);

      const { error } = await supabase
        .from("tenants")
        .update({ id_documents: updatedDocs })
        .eq("id", id);

      if (error) throw error;

      setDocuments(updatedDocs);
      toast.success("Document removed");
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleCreateLease() {
    if (!leaseStart || !leaseRent) {
      toast.error("Start date and rent are required");
      return;
    }
    setLeaseSaving(true);
    try {
      const { data, error } = await supabase
        .from("leases")
        .insert({
          tenant_id: id,
          organization_id: organization.id,
          pg_id: tenant.pg_id,
          room_id: tenant.room_id,
          bed_id: tenant.bed_id,
          start_date: leaseStart,
          end_date: leaseEnd || null,
          rent_amount: parseFloat(leaseRent) || 0,
          deposit_amount: parseFloat(leaseDeposit) || 0,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      setLease(data);
      setShowLeaseForm(false);
      setLeaseStart("");
      setLeaseEnd("");
      setLeaseRent("");
      setLeaseDeposit("");
      toast.success("Lease created");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLeaseSaving(false);
    }
  }

  async function handleCheckIn() {
    setCheckingIn(true);
    try {
      const now = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("tenants")
        .update({
          status: "active",
          move_in_date: now,
        })
        .eq("id", id);

      if (error) throw error;

      // Update bed status to occupied
      if (tenant.bed_id) {
        await supabase
          .from("beds")
          .update({ status: "occupied" })
          .eq("id", tenant.bed_id);
      }

      setTenant((prev) => ({
        ...prev,
        status: "active",
        move_in_date: now,
      }));
      setCheckInOpen(false);
      toast.success("Tenant checked in successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    setCheckingOut(true);
    try {
      const now = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("tenants")
        .update({
          status: "vacated",
          move_out_date: now,
        })
        .eq("id", id);

      if (error) throw error;

      // Update bed status to available
      if (tenant.bed_id) {
        await supabase
          .from("beds")
          .update({ status: "available" })
          .eq("id", tenant.bed_id);
      }

      setTenant((prev) => ({
        ...prev,
        status: "vacated",
        move_out_date: now,
      }));
      setCheckOutOpen(false);
      toast.success("Tenant checked out successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleBlacklist() {
    setBlacklisting(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ status: "blacklisted" })
        .eq("id", id);
      if (error) throw error;
      setTenant((prev) => ({ ...prev, status: "blacklisted" }));
      setBlacklistOpen(false);
      toast.success("Tenant has been blacklisted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBlacklisting(false);
    }
  }

  async function handleRefund() {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }
    setRefunding(true);
    try {
      // Record refund as a negative payment
      const { error } = await supabase.from("payments").insert({
        organization_id: organization.id,
        pg_id: tenant.pg_id,
        tenant_id: id,
        amount: -Math.abs(parseFloat(refundAmount)),
        payment_date: new Date().toISOString().split("T")[0],
        method: "bank_transfer",
        notes: `Security deposit refund${refundNotes ? ": " + refundNotes : ""}`,
        recorded_by: user.id,
        status: "completed",
      });
      if (error) throw error;
      setRefundOpen(false);
      setRefundAmount("");
      setRefundNotes("");
      toast.success("Deposit refund recorded");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRefunding(false);
    }
  }

  function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatCurrency(amount) {
    if (!amount && amount !== 0) return "-";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!tenant) {
    return <div className="py-16 text-center">Tenant not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={tenant.profile_photo_url} alt={`${tenant.first_name} ${tenant.last_name}`} />
            <AvatarFallback className="text-lg">
              {getInitials(`${tenant.first_name} ${tenant.last_name}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {tenant.first_name} {tenant.last_name}
              </h1>
              <Badge
                variant="secondary"
                className={STATUS_COLORS[tenant.status] || ""}
              >
                {STATUS_LABELS[tenant.status] || tenant.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[pgName, roomName, bedNumber].filter(Boolean).join(" / ") ||
                "No room assigned"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {editing ? "Cancel Edit" : "Edit"}
          </Button>
          {(tenant.status === "prospective" ||
            tenant.status === "on_leave") && (
            <Button size="sm" onClick={() => setCheckInOpen(true)}>
              <LogIn className="mr-2 h-4 w-4" />
              Check In
            </Button>
          )}
          {tenant.status === "active" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCheckOutOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Check Out
            </Button>
          )}
          {tenant.status === "vacated" && lease?.deposit_amount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefundAmount(lease.deposit_amount?.toString() || "");
                setRefundOpen(true);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refund Deposit
            </Button>
          )}
          {tenant.status !== "blacklisted" && tenant.status !== "vacated" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setBlacklistOpen(true)}
            >
              <Ban className="mr-2 h-4 w-4" />
              Blacklist
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="lease">Lease</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="absences">Absences</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleSaveDetails} disabled={saving}>
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Full Name
                      </p>
                      <p className="text-sm font-medium">
                        {[tenant.first_name, tenant.last_name].filter(Boolean).join(" ") || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">
                        {tenant.email || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">
                        {tenant.phone || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Date of Birth
                      </p>
                      <p className="text-sm font-medium">
                        {formatDate(tenant.date_of_birth)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="text-sm font-medium capitalize">
                      {tenant.gender || "-"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={emergencyContactName}
                      onChange={(e) =>
                        setEmergencyContactName(e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={emergencyContactPhone}
                      onChange={(e) =>
                        setEmergencyContactPhone(e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relation</Label>
                    <Input
                      value={emergencyContactRelation}
                      onChange={(e) =>
                        setEmergencyContactRelation(e.target.value)
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">
                      {tenant.emergency_contact?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">
                      {tenant.emergency_contact?.phone || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Relation</p>
                    <p className="text-sm font-medium">
                      {tenant.emergency_contact?.relation || "-"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stay Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">PG</p>
                  <p className="text-sm font-medium">{pgName || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Room / Bed</p>
                  <p className="text-sm font-medium">
                    {roomName || "-"}
                    {bedNumber ? ` / ${bedNumber}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant="secondary"
                    className={`mt-1 ${STATUS_COLORS[tenant.status] || ""}`}
                  >
                    {STATUS_LABELS[tenant.status] || tenant.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Move-in Date</p>
                  <p className="text-sm font-medium">
                    {formatDate(tenant.move_in_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Move-out Date
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(tenant.move_out_date)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ID Documents</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PDF, JPG, PNG · max 10 MB per file
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    id="doc-upload"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleDocumentUpload}
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      document.getElementById("doc-upload")?.click()
                    }
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Document
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No documents uploaded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {formatDate(doc.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDocument(doc, false)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDocument(doc, true)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDocument(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lease Tab */}
        <TabsContent value="lease" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lease Agreement</CardTitle>
                {!lease && !showLeaseForm && (
                  <Button size="sm" onClick={() => setShowLeaseForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Lease
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {leaseLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ) : showLeaseForm ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={leaseStart}
                        onChange={(e) => setLeaseStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date (optional)</Label>
                      <Input
                        type="date"
                        value={leaseEnd}
                        onChange={(e) => setLeaseEnd(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Rent (₹)</Label>
                      <Input
                        type="number"
                        value={leaseRent}
                        onChange={(e) => setLeaseRent(e.target.value)}
                        placeholder="10000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Security Deposit (₹)</Label>
                      <Input
                        type="number"
                        value={leaseDeposit}
                        onChange={(e) => setLeaseDeposit(e.target.value)}
                        placeholder="20000"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateLease} disabled={leaseSaving}>
                      {leaseSaving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Lease
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowLeaseForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : lease ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Start Date</p>
                    <p className="text-sm font-medium">
                      {formatDate(lease.start_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="text-sm font-medium">
                      {formatDate(lease.end_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Monthly Rent
                    </p>
                    <p className="text-sm font-medium">
                      {formatCurrency(lease.rent_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Security Deposit
                    </p>
                    <p className="text-sm font-medium">
                      {formatCurrency(lease.deposit_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {lease.status}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No lease agreement found for this tenant
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No invoices found for this tenant
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium text-sm">
                            {invoice.invoice_number || invoice.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {invoice.period_start
                              ? `${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatCurrency(invoice.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                INVOICE_STATUS_COLORS[invoice.status] || ""
                              }
                            >
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(invoice.due_date)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Complaints Tab */}
        <TabsContent value="complaints" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Complaints</CardTitle>
            </CardHeader>
            <CardContent>
              {complaintsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : complaints.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No complaints filed by this tenant
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complaints.map((complaint) => (
                        <TableRow key={complaint.id}>
                          <TableCell className="font-medium text-sm">
                            {complaint.subject || complaint.title || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {complaint.category || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                COMPLAINT_STATUS_COLORS[complaint.status] || ""
                              }
                            >
                              {complaint.status?.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm capitalize">
                            {complaint.priority || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(complaint.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Absences Tab */}
        <TabsContent value="absences" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Absence Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {absencesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : absences.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No absence reports for this tenant
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reported</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {absences.map((absence) => (
                        <TableRow key={absence.id}>
                          <TableCell className="text-sm">
                            {formatDate(absence.start_date)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(absence.end_date)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {absence.reason || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {absence.status || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(absence.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Check-in confirmation dialog */}
      <ConfirmDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        title="Check In Tenant"
        description={`This will set ${tenant.first_name} ${tenant.last_name}'s status to Active, record today as the move-in date, and mark their bed as occupied.`}
        confirmLabel="Check In"
        onConfirm={handleCheckIn}
        loading={checkingIn}
      />

      {/* Check-out confirmation dialog */}
      <ConfirmDialog
        open={checkOutOpen}
        onOpenChange={setCheckOutOpen}
        title="Check Out Tenant"
        description={`This will set ${tenant.first_name} ${tenant.last_name}'s status to Vacated, record today as the move-out date, and mark their bed as available.`}
        confirmLabel="Check Out"
        onConfirm={handleCheckOut}
        loading={checkingOut}
      />

      {/* Blacklist confirmation dialog */}
      <ConfirmDialog
        open={blacklistOpen}
        onOpenChange={setBlacklistOpen}
        title="Blacklist Tenant"
        description={`Are you sure you want to blacklist ${tenant.first_name} ${tenant.last_name}? This will flag their account and prevent future check-ins.`}
        confirmLabel="Blacklist"
        onConfirm={handleBlacklist}
        loading={blacklisting}
      />

      {/* Deposit Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Security Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Security deposit on record: <strong>{formatCurrency(lease?.deposit_amount)}</strong>
            </p>
            <div className="space-y-2">
              <Label>Refund Amount (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Reason for deductions, if any…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button>
            <Button onClick={handleRefund} disabled={refunding}>
              {refunding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
