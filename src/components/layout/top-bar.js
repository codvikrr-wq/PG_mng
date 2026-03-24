"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Moon, Sun, LogOut, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/user-context";
import { useOrg } from "@/context/org-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "./notification-bell";
import { GlobalSearch } from "./global-search";
import { ADMIN_NAV_ITEMS } from "@/lib/constants";

function getPageTitle(pathname) {
  for (const item of ADMIN_NAV_ITEMS) {
    if (item.href && pathname === item.href) return item.title;
    if (item.children) {
      for (const child of item.children) {
        if (pathname === child.href) return child.title;
      }
    }
  }
  if (pathname.startsWith("/tenants/")) return "Tenant Details";
  if (pathname.startsWith("/pgs/")) return "PG Details";
  if (pathname === "/onboarding") return "Onboarding";
  return "";
}

// Time-based greeting that rotates through options per hour block
const GREETINGS = {
  dawn:    ["Rise & shine", "Early bird", "Fresh start"],        // 5-9
  morning: ["Keep it up", "In the zone", "Stay focused"],        // 9-12
  noon:    ["Midday grind", "Halfway there", "Keep going"],      // 12-14
  afternoon:["Afternoon fuel", "On a roll", "Making it happen"], // 14-17
  evening: ["Evening wrap", "Almost done", "Winding down"],      // 17-20
  night:   ["Burning the oil", "Night shift", "Still at it"],    // 20-24
  late:    ["Night owl", "Never stops", "The grind continues"],  // 0-5
};

function getGreeting() {
  const h = new Date().getHours();
  let pool;
  if (h >= 5 && h < 9)   pool = GREETINGS.dawn;
  else if (h < 12)        pool = GREETINGS.morning;
  else if (h < 14)        pool = GREETINGS.noon;
  else if (h < 17)        pool = GREETINGS.afternoon;
  else if (h < 20)        pool = GREETINGS.evening;
  else if (h < 24)        pool = GREETINGS.night;
  else                    pool = GREETINGS.late;
  // Rotate index every 30 minutes so it changes during the session
  const idx = Math.floor(Date.now() / (1000 * 60 * 30)) % pool.length;
  return pool[idx];
}

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, profile } = useUser();
  const { organization } = useOrg();
  const supabase = createClient();

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);
  const greeting  = useMemo(() => getGreeting(), []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const firstName = profile?.first_name || user?.email?.split("@")[0] || "";
  const initials = profile
    ? `${profile.first_name?.charAt(0) || ""}${profile.last_name?.charAt(0) || ""}`
    : user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    /**
     * Layout (desktop):
     *   [Bell (left)]  [flex-1]  [Search (center)]  [flex-1]  [Greeting + Avatar (right)]
     * Layout (mobile):
     *   [☰] [logo] [page-title flex-1] [search-icon] [avatar]
     */
    <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4">

      {/* ── MOBILE LEFT ─────────────────────────────────────── */}
      <SidebarTrigger className="-ml-1 md:hidden shrink-0 mr-1" />

      {/* Product logo hidden on mobile — shown in sidebar when drawer opens */}

      {pageTitle ? (
        <span className="md:hidden ml-2 text-sm font-semibold text-foreground truncate min-w-0 flex-1">
          {pageTitle}
        </span>
      ) : (
        <div className="flex-1 md:hidden" />
      )}

      {/* ── DESKTOP LEFT — notification bell ────────────────── */}
      <div className="hidden md:flex items-center">
        <NotificationBell />
      </div>

      {/* ── CENTER spacer (desktop) ──────────────────────────── */}
      <div className="hidden md:flex flex-1" />

      {/* ── CENTER — search bar (desktop) / icon (mobile) ───── */}
      {/* Desktop bar rendered here; mobile icon rendered in its own slot below */}
      <GlobalSearch variant="bar" />

      {/* ── CENTER spacer (desktop) ──────────────────────────── */}
      <div className="hidden md:flex flex-1" />

      {/* ── MOBILE: search icon ──────────────────────────────── */}
      <GlobalSearch variant="icon" />

      {/* ── RIGHT — greeting + avatar (desktop) ─────────────── */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <div className="text-right leading-tight">
          <p className="text-[11px] text-muted-foreground">{greeting}</p>
          <p className="text-sm font-semibold text-foreground">{firstName}</p>
        </div>

        <UserDropdown
          profile={profile}
          user={user}
          organization={organization}
          theme={theme}
          setTheme={setTheme}
          initials={initials}
          onSettings={() => router.push("/settings/organization")}
          onLogout={handleLogout}
          rounded="md"
        />
      </div>

      {/* ── MOBILE: just the avatar ──────────────────────────── */}
      <div className="md:hidden ml-1">
        <UserDropdown
          profile={profile}
          user={user}
          organization={organization}
          theme={theme}
          setTheme={setTheme}
          initials={initials}
          onSettings={() => router.push("/settings/organization")}
          onLogout={handleLogout}
          rounded="full"
        />
      </div>
    </header>
  );
}

// ── Extracted to reduce nesting ────────────────────────────────────────────
function UserDropdown({ profile, user, organization, theme, setTheme, initials, onSettings, onLogout, rounded }) {
  const avatarClass = rounded === "md"
    ? "h-9 w-9 rounded-lg"
    : "h-8 w-8 rounded-lg";
  const triggerClass = rounded === "md"
    ? "relative h-9 w-9 rounded-lg p-0"
    : "relative h-8 w-8 rounded-lg p-0";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={triggerClass}>
          <Avatar className={avatarClass}>
            <AvatarImage src={profile?.avatar_url} alt={profile?.first_name} />
            <AvatarFallback className={`text-xs ${rounded === "md" ? "rounded-lg" : ""}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-0">
        {/* Org branding */}
        <div className={`px-3 py-3 border-b min-h-[52px] ${organization?.branding?.logo_url ? "flex justify-center items-center" : "flex items-center gap-3"}`}>
          {organization?.branding?.logo_url ? (
            <Image
              src={organization.branding.logo_url}
              alt={organization?.name || "Org"}
              width={160}
              height={40}
              className="max-h-8 w-auto object-contain"
            />
          ) : (
            <>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
                {organization?.name?.charAt(0) || "P"}
              </div>
              <span className="text-sm font-medium truncate">{organization?.name}</span>
            </>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-3 border-b">
          <Avatar className="h-8 w-8 rounded-lg shrink-0">
            <AvatarImage src={profile?.avatar_url} alt={profile?.first_name} />
            <AvatarFallback className="text-xs rounded-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        {/* Theme toggle */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2 text-sm">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span>Dark Mode</span>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            aria-label="Toggle dark mode"
          />
        </div>

        {/* Settings */}
        <div className="p-1">
          <button
            onClick={onSettings}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>

        <DropdownMenuSeparator />

        {/* Logout */}
        <div className="p-1">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
