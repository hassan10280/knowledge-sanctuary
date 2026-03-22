import { ReactNode, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SYNC_TABLES = [
  "site_settings",
  "books",
  "categories",
  "publishers",
  "retail_discounts",
  "wholesale_discounts",
  "wholesale_quantity_tiers",
  "shipping_rules",
  "shipping_zones",
  "shipping_methods",
  "shipping_rates",
  "free_shipping_rules",
  "coupons",
  "profiles",
  "wholesale_applications",
  "orders",
  "order_items",
  "billing_addresses",
];

const DataSyncProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleSync = (table?: string) => {
      if (invalidateTimer) clearTimeout(invalidateTimer);

      invalidateTimer = setTimeout(() => {
        if (table === "site_settings") {
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: ["site_settings"] }),
            queryClient.refetchQueries({ queryKey: ["site_settings"], type: "active" }),
          ]);
          return;
        }

        queryClient.invalidateQueries();
        queryClient.refetchQueries({ type: "active" });
      }, 120);
    };

    const channel = supabase.channel("app-live-sync");

    SYNC_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        () => scheduleSync(table),
      );
    });

    channel.subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleSync();
      }
    };

    window.addEventListener("focus", scheduleSync);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (invalidateTimer) clearTimeout(invalidateTimer);
      window.removeEventListener("focus", scheduleSync);
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return <>{children}</>;
};

export default DataSyncProvider;