"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Building2, BedDouble, Users, IndianRupee,
  MessageSquareWarning, CalendarOff, Megaphone, CalendarDays,
  UtensilsCrossed, SprayCan, BarChart3, Settings, ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/context/org-context";
import { ADMIN_NAV_ITEMS } from "@/lib/constants";
import {
  Sidebar,
  SidebarContent,
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
} from "@/components/ui/sidebar";

const iconMap = {
  LayoutDashboard, Building2, BedDouble, Users, IndianRupee,
  MessageSquareWarning, CalendarOff, Megaphone, CalendarDays,
  UtensilsCrossed, SprayCan, BarChart3, Settings,
};

function NavItem({ item }) {
  const pathname = usePathname();
  const { hasPermission } = useOrg();
  const [expanded, setExpanded] = useState(false);

  // Check permission
  if (item.permission && !hasPermission(item.permission)) {
    return null;
  }

  const Icon = iconMap[item.icon];
  const isActive = item.href
    ? pathname === item.href
    : item.children?.some((child) => pathname === child.href);

  // If has children, render collapsible
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
                  asChild
                  isActive={pathname === child.href}
                >
                  <Link href={child.href}>{child.title}</Link>
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
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link href={item.href}>
          {Icon && <Icon className="h-4 w-4" />}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { organization } = useOrg();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {organization?.branding?.logo_url ? (
            <img
              src={organization.branding.logo_url}
              alt={organization.name}
              className="h-8 w-8 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
              {organization?.name?.charAt(0) || "P"}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold truncate max-w-[160px]">
              {organization?.name || "PG Manager"}
            </span>
            <span className="text-xs text-muted-foreground">Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
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
    </Sidebar>
  );
}
