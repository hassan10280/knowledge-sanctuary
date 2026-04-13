import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createGuestCartClient } from "@/lib/guest-cart-client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";

const ABANDON_TIMEOUT_MS = 20 * 60 * 1000;
const SAVE_DEBOUNCE_MS = 5000;
const CART_RECORD_KEY = "abandoned_cart_record_id";
const CART_SESSION_KEY = "abandoned_cart_session_id";

function getOrCreateSessionId(): string {
  let sid = localStorage.getItem(CART_SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(CART_SESSION_KEY, sid);
  }
  return sid;
}

/** Returns the appropriate Supabase client — with x-session-id header for guests */
function getCartClient(userId: string | undefined) {
  if (userId) return supabase;
  return createGuestCartClient(getOrCreateSessionId());
}

export function useAbandonedCartTracker() {
  const { items, totalPrice } = useCart();
  const { user } = useAuth();
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordIdRef = useRef<string | null>(localStorage.getItem(CART_RECORD_KEY));
  const lastSavedRef = useRef<string>("");
  const savingRef = useRef(false);

  const resetAbandonTimer = useCallback(() => {
    if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
    if (items.length === 0) return;

    abandonTimerRef.current = setTimeout(async () => {
      const rid = recordIdRef.current;
      if (!rid) return;
      const client = getCartClient(user?.id);
      await client
        .from("abandoned_carts")
        .update({ status: "abandoned" })
        .eq("id", rid)
        .eq("status", "active");
    }, ABANDON_TIMEOUT_MS);
  }, [items.length, user?.id]);

  const saveCartSnapshot = useCallback(async () => {
    if (savingRef.current) return;

    if (items.length === 0) {
      const rid = recordIdRef.current;
      if (rid) {
        savingRef.current = true;
        try {
          const client = getCartClient(user?.id);
          await client
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

      const client = getCartClient(user?.id);
      const rid = recordIdRef.current;

      if (rid) {
        const { error } = await client
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
          console.warn("[AbandonedCart] Update failed, creating new record", error.message);
          recordIdRef.current = null;
          localStorage.removeItem(CART_RECORD_KEY);
          lastSavedRef.current = "";
        } else {
          lastSavedRef.current = cartData;
        }
      } else {
        // INSERT uses the default client — public INSERT is allowed for all
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

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveCartSnapshot, SAVE_DEBOUNCE_MS);
    resetAbandonTimer();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [items, saveCartSnapshot, resetAbandonTimer]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => resetAbandonTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [resetAbandonTimer]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (items.length > 0 && recordIdRef.current) {
        const sessionId = getOrCreateSessionId();
        const rid = recordIdRef.current;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Prefer: "return=minimal",
              "x-session-id": sessionId,
            },
            body,
            keepalive: true,
          });
        } catch {
          // Best-effort save on tab close
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [items, totalPrice, user?.id]);
}
