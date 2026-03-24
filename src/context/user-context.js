"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user ?? null;

        if (authUser) {
          setUser(authUser);
          const { data: profileData } = await supabase
            .from("users")
            .select("*, user_roles(*, roles(*))")
            .eq("id", authUser.id)
            .single();
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from("users")
          .select("*, user_roles(*, roles(*))")
          .eq("id", session.user.id)
          .single();
        setProfile(profileData);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, profile, loading, setProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
