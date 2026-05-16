import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "staff";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubCode, setClubCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadRole = async (currentUser: User | null) => {
      if (!currentUser) {
        if (!cancelled) {
          setRole(null);
          setClubId(null);
          setClubCode(null);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role, club_id, clubs(code)")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (!cancelled) {
        setRole((data?.role as AppRole) ?? null);
        setClubId(data?.club_id ?? null);
        setClubCode(((data?.clubs as { code?: string } | null)?.code) ?? null);
        setLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => void loadRole(s?.user ?? null), 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      void loadRole(s?.user ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, role, clubId, clubCode, loading, isAdmin: role === "admin" };
}
