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
  methodId: string;
  isFreeShipping: boolean;
  freeShippingReason: string;
  estimatedDays: string;
  /** How much more the user needs to spend to get free shipping (0 if already free or no rule) */
  amountToFreeShipping: number;
  freeShippingThreshold: number;
  /** Available shipping methods for the matched zone */
  availableMethods: Array<{ id: string; name: string; cost: number; estimatedDays: string }>;
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
      methodId: "",
      isFreeShipping: false,
      freeShippingReason: "",
      estimatedDays: "",
      amountToFreeShipping: 0,
      freeShippingThreshold: 0,
      availableMethods: [],
    };

    if (!zones?.length || !rates?.length) {
      // Fallback to old logic
      const isFree = orderTotal >= 25;
      return {
        ...defaultResult,
        shippingCost: isFree ? 0 : 3.99,
        isFreeShipping: isFree,
        freeShippingReason: isFree ? "Free shipping on orders over £25" : "",
        amountToFreeShipping: isFree ? 0 : 25 - orderTotal,
        freeShippingThreshold: 25,
      };
    }

    // ── 1. Find matching zone (improved city matching) ──
    let matchedZone = selectedZoneId ? zones.find(z => z.id === selectedZoneId && z.is_active) : null;
    if (!matchedZone && city) {
      const cityLower = city.toLowerCase().trim();
      // Exact match first
      matchedZone = zones.find(z => z.is_active && (z.locations as string[]).some(
        (loc: string) => loc.toLowerCase().trim() === cityLower
      )) || null;
      // Partial/contains match fallback
      if (!matchedZone) {
        matchedZone = zones.find(z => z.is_active && (z.locations as string[]).some(
          (loc: string) => cityLower.includes(loc.toLowerCase().trim()) || loc.toLowerCase().trim().includes(cityLower)
        )) || null;
      }
    }
    // Fallback to first active zone
    if (!matchedZone) {
      matchedZone = zones.find(z => z.is_active) || null;
    }
    if (!matchedZone) return defaultResult;

    // ── 2. Check free shipping rules (ONLY for matching role) ──
    const applicableFreeRules = (freeRules || []).filter(r => {
      if (!r.is_active) return false;
      // STRICT role filtering - retail rules NEVER apply to wholesale and vice versa
      if (r.is_wholesale !== isWholesale) return false;
      if (r.zone_id && r.zone_id !== matchedZone!.id) return false;
      return true;
    });

    let isFreeShipping = false;
    let freeShippingReason = "";
    let closestThreshold = 0;

    for (const rule of applicableFreeRules) {
      if (rule.always_free) {
        isFreeShipping = true;
        freeShippingReason = rule.name || "Free shipping";
        break;
      }
      const threshold = Number(rule.min_order_amount);
      if (orderTotal >= threshold) {
        isFreeShipping = true;
        freeShippingReason = rule.name || `Free shipping on orders over £${threshold.toFixed(0)}`;
        break;
      }
      // Track closest threshold for "X away from free shipping" message
      if (!closestThreshold || threshold < closestThreshold) {
        closestThreshold = threshold;
      }
    }

    const amountToFreeShipping = isFreeShipping ? 0 : (closestThreshold > 0 ? Math.max(0, closestThreshold - orderTotal) : 0);

    // ── 3. Build available methods for this zone + role ──
    const zoneRates = (rates || []).filter(r =>
      r.is_active && r.zone_id === matchedZone!.id && r.is_wholesale === isWholesale
    );

    const activeMethods = (methods || []).filter(m => m.is_active);
    const availableMethods: ShippingCalcResult["availableMethods"] = [];

    for (const rate of zoneRates) {
      const method = activeMethods.find(m => m.id === rate.method_id);
      if (!method) continue;
      let cost = Number(rate.flat_rate) || 0;
      if (rate.rate_type === "price_based" && rate.price_ranges) {
        const ranges = rate.price_ranges as Array<{ min: number; max: number; cost: number }>;
        const matched = ranges.find(r => orderTotal >= r.min && (r.max === 0 || orderTotal <= r.max));
        if (matched) cost = matched.cost;
      }
      availableMethods.push({
        id: method.id,
        name: method.name,
        cost: isFreeShipping ? 0 : cost,
        estimatedDays: (method as any).estimated_delivery_days || "",
      });
    }

    // ── 4. Pick selected or first method ──
    let chosenMethod = selectedMethodId
      ? availableMethods.find(m => m.id === selectedMethodId)
      : availableMethods[0];

    if (!chosenMethod && availableMethods.length > 0) {
      chosenMethod = availableMethods[0];
    }

    if (!chosenMethod) {
      // No rates for this role+zone combo, try any rate for this zone
      const fallbackRate = (rates || []).find(r => r.is_active && r.zone_id === matchedZone!.id);
      if (fallbackRate) {
        const fbMethod = activeMethods.find(m => m.id === fallbackRate.method_id);
        let cost = Number(fallbackRate.flat_rate) || 0;
        if (fallbackRate.rate_type === "price_based" && fallbackRate.price_ranges) {
          const ranges = fallbackRate.price_ranges as Array<{ min: number; max: number; cost: number }>;
          const matched = ranges.find(r => orderTotal >= r.min && (r.max === 0 || orderTotal <= r.max));
          if (matched) cost = matched.cost;
        }
        return {
          shippingCost: isFreeShipping ? 0 : cost,
          zoneName: matchedZone.name,
          methodName: fbMethod?.name || "Standard",
          methodId: fbMethod?.id || "",
          isFreeShipping,
          freeShippingReason,
          estimatedDays: (fbMethod as any)?.estimated_delivery_days || "",
          amountToFreeShipping,
          freeShippingThreshold: closestThreshold,
          availableMethods,
        };
      }
      return { ...defaultResult, zoneName: matchedZone.name, amountToFreeShipping, freeShippingThreshold: closestThreshold, availableMethods };
    }

    return {
      shippingCost: isFreeShipping ? 0 : chosenMethod.cost,
      zoneName: matchedZone.name,
      methodName: chosenMethod.name,
      methodId: chosenMethod.id,
      isFreeShipping,
      freeShippingReason,
      estimatedDays: chosenMethod.estimatedDays,
      amountToFreeShipping,
      freeShippingThreshold: closestThreshold,
      availableMethods,
    };
  };

  return { calculateShipping, zones, methods, rates, freeRules };
}
