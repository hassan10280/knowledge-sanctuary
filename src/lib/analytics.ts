import { supabase } from "@/integrations/supabase/client";

// ─── Session ID (for guests) ───
let _sessionId: string | null = null;
function getSessionId(): string {
  if (_sessionId) return _sessionId;
  _sessionId = sessionStorage.getItem("analytics_session_id");
  if (!_sessionId) {
    _sessionId = crypto.randomUUID();
    sessionStorage.setItem("analytics_session_id", _sessionId);
  }
  return _sessionId;
}

// ─── Dedup guard ───
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 2000;

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const last = recentEvents.get(key);
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  recentEvents.set(key, now);
  // Clean old entries periodically
  if (recentEvents.size > 100) {
    for (const [k, v] of recentEvents) {
      if (now - v > DEDUP_WINDOW_MS * 5) recentEvents.delete(k);
    }
  }
  return false;
}

// ─── Types ───
export type AnalyticsEventName =
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "apply_coupon"
  | "begin_checkout"
  | "shipping_selected"
  | "payment_started"
  | "order_completed";

export interface AnalyticsPayload {
  items?: Array<{ id: string; price: number; quantity: number; title?: string }>;
  subtotal?: number;
  discount_amount?: number;
  shipping_cost?: number;
  final_total?: number;
  coupon_code?: string | null;
  shipping_method?: string | null;
  address_city?: string | null;
  product_id?: string;
  product_title?: string;
  product_price?: number;
  order_id?: string;
  [key: string]: unknown;
}

const IS_DEV = import.meta.env.DEV;

/**
 * Track an analytics event. Non-blocking, fire-and-forget.
 * Deduplicates events within 2s window.
 * Debug logs in development only.
 */
export function trackEvent(
  eventName: AnalyticsEventName,
  payload: AnalyticsPayload = {},
  userId?: string | null,
): void {
  // Dedup key = eventName + productId/orderId + items hash
  const dedupKey = `${eventName}:${payload.product_id || ""}:${payload.order_id || ""}:${
    payload.items?.map((i) => i.id).join(",") || ""
  }`;
  if (isDuplicate(dedupKey)) {
    if (IS_DEV) console.log(`[Analytics] DEDUP skipped: ${eventName}`);
    return;
  }

  // Sanitize: never store sensitive data
  const sanitized = { ...payload };
  delete sanitized.payment_details;
  delete sanitized.card_number;
  delete sanitized.cvv;
  delete sanitized.password;

  const sessionId = getSessionId();

  if (IS_DEV) {
    console.log(`[Analytics] ${eventName}`, { userId, sessionId, ...sanitized });
  }

  // Fire and forget — never block UI
  supabase
    .from("analytics_events" as any)
    .insert({
      event_name: eventName,
      user_id: userId || null,
      session_id: sessionId,
      payload: sanitized,
    } as any)
    .then(({ error }) => {
      if (error && IS_DEV) {
        console.warn(`[Analytics] Failed to store ${eventName}:`, error.message);
      }
    });
}
