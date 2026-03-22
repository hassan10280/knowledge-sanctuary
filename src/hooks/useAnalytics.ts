import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsEvent {
  id: string;
  event_name: string;
  user_id: string | null;
  session_id: string | null;
  payload: Record<string, any>;
  created_at: string;
}

export function useAnalyticsEvents(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return useQuery({
    queryKey: ["analytics-events", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events" as any)
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as unknown as AnalyticsEvent[];
    },
    staleTime: 60_000,
  });
}

// ─── Derived metrics ───

export function computeFunnel(events: AnalyticsEvent[]) {
  const unique = (name: string) => {
    const sessions = new Set<string>();
    events
      .filter((e) => e.event_name === name)
      .forEach((e) => sessions.add(e.session_id || e.user_id || "anon"));
    return sessions.size;
  };

  const views = unique("product_view");
  const addToCart = unique("add_to_cart");
  const checkout = unique("begin_checkout");
  const purchase = unique("order_completed");

  return [
    { step: "Product Views", count: views, rate: 100 },
    { step: "Add to Cart", count: addToCart, rate: views > 0 ? Math.round((addToCart / views) * 100) : 0 },
    { step: "Begin Checkout", count: checkout, rate: views > 0 ? Math.round((checkout / views) * 100) : 0 },
    { step: "Purchase", count: purchase, rate: views > 0 ? Math.round((purchase / views) * 100) : 0 },
  ];
}

export function computeAbandonmentRate(events: AnalyticsEvent[]): number {
  const checkoutSessions = new Set<string>();
  const purchaseSessions = new Set<string>();

  events.forEach((e) => {
    const key = e.session_id || e.user_id || "anon";
    if (e.event_name === "begin_checkout") checkoutSessions.add(key);
    if (e.event_name === "order_completed") purchaseSessions.add(key);
  });

  const abandoned = [...checkoutSessions].filter((s) => !purchaseSessions.has(s)).length;
  return checkoutSessions.size > 0 ? Math.round((abandoned / checkoutSessions.size) * 100) : 0;
}

export function computeAOV(events: AnalyticsEvent[]): number {
  const orders = events.filter((e) => e.event_name === "order_completed");
  if (orders.length === 0) return 0;
  const totalRevenue = orders.reduce((sum, e) => sum + (Number(e.payload?.final_total) || 0), 0);
  return totalRevenue / orders.length;
}

export function computeTopProducts(events: AnalyticsEvent[], limit = 10) {
  const map = new Map<string, { title: string; count: number; revenue: number }>();

  events
    .filter((e) => e.event_name === "order_completed")
    .forEach((e) => {
      const items = (e.payload?.items as Array<{ id: string; title?: string; price: number; quantity: number }>) || [];
      items.forEach((item) => {
        const existing = map.get(item.id) || { title: item.title || item.id, count: 0, revenue: 0 };
        existing.count += item.quantity;
        existing.revenue += item.price * item.quantity;
        map.set(item.id, existing);
      });
    });

  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function computeCouponStats(events: AnalyticsEvent[]) {
  const coupons = new Map<string, { uses: number; totalDiscount: number }>();

  events
    .filter((e) => e.event_name === "apply_coupon" || e.event_name === "order_completed")
    .forEach((e) => {
      const code = e.payload?.coupon_code as string;
      if (!code) return;
      const existing = coupons.get(code) || { uses: 0, totalDiscount: 0 };
      if (e.event_name === "apply_coupon") existing.uses++;
      if (e.event_name === "order_completed") {
        existing.totalDiscount += Number(e.payload?.discount_amount) || 0;
      }
      coupons.set(code, existing);
    });

  return [...coupons.entries()]
    .map(([code, stats]) => ({ code, ...stats }))
    .sort((a, b) => b.uses - a.uses);
}

export function computeRevenueByDay(events: AnalyticsEvent[]) {
  const map = new Map<string, { revenue: number; orders: number; shipping: number }>();

  events
    .filter((e) => e.event_name === "order_completed")
    .forEach((e) => {
      const day = e.created_at.slice(0, 10);
      const existing = map.get(day) || { revenue: 0, orders: 0, shipping: 0 };
      existing.revenue += Number(e.payload?.final_total) || 0;
      existing.orders++;
      existing.shipping += Number(e.payload?.shipping_cost) || 0;
      map.set(day, existing);
    });

  return [...map.entries()]
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
