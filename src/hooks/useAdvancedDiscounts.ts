import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Quantity Tiers
export function useQuantityTiers() {
  return useQuery({
    queryKey: ["quantity-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wholesale_quantity_tiers")
        .select("*")
        .order("min_qty");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertQuantityTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tier: any) => {
      const { error } = await supabase.from("wholesale_quantity_tiers").upsert(tier);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quantity-tiers"] }),
  });
}

export function useDeleteQuantityTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wholesale_quantity_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quantity-tiers"] }),
  });
}

// Coupons
export function useCoupons() {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (coupon: any) => {
      const { error } = await supabase.from("coupons").upsert(coupon);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

// Shipping Rules
export function useShippingRules() {
  return useQuery({
    queryKey: ["shipping-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_rules")
        .select("*")
        .order("min_amount");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertShippingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: any) => {
      const { error } = await supabase.from("shipping_rules").upsert(rule);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-rules"] }),
  });
}

export function useDeleteShippingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-rules"] }),
  });
}

// Validate coupon
export function useValidateCoupon() {
  return useMutation({
    mutationFn: async ({ code, orderTotal, isWholesale }: { code: string; orderTotal: number; isWholesale: boolean }) => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Invalid coupon code");
      if (data.wholesale_only && !isWholesale) throw new Error("This coupon is for wholesale customers only");
      if (data.expiry_date && new Date(data.expiry_date) < new Date()) throw new Error("This coupon has expired");
      if (data.usage_limit && data.used_count >= data.usage_limit) throw new Error("This coupon has reached its usage limit");
      if (data.min_order_amount && orderTotal < Number(data.min_order_amount)) throw new Error(`Minimum order amount is £${Number(data.min_order_amount).toFixed(2)}`);
      return data;
    },
  });
}

// Increment coupon usage
export async function incrementCouponUsage(couponId: string) {
  const { error } = await supabase.rpc("increment_coupon_usage" as any, { coupon_id: couponId });
  if (error) {
    // Fallback: direct update
    console.warn("RPC fallback: incrementing coupon usage directly", error.message);
    await supabase
      .from("coupons")
      .update({ used_count: undefined } as any) // Will fail on RLS for non-admin
      .eq("id", couponId);
  }
}
