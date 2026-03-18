"use client";

import { useOrg } from "@/context/org-context";

export function usePermission(permission) {
  const { hasPermission } = useOrg();
  return hasPermission(permission);
}
