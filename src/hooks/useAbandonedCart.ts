import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";

const ABANDON_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const SAVE_DEBOUNCE_MS = 5000;
const SESSION_KEY = "abandoned_cart_session_id";
const CART_RECORD_KEY = "abandoned_cart_record_id";

function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

/**
 * Tracks cart state and marks as abandoned after inactivity.
 * Saves cart snapshots to DB for admin recovery dashboard.
 */
export function useAbandonedCartTracker() {
  const { items, totalPrice } = useCart();
  const { user } = useAuth();
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordIdRef = useRef<string | null>(localStorage.getItem(CART_RECORD_KEY));
  const lastSavedRef = useRef<string>("");

  // Reset abandon timer on activity
  const resetAbandonTimer = useCallback(() => {
    if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
    if (items.length === 0) return;

    abandonTimerRef.current = setTimeout(async () => {
      const rid = recordIdRef.current;
      if (!rid) return;
      // Mark as abandoned
      await supabase
        .from("abandoned_carts" as any)
        .update({ status: "abandoned" } as any)
        .eq("id", rid)
        .eq("status", "active");
    }, ABANDON_TIMEOUT_MS);
  }, [items.length]);

  // Save cart snapshot (debounced)
  const saveCartSnapshot = useCallback(async () => {
    if (items.length === 0) {
      // Cart cleared → mark as recovered if record exists
      const rid = recordIdRef.current;
      if (rid) {
        await supabase
          .from("abandoned_carts" as any)
          .update({ status: "recovered", recovered_at: new Date().toISOString() } as any)
          .eq("id", rid);
        recordIdRef.current = null;
        localStorage.removeItem(CART_RECORD_KEY);
      }
      return;
    }

    const cartData = JSON.stringify(items);
    if (cartData === lastSavedRef.current) return; // No change
    lastSavedRef.current = cartData;

    const sessionId = getOrCreateSessionId();
    const payload: any = {
      session_id: sessionId,
      user_id: user?.id || null,
      cart_items: items.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
      })),
      subtotal: totalPrice,
      status: "active",
    };

    const rid = recordIdRef.current;
    if (rid) {
      // Update existing record
      await supabase
        .from("abandoned_carts" as any)
        .update(payload as any)
        .eq("id", rid);
    } else {
      // Create new record
      const { data } = await supabase
        .from("abandoned_carts" as any)
        .insert(payload as any)
        .select("id")
        .single();
      if (data && (data as any).id) {
        recordIdRef.current = (data as any).id;
        localStorage.setItem(CART_RECORD_KEY, (data as any).id);
      }
    }
  }, [items, totalPrice, user?.id]);

  // Debounced save on cart change
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveCartSnapshot, SAVE_DEBOUNCE_MS);
    resetAbandonTimer();

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [items, saveCartSnapshot, resetAbandonTimer]);

  // Reset timer on user activity
  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => resetAbandonTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [resetAbandonTimer]);

  // Mark recovered on order completion (listen for cart clear)
  // This is handled automatically when items.length becomes 0

  // On unmount / page close, save immediately
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (items.length > 0 && recordIdRef.current) {
        // Use sendBeacon for reliable save
        const sessionId = getOrCreateSessionId();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/abandoned_carts?id=eq.${recordIdRef.current}`;
        const body = JSON.stringify({
          cart_items: items.map((i) => ({ id: i.id, title: i.title, price: i.price, quantity: i.quantity })),
          subtotal: totalPrice,
          session_id: sessionId,
          user_id: user?.id || null,
        });
        navigator.sendBeacon(
          url,
          new Blob([body], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [items, totalPrice, user?.id]);
}
