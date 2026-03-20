"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserWithTenant } from "@/lib/types/database";

export function useUser() {
  const [user, setUser] = useState<UserWithTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("*, tenant:tenants(*)")
        .eq("id", authUser.id)
        .single();

      setUser(profile as unknown as UserWithTenant | null);
      setLoading(false);
    }

    fetchUser();
  }, [supabase]);

  return { user, loading };
}
