"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./user-context";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { profile, loading: userLoading } = useUser();
  const [organization, setOrganization] = useState(null);
  const [pgs, setPgs] = useState([]);
  const [currentPg, setCurrentPg] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  useEffect(() => {
    async function loadOrgData() {
      // Don't touch loading state while user session is still being fetched.
      // Calling setLoading(false) here would cause pages to mount with a null
      // organization and get permanently stuck in their own loading state.
      if (userLoading) return;

      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      try {
        // Load organization and PGs in parallel
        const [{ data: orgData }, { data: pgData }] = await Promise.all([
          supabase
            .from("organizations")
            .select("*")
            .eq("id", profile.organization_id)
            .single(),
          supabase
            .from("pgs")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .order("name"),
        ]);

        setOrganization(orgData);
        setPgs(pgData || []);

        // Set current PG from localStorage or first PG
        const savedPgId = localStorage.getItem("currentPgId");
        const savedPg = pgData?.find((pg) => pg.id === savedPgId);
        setCurrentPg(savedPg || pgData?.[0] || null);

        // Build permissions from user roles
        const userPermissions = [];
        if (profile.user_roles) {
          profile.user_roles.forEach((ur) => {
            if (ur.roles?.permissions) {
              Object.entries(ur.roles.permissions).forEach(
                ([module, actions]) => {
                  actions.forEach((action) => {
                    userPermissions.push(`${module}.${action}`);
                  });
                }
              );
            }
          });
        }
        setPermissions([...new Set(userPermissions)]);
      } catch (error) {
        console.error("Error loading org data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOrgData();
  }, [profile, userLoading]);

  function switchPg(pgId) {
    const pg = pgs.find((p) => p.id === pgId);
    if (pg) {
      setCurrentPg(pg);
      localStorage.setItem("currentPgId", pgId);
    }
  }

  function hasPermission(permission) {
    // Org admins have all permissions
    if (
      profile?.user_roles?.some(
        (ur) => ur.roles?.name === "Org Admin"
      )
    ) {
      return true;
    }
    return permissions.includes(permission);
  }

  return (
    <OrgContext.Provider
      value={{
        organization,
        setOrganization,
        pgs,
        setPgs,
        currentPg,
        switchPg,
        permissions,
        hasPermission,
        loading,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}
