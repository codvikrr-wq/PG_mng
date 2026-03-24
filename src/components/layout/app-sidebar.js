"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Building2, BedDouble, Users, IndianRupee,
  MessageSquareWarning, CalendarOff, Megaphone, CalendarDays,
  UtensilsCrossed, SprayCan, BarChart3, Settings, ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useOrg } from "@/context/org-context";
import { ADMIN_NAV_ITEMS } from "@/lib/constants";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { PgSwitcher } from "./pg-switcher";

const iconMap = {
  LayoutDashboard, Building2, BedDouble, Users, IndianRupee,
  MessageSquareWarning, CalendarOff, Megaphone, CalendarDays,
  UtensilsCrossed, SprayCan, BarChart3, Settings,
};

function NavItem({ item }) {
  const pathname = usePathname();
  const { hasPermission } = useOrg();

  // Compute isActive before hooks — hooks must always be called unconditionally
  const isActive = item.href
    ? pathname === item.href
    : item.children?.some((child) => pathname.startsWith(child.href));

  // ALL hooks before any conditional return (Rules of Hooks)
  const [expanded, setExpanded] = useState(!!isActive);

  useEffect(() => {
    if (isActive && item.children) setExpanded(true);
  }, [isActive, item.children]);

  if (item.permission && !hasPermission(item.permission)) {
    return null;
  }

  const Icon = iconMap[item.icon];

  if (item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setExpanded(!expanded)}
          isActive={isActive}
          tooltip={item.title}
        >
          {Icon && <Icon className="h-4 w-4" />}
          <span>{item.title}</span>
          {expanded ? (
            <ChevronDown className="ml-auto h-4 w-4" />
          ) : (
            <ChevronRight className="ml-auto h-4 w-4" />
          )}
        </SidebarMenuButton>
        {expanded && (
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton
                  render={<Link href={child.href} />}
                  isActive={pathname === child.href}
                >
                  {child.title}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.href} />}
        isActive={isActive}
        tooltip={item.title}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function MobileCloser() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (isMobile && prevPathnameRef.current !== pathname) {
      setOpenMobile(false);
    }
    prevPathnameRef.current = pathname;
  }, [pathname, isMobile, setOpenMobile]);

  return null;
}

/** Org details block — shows logo image if available, otherwise icon + name */
function OrgCard({ organization }) {
  if (!organization) return null;

  if (organization.branding?.logo_url) {
    return (
      <div className="flex justify-center items-center px-3 py-2.5">
        <Image
          src={organization.branding.logo_url}
          alt={organization.name}
          width={140}
          height={36}
          className="object-contain max-h-9 w-auto"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
        {organization.name?.charAt(0) || "P"}
      </div>
      <span className="text-sm font-semibold truncate">{organization.name}</span>
    </div>
  );
}

/** Sidebar footer that shows a top-shadow only when nav links scroll beneath it */
function StickyOrgFooter({ organization }) {
  const sentinelRef = useRef(null);
  const [hasContentAbove, setHasContentAbove] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHasContentAbove(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* sentinel placed at the bottom of scrollable content */}
      <div ref={sentinelRef} className="h-px" />
      <SidebarFooter className="p-0 sticky bottom-0 z-10 bg-sidebar">
        <div
          className={`border-t transition-shadow duration-200 ${
            hasContentAbove ? "shadow-[0_-6px_16px_-4px_rgba(0,0,0,0.15)]" : ""
          }`}
        >
          <OrgCard organization={organization} />
        </div>
      </SidebarFooter>
    </>
  );
}

export function AppSidebar() {
  const { organization } = useOrg();
  const logoSrc = "/logo_new.png";

  return (
    <>
      <MobileCloser />
      <Sidebar>
        {/* Product logo — centered in the h-14 header, shown on all screen sizes inside sidebar */}
        <SidebarHeader className="border-b h-14 flex items-center justify-center px-4">
          <div className="relative h-9 w-full flex items-center justify-center">
            <Image
              src={logoSrc}
              alt="Logo"
              fill
              className="object-contain"
              priority
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* PG switcher — only shown when there are multiple PGs */}
          <div className="px-2 pt-2">
            <PgSwitcher />
          </div>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_NAV_ITEMS.map((item) => (
                  <NavItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Org card pinned to bottom of sidebar */}
        <StickyOrgFooter organization={organization} />
      </Sidebar>
    </>
  );
}
