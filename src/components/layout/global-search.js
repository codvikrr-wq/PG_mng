"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutDashboard, Users, BedDouble, Building2,
  Clock, ScanSearch, FileText, CreditCard, MessageSquareWarning,
  CalendarOff, Megaphone, CalendarDays, Wrench, UserPlus, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { ADMIN_NAV_ITEMS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

// ── Search history ───────────────────────────────────────────────────────────
const HISTORY_KEY = "pg_search_history";
const MAX_HISTORY = 6;

function getHistory() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function saveToHistory(item) {
  const prev = getHistory().filter((h) => h.id !== item.id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...prev].slice(0, MAX_HISTORY)));
}
function clearHistory() {
  if (typeof window !== "undefined") localStorage.removeItem(HISTORY_KEY);
}

// ── Quick actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: "qa-new-tenant", label: "Add New Tenant",  href: "/tenants/new",       Icon: UserPlus },
  { id: "qa-invoice",    label: "Create Invoice",  href: "/payments/invoices", Icon: FileText },
  { id: "qa-payment",    label: "Record Payment",  href: "/payments/records",  Icon: CreditCard },
  { id: "qa-complaint",  label: "Log Complaint",   href: "/complaints",        Icon: MessageSquareWarning },
  { id: "qa-absence",    label: "Request Absence", href: "/absences",          Icon: CalendarOff },
];

// ── Nav flattening ───────────────────────────────────────────────────────────
function flattenNavItems(items) {
  const result = [];
  for (const item of items) {
    if (item.href) result.push({ title: item.title, href: item.href, permission: item.permission });
    if (item.children) {
      for (const child of item.children)
        result.push({ title: child.title, href: child.href, permission: item.permission });
    }
  }
  return result;
}
const ALL_NAV_ITEMS = flattenNavItems(ADMIN_NAV_ITEMS);

// ── Component ────────────────────────────────────────────────────────────────
export function GlobalSearch({ desktopClassName = "", variant = "both" }) {
  const router = useRouter();
  const { organization, hasPermission } = useOrg();
  const [open, setOpen]           = useState(false);
  const [deepSearch, setDeepSearch] = useState(false);
  const [query, setQuery]         = useState("");
  const [history, setHistory]     = useState([]);
  const [results, setResults]     = useState(null); // null = not searched yet
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgentData?.platform ?? "");
  }, []);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Load history when dialog opens
  useEffect(() => {
    if (open) setHistory(getHistory());
  }, [open]);

  // Re-run search when deep mode is toggled while a query is active
  const runSearch = useCallback(
    async (q) => {
      if (!organization?.id || q.length < 2) { setResults(null); return; }
      setSearching(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("global_search", {
          p_org_id: organization.id,
          p_query:  q,
          p_deep:   deepSearch,
        });
        if (error) { console.error("Search error:", error); setResults(null); return; }
        setResults(data);
      } finally {
        setSearching(false);
      }
    },
    [organization?.id, deepSearch]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 150);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  function handleSelect(item) {
    saveToHistory(item);
    router.push(item.href);
    setOpen(false);
    setQuery("");
    setResults(null);
  }

  function handleOpenChange(val) {
    setOpen(val);
    if (!val) { setQuery(""); setResults(null); }
  }

  // Nav + action filtering (client-side, fast)
  const filteredNav = query
    ? ALL_NAV_ITEMS.filter((item) => {
        if (item.permission && !hasPermission(item.permission)) return false;
        return item.title.toLowerCase().includes(query.toLowerCase());
      })
    : [];

  const filteredActions = query
    ? QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  const tenants    = results?.tenants    || [];
  const rooms      = results?.rooms      || [];
  const pgs        = results?.pgs        || [];
  const invoices   = results?.invoices   || [];
  const complaints = results?.complaints || [];
  const notices    = results?.notices    || [];
  const events     = results?.events     || [];
  const maintenance = results?.maintenance || [];

  const hasDBResults = tenants.length > 0 || rooms.length > 0 || pgs.length > 0 ||
    invoices.length > 0 || complaints.length > 0 || notices.length > 0 ||
    events.length > 0 || maintenance.length > 0;

  const hasAnyResults = hasDBResults || filteredNav.length > 0 || filteredActions.length > 0;
  const showEmpty = query.length >= 2 && !searching && !hasAnyResults;

  return (
    <>
      {/* Desktop search bar */}
      {variant !== "icon" && (
        <button
          onClick={() => setOpen(true)}
          className={`hidden md:flex h-9 w-72 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted transition-colors shrink-0 ${desktopClassName}`}
          aria-label="Open search"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left text-xs">Search...</span>
          <kbd className="pointer-events-none h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium hidden sm:flex gap-0.5">
            {isMac ? <><span>⌘</span><span>K</span></> : <><span>Ctrl</span><span>K</span></>}
          </kbd>
        </button>
      )}

      {/* Mobile icon */}
      {variant !== "bar" && (
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open search">
          <Search className="h-4 w-4" />
        </Button>
      )}

      {/* shouldFilter=false: we handle all filtering — cmdk never hides our results */}
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        shouldFilter={false}
        title="Search"
        description="Search everything"
      >
        <CommandInput
          placeholder={deepSearch ? "Deep search — invoices, complaints, notices…" : "Search pages, tenants, rooms, PGs…"}
          value={query}
          onValueChange={setQuery}
        />

        {/* ── Mode toggle ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b px-3 py-1.5">
          <button
            onMouseDown={(e) => { e.preventDefault(); setDeepSearch((d) => !d); }}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              deepSearch
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <ScanSearch className="h-3 w-3" />
            Deep Search
          </button>
          <span className="text-[10px] text-muted-foreground truncate">
            {deepSearch
              ? "Searching tenants · rooms · invoices · complaints · notices · events · maintenance"
              : "Pages · Actions · Tenants · Rooms · PGs"}
          </span>
        </div>

        <CommandList>
          {/* Empty state */}
          {showEmpty && (
            <CommandEmpty>No results for &ldquo;{query}&rdquo;.</CommandEmpty>
          )}

          {/* Searching indicator */}
          {searching && query.length >= 2 && !hasAnyResults && (
            <CommandEmpty>Searching…</CommandEmpty>
          )}

          {/* ── No query: history + quick actions ───────────────────── */}
          {!query && (
            <>
              {history.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <p className="text-xs font-semibold text-muted-foreground">Recent</p>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); clearHistory(); setHistory([]); }}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-2.5 w-2.5" /> Clear
                    </button>
                  </div>
                  <CommandGroup>
                    {history.map((item) => (
                      <CommandItem key={item.id} value={item.id} onSelect={() => handleSelect(item)}>
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.sub && <span className="ml-auto text-xs text-muted-foreground shrink-0">{item.sub}</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              <CommandGroup heading="Quick Actions">
                {QUICK_ACTIONS.map(({ id, label, href, Icon }) => (
                  <CommandItem key={id} value={id} onSelect={() => handleSelect({ id, label, href, sub: "action" })}>
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{label}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">{href}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* ── Pages ───────────────────────────────────────────────── */}
          {filteredNav.length > 0 && (
            <CommandGroup heading="Pages">
              {filteredNav.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`nav-${item.href}`}
                  onSelect={() => handleSelect({ id: `nav-${item.href}`, label: item.title, href: item.href, sub: item.href })}
                >
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{item.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">{item.href}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Actions matching query ───────────────────────────────── */}
          {filteredActions.length > 0 && (
            <CommandGroup heading="Actions">
              {filteredActions.map(({ id, label, href, Icon }) => (
                <CommandItem key={id} value={`action-${id}`} onSelect={() => handleSelect({ id, label, href, sub: "action" })}>
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{label}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">{href}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Tenants ─────────────────────────────────────────────── */}
          {tenants.length > 0 && (
            <CommandGroup heading="Tenants">
              {tenants.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`tenant-${t.id}`}
                  onSelect={() => handleSelect({
                    id: `tenant-${t.id}`,
                    label: `${t.first_name} ${t.last_name}`,
                    href: `/tenants/${t.id}`,
                    sub: [t.room_name, t.pg_name].filter(Boolean).join(", "),
                  })}
                >
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{t.first_name} {t.last_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {[t.room_name, t.pg_name].filter(Boolean).join(", ")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Rooms ───────────────────────────────────────────────── */}
          {rooms.length > 0 && (
            <CommandGroup heading="Rooms">
              {rooms.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`room-${r.id}`}
                  onSelect={() => handleSelect({ id: `room-${r.id}`, label: r.name, href: "/rooms", sub: r.pg_name })}
                >
                  <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{r.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">{r.pg_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── PG Properties ───────────────────────────────────────── */}
          {pgs.length > 0 && (
            <CommandGroup heading="PG Properties">
              {pgs.map((pg) => (
                <CommandItem
                  key={pg.id}
                  value={`pg-${pg.id}`}
                  onSelect={() => handleSelect({ id: `pg-${pg.id}`, label: pg.name, href: `/pgs/${pg.id}`, sub: "PG" })}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{pg.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Deep: Invoices ──────────────────────────────────────── */}
          {invoices.length > 0 && (
            <CommandGroup heading="Invoices">
              {invoices.map((inv) => (
                <CommandItem
                  key={inv.id}
                  value={`inv-${inv.id}`}
                  onSelect={() => handleSelect({ id: `inv-${inv.id}`, label: inv.invoice_number, href: "/payments/invoices", sub: inv.tenant_name || inv.status })}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{inv.invoice_number}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {inv.tenant_name}{inv.tenant_name ? " · " : ""}{inv.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Deep: Complaints ────────────────────────────────────── */}
          {complaints.length > 0 && (
            <CommandGroup heading="Complaints">
              {complaints.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`complaint-${c.id}`}
                  onSelect={() => handleSelect({ id: `complaint-${c.id}`, label: c.title, href: "/complaints", sub: c.status })}
                >
                  <MessageSquareWarning className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{c.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize shrink-0">{c.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Deep: Notices ───────────────────────────────────────── */}
          {notices.length > 0 && (
            <CommandGroup heading="Notices">
              {notices.map((n) => (
                <CommandItem
                  key={n.id}
                  value={`notice-${n.id}`}
                  onSelect={() => handleSelect({ id: `notice-${n.id}`, label: n.title, href: "/notices", sub: n.type })}
                >
                  <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{n.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize shrink-0">{n.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Deep: Events ────────────────────────────────────────── */}
          {events.length > 0 && (
            <CommandGroup heading="Events">
              {events.map((ev) => (
                <CommandItem
                  key={ev.id}
                  value={`event-${ev.id}`}
                  onSelect={() => handleSelect({ id: `event-${ev.id}`, label: ev.title, href: "/events", sub: ev.starts_at ? new Date(ev.starts_at).toLocaleDateString() : "" })}
                >
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{ev.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {ev.starts_at ? new Date(ev.starts_at).toLocaleDateString() : ""}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Deep: Maintenance ───────────────────────────────────── */}
          {maintenance.length > 0 && (
            <CommandGroup heading="Maintenance">
              {maintenance.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`maint-${m.id}`}
                  onSelect={() => handleSelect({ id: `maint-${m.id}`, label: m.title, href: "/housekeeping/maintenance", sub: m.status })}
                >
                  <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{m.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize shrink-0">{m.priority} · {m.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
