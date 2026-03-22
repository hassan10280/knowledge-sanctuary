import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export interface CartItem {
  id: string;
  title: string;
  author: string;
  price: number;
  cover_color: string;
  quantity: number;
}

export interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  pricesSyncing: boolean;
  lastSyncedAt: number | null;
}

const CART_STORAGE_KEY = "madrasah_cart";
const COUPON_STORAGE_KEY = "madrasah_coupon";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage(CART_STORAGE_KEY, []));
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(() => loadFromStorage(COUPON_STORAGE_KEY, null));
  const [pricesSyncing, setPricesSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [itemCount, setItemCount] = useState(items.length);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    setItemCount(items.length);
  }, [items]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    }
  }, [appliedCoupon]);

  const syncPrices = useCallback(async () => {
    if (items.length === 0) return;
    const ids = items.map((i) => i.id);
    setPricesSyncing(true);
    try {
      const { data } = await supabase.from("books").select("id, price, title, author").in("id", ids);
      if (data && data.length > 0) {
        setItems((prev) => {
          let changed = false;
          const next = prev.map((item) => {
            const fresh = data.find((b: { id: string; price: number | null; title: string; author: string }) => b.id === item.id);
            if (fresh && Number(fresh.price) !== item.price) {
              changed = true;
              return { ...item, price: Number(fresh.price), title: fresh.title, author: fresh.author };
            }
            return item;
          });
          if (changed) setLastSyncedAt(Date.now());
          return changed ? next : prev;
        });
      }
    } catch {
      // silent
    }
    setPricesSyncing(false);
  }, [itemCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (itemCount > 0) syncPrices();
  }, [itemCount, syncPrices]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && items.length > 0) {
        syncPrices();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [syncPrices, items.length]);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return removeItem(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setLastSyncedAt(null);
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(COUPON_STORAGE_KEY);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        appliedCoupon,
        setAppliedCoupon,
        pricesSyncing,
        lastSyncedAt,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
