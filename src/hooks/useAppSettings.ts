import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

// Default values for all configurable settings
const DEFAULTS: Record<string, Record<string, unknown>> = {
  store: {
    store_name: "MadrasahMatters",
    currency: "£",
    currency_code: "GBP",
    contact_email: "",
    contact_phone: "",
    default_shipping_cost: 3.99,
    free_shipping_threshold: 30,
  },
  ui_text: {
    add_to_cart: "Add to Cart",
    buy_now: "Buy Now",
    checkout: "Proceed to Checkout",
    place_order: "Place Order",
    empty_cart: "Your cart is empty",
    empty_cart_desc: "Browse our collection and add books to your cart.",
    order_success_title: "Order Placed Successfully!",
    order_success_desc: "Thank you for your order. We will process it shortly.",
    search_placeholder: "Search books, authors...",
    login_title: "Welcome Back",
    signup_title: "Create Account",
    no_results: "No books found matching your search.",
  },
  email: {
    enabled: false,
    sender_name: "MadrasahMatters",
    sender_email: "",
    order_confirmation_subject: "Order Confirmation - {{order_id}}",
    order_confirmation_body: `Dear {{customer_name}},

Thank you for your order #{{order_id}}.

Order Summary:
{{items}}

Subtotal: {{subtotal}}
Discount: {{discount}}
Shipping: {{shipping}}
Total: {{total}}

Transaction ID: {{transaction_id}}

We will process your order shortly.

Best regards,
MadrasahMatters Team`,
  },
  messages: {
    shipping_estimate_note: "Final shipping will be calculated at checkout",
    price_updated: "Prices updated",
    prices_syncing: "Updating prices...",
    coupon_applied: "Coupon applied successfully!",
    coupon_invalid: "Invalid coupon code",
    coupon_expired: "This coupon has expired",
    coupon_already_used: "You have already used this coupon",
    out_of_stock: "This item is currently out of stock",
    order_placed: "Order placed successfully!",
    login_required: "Please sign in to continue",
    address_required: "Please provide a valid address",
    txn_id_required: "Please enter your transaction ID",
    txn_id_invalid: "Transaction ID must be 4-50 characters",
    txn_id_duplicate: "This transaction ID has already been used",
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

/**
 * Get a single setting value with a fallback default.
 * Usage: const text = useAppSetting("ui_text", "add_to_cart");
 */
export function useAppSetting(section: string, key: string): string {
  const { data } = useAppSettings();
  const setting = data?.find((s) => s.section === section && s.key === key);
  const fallback = (DEFAULTS[section]?.[key] as string) ?? "";
  return setting?.value != null ? String(setting.value) : fallback;
}

/**
 * Returns a getter function that resolves settings with defaults.
 * Useful when you need multiple settings without multiple hooks.
 */
export function useSettingsGetter() {
  const { data, isLoading } = useAppSettings();

  const getSetting = useCallback(
    (section: string, key: string): unknown => {
      const setting = data?.find((s) => s.section === section && s.key === key);
      if (setting?.value != null) return setting.value;
      return DEFAULTS[section]?.[key] ?? "";
    },
    [data]
  );

  return { getSetting, isLoading };
}

export function useUpdateAppSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      section,
      key,
      value,
    }: {
      section: string;
      key: string;
      value: unknown;
    }) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          {
            section,
            key,
            value: value as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "section,key" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_settings"] }),
  });
}

export function useSettingsDefaults() {
  return DEFAULTS;
}
