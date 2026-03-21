import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Shipping Zones ───
export function useShippingZones() {
  return useQuery({
    queryKey: ["shipping-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_zones")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertShippingZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (zone: any) => {
      const { error } = await supabase.from("shipping_zones").upsert(zone);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-zones"] }),
  });
}

export function useDeleteShippingZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-zones"] }),
  });
}

// ─── Shipping Methods ───
export function useShippingMethods() {
  return useQuery({
    queryKey: ["shipping-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_methods")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertShippingMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (method: any) => {
      const { error } = await supabase.from("shipping_methods").upsert(method);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-methods"] }),
  });
}

export function useDeleteShippingMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-methods"] }),
  });
}

// ─── Shipping Rates ───
export function useShippingRates() {
  return useQuery({
    queryKey: ["shipping-rates-advanced"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_rates")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertShippingRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rate: any) => {
      const { error } = await supabase.from("shipping_rates").upsert(rate);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-rates-advanced"] }),
  });
}

export function useDeleteShippingRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipping-rates-advanced"] }),
  });
}

// ─── Free Shipping Rules ───
export function useFreeShippingRules() {
  return useQuery({
    queryKey: ["free-shipping-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_shipping_rules")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertFreeShippingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: any) => {
      const { error } = await supabase.from("free_shipping_rules").upsert(rule);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["free-shipping-rules"] }),
  });
}

export function useDeleteFreeShippingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("free_shipping_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["free-shipping-rules"] }),
  });
}

// ─── Shipping Calculator ───
export interface ShippingCalcResult {
  shippingCost: number;
  zoneName: string;
  methodName: string;
  isFreeShipping: boolean;
  freeShippingReason: string;
}

export function useShippingCalculator() {
  const { data: zones } = useShippingZones();
  const { data: methods } = useShippingMethods();
  const { data: rates } = useShippingRates();
  const { data: freeRules } = useFreeShippingRules();

  const calculateShipping = (
    orderTotal: number,
    isWholesale: boolean,
    city?: string,
    selectedZoneId?: string,
    selectedMethodId?: string
  ): ShippingCalcResult => {
    const defaultResult: ShippingCalcResult = {
      shippingCost: 3.99,
      zoneName: "Default",
      methodName: "Standard",
      isFreeShipping: false,
      freeShippingReason: "",
    };

    if (!zones?.length || !rates?.length) {
      // Fallback to old shipping_rules logic
      return { ...defaultResult, shippingCost: orderTotal >= 25 ? 0 : 3.99, isFreeShipping: orderTotal >= 25, freeShippingReason: orderTotal >= 25 ? "Free shipping on orders over £25" : "" };
    }

    // 1. Check free shipping rules first (highest priority)
    const applicableFreeRules = (freeRules || []).filter(r => {
      if (!r.is_active) return false;
      if (r.is_wholesale !== isWholesale) return false;
      if (r.zone_id && selectedZoneId && r.zone_id !== selectedZoneId) return false;
      return true;
    });

    for (const rule of applicableFreeRules) {
      if (rule.always_free) {
        return { ...defaultResult, shippingCost: 0, isFreeShipping: true, freeShippingReason: rule.name || "Free shipping", zoneName: zones.find(z => z.id === selectedZoneId)?.name || "All" };
      }
      if (orderTotal >= Number(rule.min_order_amount)) {
        return { ...defaultResult, shippingCost: 0, isFreeShipping: true, freeShippingReason: rule.name || `Free shipping on orders over £${Number(rule.min_order_amount).toFixed(0)}`, zoneName: zones.find(z => z.id === selectedZoneId)?.name || "All" };
      }
    }

    // 2. Find matching zone
    let matchedZone = selectedZoneId ? zones.find(z => z.id === selectedZoneId && z.is_active) : null;
    if (!matchedZone && city) {
      matchedZone = zones.find(z => z.is_active && z.locations.some((loc: string) => loc.toLowerCase() === city.toLowerCase()));
    }
    if (!matchedZone) {
      matchedZone = zones.find(z => z.is_active) || null;
    }

    if (!matchedZone) return defaultResult;

    // 3. Find matching rate for zone + method + role
    let matchedRate = rates.find(r =>
      r.is_active &&
      r.zone_id === matchedZone!.id &&
      r.is_wholesale === isWholesale &&
      (!selectedMethodId || r.method_id === selectedMethodId)
    );

    // Fallback: any rate for this zone
    if (!matchedRate) {
      matchedRate = rates.find(r => r.is_active && r.zone_id === matchedZone!.id && r.is_wholesale === isWholesale);
    }
    if (!matchedRate) {
      matchedRate = rates.find(r => r.is_active && r.zone_id === matchedZone!.id);
    }

    if (!matchedRate) return { ...defaultResult, zoneName: matchedZone.name };

    const method = methods?.find(m => m.id === matchedRate!.method_id);

    // 4. Calculate based on rate type
    let cost = Number(matchedRate.flat_rate) || 0;

    if (matchedRate.rate_type === "price_based" && matchedRate.price_ranges) {
      const ranges = matchedRate.price_ranges as Array<{ min: number; max: number; cost: number }>;
      const matchedRange = ranges.find(r => orderTotal >= r.min && (r.max === 0 || orderTotal <= r.max));
      if (matchedRange) {
        cost = matchedRange.cost;
      }
    }

    return {
      shippingCost: cost,
      zoneName: matchedZone.name,
      methodName: method?.name || "Standard",
      isFreeShipping: cost === 0,
      freeShippingReason: cost === 0 ? "Free shipping" : "",
    };
  };

  return { calculateShipping, zones, methods, rates, freeRules };
}
