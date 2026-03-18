"use client";

import { useOrg } from "@/context/org-context";

export function PermissionGuard({ permission, children, fallback = null }) {
  const { hasPermission } = useOrg();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return children;
}
