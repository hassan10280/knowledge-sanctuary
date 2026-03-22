import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";

const ABANDON_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const SAVE_DEBOUNCE_MS = 5000;
const CART_RECORD_KEY = "abandoned_cart_record_id";
const CART_SESSION_KEY = "abandoned_cart_session_id";

/**
 * Get or create a persistent session ID stored in localStorage (not sessionStorage)
 * so it survives tab closes and is consistent across tabs.
 */
function getOrCreateSessionId(): string {
  let sid = localStorage.getItem(CART_SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(CART_SESSION_KEY, sid);
  }
  return sid;
}

/**
 * Tracks cart state and marks as abandoned after inactivity.
 * Saves cart snapshots to DB for admin recovery dashboard.
 *
 * Fixed bugs:
 * - sendBeacon now uses proper Supabase auth headers
 * - Guest users can update their carts via public RLS policy
 * - Session ID is in localStorage (consistent across tabs)
 * - Deduplication guard prevents double-inserts
 */
export function useAbandonedCartTracker() {
  const { items, totalPrice } = useCart();
  const { user } = useAuth();
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordIdRef = useRef<string | null>(localStorage.getItem(CART_RECORD_KEY));
  const lastSavedRef = useRef<string>("");
  const savingRef = useRef(false); // Guard against concurrent saves

  // Reset abandon timer on activity
  const resetAbandonTimer = useCallback(() => {
    if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
    if (items.length === 0) return;

    abandonTimerRef.current = setTimeout(async () => {
      const rid = recordIdRef.current;
      if (!rid) return;
      await supabase
        .from("abandoned_carts")
        .update({ status: "abandoned" })
        .eq("id", rid)
        .eq("status", "active");
    }, ABANDON_TIMEOUT_MS);
  }, [items.length]);

  // Save cart snapshot (debounced, with concurrency guard)
  const saveCartSnapshot = useCallback(async () => {
    if (savingRef.current) return;

    if (items.length === 0) {
      const rid = recordIdRef.current;
      if (rid) {
        savingRef.current = true;
        try {
          await supabase
            .from("abandoned_carts")
            .update({ status: "recovered", recovered_at: new Date().toISOString() })
            .eq("id", rid);
        } finally {
          savingRef.current = false;
        }
        recordIdRef.current = null;
        localStorage.removeItem(CART_RECORD_KEY);
        lastSavedRef.current = "";
      }
      return;
    }

    const cartData = JSON.stringify(items);
    if (cartData === lastSavedRef.current) return;

    savingRef.current = true;
    try {
      const sessionId = getOrCreateSessionId();
      const cartItems = items.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
      }));

      const rid = recordIdRef.current;
      if (rid) {
        const { error } = await supabase
          .from("abandoned_carts")
          .update({
            session_id: sessionId,
            user_id: user?.id || null,
            cart_items: cartItems as any,
            subtotal: totalPrice,
            status: "active",
          })
          .eq("id", rid);

        if (error) {
          // Record may have been deleted by admin — create new
          console.warn("[AbandonedCart] Update failed, creating new record", error.message);
          recordIdRef.current = null;
          localStorage.removeItem(CART_RECORD_KEY);
          // Will retry on next debounce cycle
          lastSavedRef.current = "";
        } else {
          lastSavedRef.current = cartData;
        }
      } else {
        const { data, error } = await supabase
          .from("abandoned_carts")
          .insert({
            session_id: sessionId,
            user_id: user?.id || null,
            cart_items: cartItems as any,
            subtotal: totalPrice,
            status: "active",
          })
          .select("id")
          .single();

        if (!error && data?.id) {
          recordIdRef.current = data.id;
          localStorage.setItem(CART_RECORD_KEY, data.id);
          lastSavedRef.current = cartData;
        }
      }
    } finally {
      savingRef.current = false;
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

  // On page close, save via sendBeacon WITH proper auth headers
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (items.length > 0 && recordIdRef.current) {
        const sessionId = getOrCreateSessionId();
        const rid = recordIdRef.current;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        // Use fetch with keepalive instead of sendBeacon for proper headers
        const url = `${supabaseUrl}/rest/v1/abandoned_carts?id=eq.${rid}`;
        const body = JSON.stringify({
          cart_items: items.map((i) => ({
            id: i.id,
            title: i.title,
            price: i.price,
            quantity: i.quantity,
          })),
          subtotal: totalPrice,
          session_id: sessionId,
          user_id: user?.id || null,
        });

        try {
          fetch(url, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body,
            keepalive: true,
          });
        } catch {
          // Silently fail — best-effort save on tab close
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [items, totalPrice, user?.id]);
}
