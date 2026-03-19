"use client";

import { useEffect, useState, Fragment } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronDown, ChevronRight, Search, Filter, RotateCcw } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const PAGE_SIZE = 50;

const ENTITY_TYPES = [
  "all",
  "tenant",
  "room",
  "bed",
  "payment",
  "invoice",
  "expense",
  "complaint",
  "pg",
  "user",
  "organization",
  "notice",
  "event",
  "food",
];

export default function AuditLogPage() {
  const { organization } = useOrg();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [entityType, setEntityType] = useState("all");
  const [actionFilter, setActionFilter] = useState("");
  const [dateRange, setDateRange] = useState("all");

  // Detail view
  const [selectedLog, setSelectedLog] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Expanded rows (collapsible alternative)
  const [expandedRows, setExpandedRows] = useState(new Set());

  async function fetchLogs(reset = false) {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const offset = reset ? 0 : logs.length;

    let query = supabase
      .from("audit_logs")
      .select("id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at, users(first_name, last_name, email)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (entityType !== "all") {
      query = query.eq("entity_type", entityType);
    }

    if (actionFilter.trim()) {
      query = query.ilike("action", `%${actionFilter.trim()}%`);
    }

    if (dateRange !== "all") {
      const now = new Date();
      let start;
      switch (dateRange) {
        case "today":
          start = format(now, "yyyy-MM-dd");
          query = query.gte("created_at", start);
          break;
        case "this_week":
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          query = query.gte("created_at", format(weekStart, "yyyy-MM-dd"));
          break;
        case "this_month":
          query = query.gte("created_at", format(startOfMonth(now), "yyyy-MM-dd"));
          break;
        case "last_month":
          query = query
            .gte("created_at", format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"))
            .lte("created_at", format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd"));
          break;
        case "last_3":
          query = query.gte("created_at", format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"));
          break;
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching audit logs:", error);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const fetched = data || [];
    setHasMore(fetched.length === PAGE_SIZE);

    if (reset) {
      setLogs(fetched);
      setExpandedRows(new Set());
    } else {
      setLogs((prev) => [...prev, ...fetched]);
    }

    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => {
    if (!organization) return;
    fetchLogs(true);
    // fetchLogs is defined above and stable within this render cycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization, entityType, actionFilter, dateRange]);

  function toggleRow(id) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openDetail(log) {
    setSelectedLog(log);
    setSheetOpen(true);
  }

  function resetFilters() {
    setEntityType("all");
    setActionFilter("");
    setDateRange("all");
  }

  function renderJsonDiff(oldVal, newVal) {
    const oldObj = oldVal && typeof oldVal === "object" ? oldVal : {};
    const newObj = newVal && typeof newVal === "object" ? newVal : {};
    const allKeys = [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];

    if (allKeys.length === 0) {
      return <p className="text-sm text-muted-foreground">No changes recorded</p>;
    }

    return (
      <div className="space-y-2">
        {allKeys.map((key) => {
          const oldV = oldObj[key];
          const newV = newObj[key];
          const changed = JSON.stringify(oldV) !== JSON.stringify(newV);

          return (
            <div key={key} className={`rounded p-2 text-sm ${changed ? "bg-muted" : ""}`}>
              <span className="font-medium">{key}:</span>
              {changed ? (
                <div className="ml-4 mt-1 space-y-1">
                  {oldV !== undefined && (
                    <div className="text-red-600">
                      - {typeof oldV === "object" ? JSON.stringify(oldV) : String(oldV)}
                    </div>
                  )}
                  {newV !== undefined && (
                    <div className="text-green-600">
                      + {typeof newV === "object" ? JSON.stringify(newV) : String(newV)}
                    </div>
                  )}
                </div>
              ) : (
                <span className="ml-2 text-muted-foreground">
                  {typeof newV === "object" ? JSON.stringify(newV) : String(newV ?? "")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function getActionBadgeVariant(action) {
    if (action?.includes("create") || action?.includes("insert")) return "default";
    if (action?.includes("delete") || action?.includes("remove")) return "destructive";
    if (action?.includes("update") || action?.includes("edit")) return "secondary";
    return "outline";
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "all" ? "All Entities" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by action..."
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="pl-9 w-48"
              />
            </div>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          {logs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <Fragment key={log.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(log.id)}
                      >
                        <TableCell className="w-8 px-2">
                          {expandedRows.has(log.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.users
                            ? `${log.users.first_name || ""} ${log.users.last_name || ""}`.trim() || log.users.email
                            : log.user_id?.substring(0, 8) || "System"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{log.entity_type}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {log.entity_id?.substring(0, 8)}...
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(log.id) && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1 text-sm">
                                  <p>
                                    <span className="font-medium">Full Entity ID:</span>{" "}
                                    <span className="font-mono">{log.entity_id}</span>
                                  </p>
                                  {log.ip_address && (
                                    <p>
                                      <span className="font-medium">IP Address:</span>{" "}
                                      {log.ip_address}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetail(log);
                                  }}
                                >
                                  View Full Details
                                </Button>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <p className="text-sm font-medium mb-2 text-red-600">Old Values</p>
                                  <pre className="text-xs bg-background rounded p-2 overflow-auto max-h-48">
                                    {log.old_values
                                      ? JSON.stringify(log.old_values, null, 2)
                                      : "—"}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-sm font-medium mb-2 text-green-600">New Values</p>
                                  <pre className="text-xs bg-background rounded p-2 overflow-auto max-h-48">
                                    {log.new_values
                                      ? JSON.stringify(log.new_values, null, 2)
                                      : "—"}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
              </div>

              {hasMore && (
                <div className="flex justify-center p-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => fetchLogs(false)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No audit logs found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Audit Log Detail</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-6">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Timestamp</p>
                    <p>{format(new Date(selectedLog.created_at), "dd MMM yyyy, hh:mm:ss a")}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">User</p>
                    <p>
                      {selectedLog.users
                        ? `${selectedLog.users.first_name || ""} ${selectedLog.users.last_name || ""}`.trim() ||
                          selectedLog.users.email
                        : selectedLog.user_id || "System"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Action</p>
                    <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Entity Type</p>
                    <p className="capitalize">{selectedLog.entity_type}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Entity ID</p>
                    <p className="font-mono text-xs break-all">{selectedLog.entity_id}</p>
                  </div>
                  {selectedLog.ip_address && (
                    <div>
                      <p className="font-medium text-muted-foreground">IP Address</p>
                      <p>{selectedLog.ip_address}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Changes</h4>
                {renderJsonDiff(selectedLog.old_values, selectedLog.new_values)}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
