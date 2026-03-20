import { useWholesaleDiscounts } from "@/hooks/useWholesale";
import { useRetailDiscounts } from "@/hooks/useRetailDiscounts";
import { useQuantityTiers } from "@/hooks/useAdvancedDiscounts";
import { useUserRole } from "@/hooks/useWholesale";
import type { CartItem } from "@/contexts/CartContext";

export interface DiscountResult {
  originalPrice: number;
  finalPrice: number;
  discountPercent: number;
  discountSource: string; // "fixed_price" | "product" | "publisher" | "category" | "quantity" | "retail_product" | "retail_category" | "none"
}

/**
 * Calculates the effective price for a single book based on discount priority:
 * 
 * WHOLESALE priority:
 *   1. Fixed Price Override
 *   2. Product-based Discount
 *   3. Publisher-based Discount
 *   4. Category-based Discount
 *   (Quantity tier is applied at cart level, not per-book)
 * 
 * RETAIL priority:
 *   1. Product-based Discount
 *   2. Category-based Discount
 */
function calcBookDiscount(
  book: { id: string; price: number; publisher?: string; category?: string },
  role: string,
  wholesaleDiscounts: any[] | undefined,
  retailDiscounts: any[] | undefined,
): DiscountResult {
  const originalPrice = Number(book.price);
  const result: DiscountResult = {
    originalPrice,
    finalPrice: originalPrice,
    discountPercent: 0,
    discountSource: "none",
  };

  if (role === "wholesale" && wholesaleDiscounts) {
    // 1. Fixed Price Override
    const fixedPrice = wholesaleDiscounts.find(
      (d) => d.discount_type === "product" && d.book_id === book.id && d.fixed_price && Number(d.fixed_price) > 0
    );
    if (fixedPrice) {
      result.finalPrice = Number(fixedPrice.fixed_price);
      result.discountPercent = Math.round(((originalPrice - result.finalPrice) / originalPrice) * 100);
      result.discountSource = "fixed_price";
      return result;
    }

    // 2. Product-based Discount
    const productDiscount = wholesaleDiscounts.find(
      (d) => d.discount_type === "product" && d.book_id === book.id && Number(d.discount_percent) > 0
    );
    if (productDiscount) {
      result.discountPercent = Number(productDiscount.discount_percent);
      result.finalPrice = originalPrice * (1 - result.discountPercent / 100);
      result.discountSource = "product";
      return result;
    }

    // 3. Publisher-based Discount
    if (book.publisher) {
      const pubDiscount = wholesaleDiscounts.find(
        (d) => d.discount_type === "publisher" && d.reference_value === book.publisher
      );
      if (pubDiscount && Number(pubDiscount.discount_percent) > 0) {
        result.discountPercent = Number(pubDiscount.discount_percent);
        result.finalPrice = originalPrice * (1 - result.discountPercent / 100);
        result.discountSource = "publisher";
        return result;
      }
    }

    // 4. Category-based Discount
    if (book.category) {
      const catDiscount = wholesaleDiscounts.find(
        (d) => d.discount_type === "category" && d.reference_value === book.category
      );
      if (catDiscount && Number(catDiscount.discount_percent) > 0) {
        result.discountPercent = Number(catDiscount.discount_percent);
        result.finalPrice = originalPrice * (1 - result.discountPercent / 100);
        result.discountSource = "category";
        return result;
      }
    }
  }

  if (role !== "wholesale" && retailDiscounts) {
    const now = new Date();
    const activeRetail = retailDiscounts.filter((d) => {
      if (!d.is_active) return false;
      if (d.start_date && new Date(d.start_date) > now) return false;
      if (d.end_date && new Date(d.end_date) < now) return false;
      return true;
    });

    // 1. Product-based Discount
    const productDiscount = activeRetail.find(
      (d) => d.discount_type === "product" && d.book_id === book.id
    );
    if (productDiscount && Number(productDiscount.discount_percent) > 0) {
      result.discountPercent = Number(productDiscount.discount_percent);
      result.finalPrice = originalPrice * (1 - result.discountPercent / 100);
      result.discountSource = "retail_product";
      return result;
    }

    // 2. Category-based Discount
    if (book.category) {
      const catDiscount = activeRetail.find(
        (d) => d.discount_type === "category" && d.reference_value === book.category
      );
      if (catDiscount && Number(catDiscount.discount_percent) > 0) {
        result.discountPercent = Number(catDiscount.discount_percent);
        result.finalPrice = originalPrice * (1 - result.discountPercent / 100);
        result.discountSource = "retail_category";
        return result;
      }
    }
  }

  return result;
}

/**
 * Calculate quantity tier discount for wholesale users (applied after per-book discounts).
 * Priority level 5 — only if no higher-priority discount already reduced the price.
 */
function calcQuantityTierDiscount(
  totalItems: number,
  quantityTiers: any[] | undefined,
): { percent: number; tierName: string } {
  if (!quantityTiers || quantityTiers.length === 0) return { percent: 0, tierName: "" };

  // Find the best matching tier
  const applicable = quantityTiers
    .filter((t) => totalItems >= t.min_qty && (!t.max_qty || totalItems <= t.max_qty))
    .sort((a, b) => Number(b.discount_percent) - Number(a.discount_percent));

  if (applicable.length > 0) {
    return {
      percent: Number(applicable[0].discount_percent),
      tierName: `${applicable[0].min_qty}–${applicable[0].max_qty || "∞"} qty`,
    };
  }
  return { percent: 0, tierName: "" };
}

export interface CartDiscountSummary {
  /** Per-item discounted prices */
  itemPrices: Map<string, DiscountResult>;
  /** Subtotal after per-item discounts */
  subtotalAfterItemDiscounts: number;
  /** Quantity tier discount (wholesale only, cart-scope) */
  quantityTierPercent: number;
  quantityTierAmount: number;
  quantityTierName: string;
  /** Grand subtotal after all product-level discounts (before coupon/shipping) */
  discountedSubtotal: number;
}

/**
 * Main hook: provides discount calculation for both individual books and full cart.
 */
export function useDiscountCalculator() {
  const { data: userRole } = useUserRole();
  const { data: wholesaleDiscounts } = useWholesaleDiscounts();
  const { data: retailDiscounts } = useRetailDiscounts();
  const { data: quantityTiers } = useQuantityTiers();

  const role = userRole || "retail";

  /** Calculate discount for a single book (used in BookGrid display) */
  const getBookDiscount = (book: { id: string; price: number; publisher?: string; category?: string }): DiscountResult => {
    return calcBookDiscount(book, role, wholesaleDiscounts, retailDiscounts);
  };

  /** Calculate full cart discounts with priority system */
  const getCartDiscounts = (items: CartItem[], bookDetails: Array<{ id: string; price: number; publisher?: string; category?: string }>): CartDiscountSummary => {
    const itemPrices = new Map<string, DiscountResult>();
    let subtotalAfterItemDiscounts = 0;
    let totalItems = 0;

    for (const item of items) {
      const bookInfo = bookDetails.find((b) => b.id === item.id) || {
        id: item.id,
        price: item.price,
      };
      const discount = calcBookDiscount(bookInfo, role, wholesaleDiscounts, retailDiscounts);
      itemPrices.set(item.id, discount);
      subtotalAfterItemDiscounts += discount.finalPrice * item.quantity;
      totalItems += item.quantity;
    }

    // 5. Quantity tier (wholesale only, cart-scope)
    let quantityTierPercent = 0;
    let quantityTierAmount = 0;
    let quantityTierName = "";

    if (role === "wholesale") {
      const cartScopeTiers = quantityTiers?.filter((t) => t.scope === "cart");
      const tier = calcQuantityTierDiscount(totalItems, cartScopeTiers);
      if (tier.percent > 0) {
        quantityTierPercent = tier.percent;
        quantityTierAmount = subtotalAfterItemDiscounts * (tier.percent / 100);
        quantityTierName = tier.tierName;
      }
    }

    const discountedSubtotal = subtotalAfterItemDiscounts - quantityTierAmount;

    return {
      itemPrices,
      subtotalAfterItemDiscounts,
      quantityTierPercent,
      quantityTierAmount,
      quantityTierName,
      discountedSubtotal,
    };
  };

  return { getBookDiscount, getCartDiscounts, role };
}
