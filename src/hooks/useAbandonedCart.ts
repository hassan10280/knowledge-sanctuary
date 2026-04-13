import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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

/** Update guest cart via secure edge function (server-side session validation) */
async function guestCartUpdate(recordId: string, sessionId: string, data: Record<string, unknown>) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/guest-cart-update`;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      action: "update",
      record_id: recordId,
      session_id: sessionId,
      ...data,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Guest cart update failed");
  }
  return res.json();
}

export function useAbandonedCartTracker() {
  const { items, totalPrice } = useCart();
  const { user } = useAuth();
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordIdRef = useRef<string | null>(localStorage.getItem(CART_RECORD_KEY));
  const lastSavedRef = useRef<string>("");
  const savingRef = useRef(false);

  const updateCart = useCallback(async (rid: string, data: Record<string, unknown>) => {
    if (user?.id) {
      // Authenticated users update directly via RLS
      const { error } = await supabase
        .from("abandoned_carts")
        .update(data as any)
        .eq("id", rid);
      if (error) throw error;
    } else {
      // Guest users go through secure edge function
      await guestCartUpdate(rid, getOrCreateSessionId(), data);
    }
  }, [user?.id]);

  const resetAbandonTimer = useCallback(() => {
    if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current);
    if (items.length === 0) return;

    abandonTimerRef.current = setTimeout(async () => {
      const rid = recordIdRef.current;
      if (!rid) return;
      try {
        await updateCart(rid, { status: "abandoned" });
      } catch (e) {
        console.warn("[AbandonedCart] Failed to mark abandoned", e);
      }
    }, ABANDON_TIMEOUT_MS);
  }, [items.length, updateCart]);

  const saveCartSnapshot = useCallback(async () => {
    if (savingRef.current) return;

    if (items.length === 0) {
      const rid = recordIdRef.current;
      if (rid) {
        savingRef.current = true;
        try {
          await updateCart(rid, { status: "recovered", recovered_at: new Date().toISOString() });
        } catch {
          // best effort
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
        try {
          await updateCart(rid, {
            session_id: sessionId,
            user_id: user?.id || null,
            cart_items: cartItems,
            subtotal: totalPrice,
            status: "active",
          });
          lastSavedRef.current = cartData;
        } catch (e) {
          console.warn("[AbandonedCart] Update failed, will create new record:", e);
          recordIdRef.current = null;
          localStorage.removeItem(CART_RECORD_KEY);
          lastSavedRef.current = "";
          // Immediately try to create a new record
          savingRef.current = false;
          return saveCartSnapshot();
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
  }, [items, totalPrice, user?.id, updateCart]);

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
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (user?.id) {
          // Authenticated: direct REST API
          const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/abandoned_carts?id=eq.${rid}`;
          try {
            fetch(url, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                cart_items: items.map((i) => ({
                  id: i.id, title: i.title, price: i.price, quantity: i.quantity,
                })),
                subtotal: totalPrice,
              }),
              keepalive: true,
            });
          } catch { /* best-effort */ }
        } else {
          // Guest: edge function
          const url = `https://${projectId}.supabase.co/functions/v1/guest-cart-update`;
          try {
            fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                action: "update",
                record_id: rid,
                session_id: sessionId,
                cart_items: items.map((i) => ({
                  id: i.id, title: i.title, price: i.price, quantity: i.quantity,
                })),
                subtotal: totalPrice,
              }),
              keepalive: true,
            });
          } catch { /* best-effort */ }
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [items, totalPrice, user?.id]);
}
