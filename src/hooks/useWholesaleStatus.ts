import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type WholesaleStatus = "none" | "pending" | "approved" | "rejected";

export function useWholesaleStatus(user: User | null) {
  const [status, setStatus] = useState<WholesaleStatus>("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStatus("none");
      setLoading(false);
      return;
    }

    const fetch = async () => {
      // Check if user has wholesale role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "wholesale")
        .maybeSingle();

      if (roleData) {
        setStatus("approved");
        setLoading(false);
        return;
      }

      // Check wholesale application status
      const { data: app } = await supabase
        .from("wholesale_applications")
        .select("status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (app) {
        setStatus(app.status as WholesaleStatus);
      } else {
        setStatus("none");
      }
      setLoading(false);
    };

    fetch();
  }, [user]);

  return { wholesaleStatus: status, wholesaleLoading: loading };
}
