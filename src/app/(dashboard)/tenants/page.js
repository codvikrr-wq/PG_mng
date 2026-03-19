"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  Users,
  Plus,
  Search,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TENANT_STATUS } from "@/lib/constants";

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

const PAGE_SIZE = 20;

export default function TenantsPage() {
  const { organization, currentPg, pgs } = useOrg();
  const supabase = createClient();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pgFilter, setPgFilter] = useState("current");

  // Related data maps
  const [pgMap, setPgMap] = useState({});
  const [roomMap, setRoomMap] = useState({});
  const [bedMap, setBedMap] = useState({});

  // Build a PG name map from org context
  useEffect(() => {
    const map = {};
    (pgs || []).forEach((pg) => {
      map[pg.id] = pg.name;
    });
    setPgMap(map);
  }, [pgs]);

  const loadTenants = useCallback(async () => {
    if (!organization) return;
    setLoading(true);

    try {
      let query = supabase
        .from("tenants")
        .select("*", { count: "exact" })
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      // PG filter: use currentPg when set to "current", or a specific PG id
      if (pgFilter === "current" && currentPg) {
        query = query.eq("pg_id", currentPg.id);
      } else if (pgFilter !== "all" && pgFilter !== "current") {
        query = query.eq("pg_id", pgFilter);
      }

      // Status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Search by name, email, or phone
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(
          `full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`
        );
      }

      // Pagination
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setTenants(data || []);
      setTotalCount(count || 0);

      // Load related rooms and beds for the returned tenants
      const roomIds = [
        ...new Set((data || []).map((t) => t.room_id).filter(Boolean)),
      ];
      const bedIds = [
        ...new Set((data || []).map((t) => t.bed_id).filter(Boolean)),
      ];

      if (roomIds.length > 0) {
        const { data: rooms } = await supabase
          .from("rooms")
          .select("id, name")
          .in("id", roomIds);
        const map = {};
        (rooms || []).forEach((r) => {
          map[r.id] = r.name;
        });
        setRoomMap(map);
      } else {
        setRoomMap({});
      }

      if (bedIds.length > 0) {
        const { data: beds } = await supabase
          .from("beds")
          .select("id, bed_number")
          .in("id", bedIds);
        const map = {};
        (beds || []).forEach((b) => {
          map[b.id] = b.bed_number;
        });
        setBedMap(map);
      } else {
        setBedMap({});
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, [organization, currentPg, pgFilter, statusFilter, search, page]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, pgFilter]);

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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && tenants.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description={`${totalCount} tenant${totalCount === 1 ? "" : "s"}${
          currentPg && pgFilter === "current" ? ` in ${currentPg.name}` : ""
        }`}
        action={
          <Link href="/tenants/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(TENANT_STATUS).map(([key, value]) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABELS[value] || key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {pgs.length > 1 && (
          <Select value={pgFilter} onValueChange={setPgFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by PG" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PGs</SelectItem>
              {currentPg && (
                <SelectItem value="current">
                  {currentPg.name} (Current)
                </SelectItem>
              )}
              {pgs.map((pg) => (
                <SelectItem key={pg.id} value={pg.id}>
                  {pg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tenant table or empty state */}
      {!loading && tenants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants found"
          description={
            search || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Add your first tenant to get started"
          }
          action={
            !search && statusFilter === "all" ? (
              <Link href="/tenants/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tenant
                </Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>PG</TableHead>
                  <TableHead>Room / Bed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Move-in Date</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={tenant.photo_url}
                            alt={tenant.full_name}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(tenant.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link
                            href={`/tenants/${tenant.id}`}
                            className="font-medium hover:underline"
                          >
                            {tenant.full_name}
                          </Link>
                          {tenant.email && (
                            <p className="text-xs text-muted-foreground">
                              {tenant.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {pgMap[tenant.pg_id] || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {roomMap[tenant.room_id] || "-"}
                      {bedMap[tenant.bed_id]
                        ? ` / ${bedMap[tenant.bed_id]}`
                        : ""}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[tenant.status] || ""}
                      >
                        {STATUS_LABELS[tenant.status] || tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(tenant.move_in_date)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tenant.phone || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/tenants/${tenant.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/tenants/${tenant.id}?edit=true`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
