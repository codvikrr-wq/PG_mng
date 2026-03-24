"use client";

import { useUser } from "@/context/user-context";
import { useOrg } from "@/context/org-context";
import { Loader2 } from "lucide-react";

/**
 * Prevents dashboard pages from mounting until both the user session
 * and the org context have finished loading. Without this, pages mount
 * with organization=null, fire their useEffects, bail out early, and
 * never re-fire even after org data arrives — leaving them permanently
 * stuck on the loading skeleton.
 */
export function OrgGate({ children }) {
  const { loading: userLoading } = useUser();
  const { loading: orgLoading } = useOrg();

  if (userLoading || orgLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
