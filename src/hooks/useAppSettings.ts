import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import type { Tables } from "@/integrations/supabase/types";

type SiteSettingRow = Tables<"site_settings">;

const DEFAULTS: Record<string, Record<string, unknown>> = {
  business: {
    currency: "£",
    currency_code: "GBP",
    default_shipping_cost: 3.99,
    free_shipping_threshold: 30,
    global_max_discount_percent: 0,
    global_max_discount_amount: 0,
  },
  ui_text: {
    add_to_cart: "Add to Cart",
    checkout: "Proceed to Checkout",
    place_order: "Place Order",
    empty_cart: "Your cart is empty",
    empty_cart_desc: "Browse our collection and add books to your cart.",
    order_success: "Order Placed Successfully!",
    no_results: "No books found matching your search.",
    out_of_stock: "This item is currently out of stock",
  },
  email: {
    enabled: false,
    sender_name: "MadrasahMatters",
    sender_email: "",
    order_subject: "Order Confirmation - {{order_id}}",
    order_body: `Dear {{customer_name}},\n\nThank you for your order #{{order_id}}.\n\nOrder Summary:\n{{items}}\n\nTotal: {{total}}\n\nBest regards,\nMadrasahMatters Team`,
  },
};

export function useAppSettings() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

export function useAppSetting(section: string, key: string): string {
  const { data } = useAppSettings();
  const row = data?.find((s) => s.section === section && s.key === key);
  const fallback = (DEFAULTS[section]?.[key] as string) ?? "";
  return row?.value != null ? String(row.value) : fallback;
}

export function useSettingsGetter() {
  const { data, isLoading } = useAppSettings();
  const get = useCallback(
    (section: string, key: string): unknown => {
      const row = data?.find((s) => s.section === section && s.key === key);
      return row?.value ?? DEFAULTS[section]?.[key] ?? "";
    },
    [data],
  );
  return { getSetting: get, isLoading };
}

export function useUpdateAppSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ section, key, value }: { section: string; key: string; value: unknown }) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ section, key, value: value as never, updated_at: new Date().toISOString() }, { onConflict: "section,key" });
      if (error) throw error;
    },
    onMutate: ({ section, key, value }) => {
      qc.setQueryData<SiteSettingRow[]>(["site_settings"], (current) => {
        const merged = [...(current ?? [])];
        const index = merged.findIndex((row) => row.section === section && row.key === key);
        const nextRow: SiteSettingRow = {
          id: index >= 0 ? merged[index].id : crypto.randomUUID(),
          section,
          key,
          value: value as SiteSettingRow["value"],
          updated_at: new Date().toISOString(),
          updated_by: index >= 0 ? merged[index].updated_by : null,
        };

        if (index >= 0) merged[index] = { ...merged[index], ...nextRow };
        else merged.push(nextRow);

        return merged;
      });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["site_settings"] });
    },
  });
}

export function useUpdateAppSettingsBatch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ section, entries }: { section: string; entries: Array<{ key: string; value: unknown }> }) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          entries.map(({ key, value }) => ({
            section,
            key,
            value: value as never,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "section,key" },
        );

      if (error) throw error;
    },
    onMutate: ({ section, entries }) => {
      qc.setQueryData<SiteSettingRow[]>(["site_settings"], (current) => {
        const merged = [...(current ?? [])];

        entries.forEach(({ key, value }) => {
          const index = merged.findIndex((row) => row.section === section && row.key === key);
          const nextRow: SiteSettingRow = {
            id: index >= 0 ? merged[index].id : crypto.randomUUID(),
            section,
            key,
            value: value as SiteSettingRow["value"],
            updated_at: new Date().toISOString(),
            updated_by: index >= 0 ? merged[index].updated_by : null,
          };

          if (index >= 0) merged[index] = { ...merged[index], ...nextRow };
          else merged.push(nextRow);
        });

        return merged;
      });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["site_settings"] });
    },
  });
}

export function useSettingsDefaults() {
  return DEFAULTS;
}
