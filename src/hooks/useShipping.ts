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
export interface AvailableMethod {
  id: string;
  name: string;
  cost: number;
  originalCost: number; // cost before free shipping applied
  estimatedDays: string;
  isCheapest: boolean;
}

export interface ShippingCalcResult {
  shippingCost: number;
  zoneName: string;
  methodName: string;
  methodId: string;
  isFreeShipping: boolean;
  freeShippingReason: string;
  estimatedDays: string;
  amountToFreeShipping: number;
  freeShippingThreshold: number;
  availableMethods: AvailableMethod[];
  /** Smart suggestion text for user */
  smartSuggestion: string;
  /** Whether an admin override was applied */
  isOverride: boolean;
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
    selectedMethodId?: string,
    /** Admin override cost — highest priority when set */
    overrideCost?: number | null
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
      smartSuggestion: "",
      isOverride: false,
    };

    // ── PRIORITY 0: Admin override (highest priority) ──
    if (overrideCost !== undefined && overrideCost !== null) {
      return {
        ...defaultResult,
        shippingCost: overrideCost,
        isFreeShipping: overrideCost === 0,
        freeShippingReason: overrideCost === 0 ? "Free shipping (admin override)" : "",
        isOverride: true,
      };
    }

    if (!zones?.length || !rates?.length) {
      const isFree = orderTotal >= 25;
      return {
        ...defaultResult,
        shippingCost: isFree ? 0 : 3.99,
        isFreeShipping: isFree,
        freeShippingReason: isFree ? "Free shipping on orders over £25" : "",
        amountToFreeShipping: isFree ? 0 : Math.max(0, 25 - orderTotal),
        freeShippingThreshold: 25,
      };
    }

    // ── 1. Find matching zone (strict city matching) ──
    let matchedZone = selectedZoneId
      ? zones.find(z => z.id === selectedZoneId && z.is_active)
      : null;

    if (!matchedZone && city) {
      const cityNorm = city.toLowerCase().trim();
      if (cityNorm.length >= 2) {
        // Pass 1: Exact match only (case-insensitive, trimmed)
        matchedZone = zones.find(z =>
          z.is_active &&
          (z.locations as string[]).some(loc => loc.toLowerCase().trim() === cityNorm)
        ) || null;

        // Pass 2: Strict word-boundary match (city must start with location or vice versa, min 3 chars)
        if (!matchedZone && cityNorm.length >= 3) {
          matchedZone = zones.find(z =>
            z.is_active &&
            (z.locations as string[]).some(loc => {
              const locNorm = loc.toLowerCase().trim();
              if (locNorm.length < 3) return false;
              return cityNorm.startsWith(locNorm) || locNorm.startsWith(cityNorm);
            })
          ) || null;
        }
      }
    }

    // Fallback to first active zone (never match randomly)
    if (!matchedZone) {
      matchedZone = zones.find(z => z.is_active) || null;
    }
    if (!matchedZone) return defaultResult;

    // ── 2. Check free shipping rules (strict role isolation) ──
    const applicableFreeRules = (freeRules || []).filter(r => {
      if (!r.is_active) return false;
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
      if (!closestThreshold || threshold < closestThreshold) {
        closestThreshold = threshold;
      }
    }

    const amountToFreeShipping = isFreeShipping
      ? 0
      : closestThreshold > 0
        ? Math.max(0, closestThreshold - orderTotal)
        : 0;

    // ── 3. Build available methods for zone + role ──
    const zoneRates = (rates || []).filter(r =>
      r.is_active && r.zone_id === matchedZone!.id && r.is_wholesale === isWholesale
    );

    const activeMethods = (methods || []).filter(m => m.is_active);
    const availableMethods: AvailableMethod[] = [];

    for (const rate of zoneRates) {
      const method = activeMethods.find(m => m.id === rate.method_id);
      if (!method) continue;
      let originalCost = Number(rate.flat_rate) || 0;
      if (rate.rate_type === "price_based" && rate.price_ranges) {
        const ranges = rate.price_ranges as Array<{ min: number; max: number; cost: number }>;
        const matched = ranges.find(r => orderTotal >= r.min && (r.max === 0 || orderTotal <= r.max));
        if (matched) originalCost = matched.cost;
      }
      availableMethods.push({
        id: method.id,
        name: method.name,
        originalCost,
        cost: isFreeShipping ? 0 : originalCost,
        estimatedDays: (method as any).estimated_delivery_days || "",
        isCheapest: false,
      });
    }

    // Mark cheapest method
    if (availableMethods.length > 1) {
      const minCost = Math.min(...availableMethods.map(m => m.cost));
      availableMethods.forEach(m => {
        m.isCheapest = m.cost === minCost;
      });
    }

    // ── 4. Pick selected or cheapest method ──
    let chosenMethod = selectedMethodId
      ? availableMethods.find(m => m.id === selectedMethodId)
      : null;

    if (!chosenMethod && availableMethods.length > 0) {
      // Default to cheapest
      chosenMethod = availableMethods.reduce((a, b) => a.cost <= b.cost ? a : b);
    }

    // ── 5. Smart suggestion ──
    let smartSuggestion = "";
    if (chosenMethod && availableMethods.length > 1) {
      const cheapest = availableMethods.reduce((a, b) => a.cost < b.cost ? a : b);
      if (cheapest.id !== chosenMethod.id && cheapest.cost < chosenMethod.cost) {
        const saving = chosenMethod.cost - cheapest.cost;
        smartSuggestion = `💡 Switch to "${cheapest.name}" to save £${saving.toFixed(2)}`;
      }
    }
    if (!smartSuggestion && !isFreeShipping && amountToFreeShipping > 0 && amountToFreeShipping <= 20) {
      smartSuggestion = `🚚 Add £${amountToFreeShipping.toFixed(2)} more for free shipping!`;
    }

    if (!chosenMethod) {
      // Fallback: any rate for this zone
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
          smartSuggestion,
          isOverride: false,
        };
      }
      return {
        ...defaultResult,
        zoneName: matchedZone.name,
        amountToFreeShipping,
        freeShippingThreshold: closestThreshold,
        availableMethods,
        smartSuggestion,
      };
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
      smartSuggestion,
      isOverride: false,
    };
  };

  return { calculateShipping, zones, methods, rates, freeRules };
}
