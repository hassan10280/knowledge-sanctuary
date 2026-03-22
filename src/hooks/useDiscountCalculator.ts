import { useWholesaleDiscounts } from "@/hooks/useWholesale";
import { useRetailDiscounts } from "@/hooks/useRetailDiscounts";
import { useQuantityTiers } from "@/hooks/useAdvancedDiscounts";
import { useBundleDiscounts } from "@/hooks/useBundleDiscounts";
import { useStackingRules, isStackingAllowed } from "@/hooks/useStackingRules";
import { useUserRole } from "@/hooks/useWholesale";
import { useSettingsGetter } from "@/hooks/useAppSettings";
import type { CartItem, AppliedCoupon } from "@/contexts/CartContext";

export interface DiscountResult {
  originalPrice: number;
  finalPrice: number;
  discountPercent: number;
  discountSource: string;
}

/**
 * Per-book discount with strict priority:
 * Fixed Price > Product % > Publisher > Category
 * Respects max_discount_amount per discount rule.
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
      result.finalPrice = Math.max(0, Number(fixedPrice.fixed_price));
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
      let disc = originalPrice * (result.discountPercent / 100);
      if (productDiscount.max_discount_amount && disc > Number(productDiscount.max_discount_amount)) {
        disc = Number(productDiscount.max_discount_amount);
      }
      result.finalPrice = Math.max(0, originalPrice - disc);
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
        let disc = originalPrice * (result.discountPercent / 100);
        if (pubDiscount.max_discount_amount && disc > Number(pubDiscount.max_discount_amount)) {
          disc = Number(pubDiscount.max_discount_amount);
        }
        result.finalPrice = Math.max(0, originalPrice - disc);
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
        let disc = originalPrice * (result.discountPercent / 100);
        if (catDiscount.max_discount_amount && disc > Number(catDiscount.max_discount_amount)) {
          disc = Number(catDiscount.max_discount_amount);
        }
        result.finalPrice = Math.max(0, originalPrice - disc);
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
      let disc = originalPrice * (result.discountPercent / 100);
      if (productDiscount.max_discount_amount && disc > Number(productDiscount.max_discount_amount)) {
        disc = Number(productDiscount.max_discount_amount);
      }
      result.finalPrice = Math.max(0, originalPrice - disc);
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
        let disc = originalPrice * (result.discountPercent / 100);
        if (catDiscount.max_discount_amount && disc > Number(catDiscount.max_discount_amount)) {
          disc = Number(catDiscount.max_discount_amount);
        }
        result.finalPrice = Math.max(0, originalPrice - disc);
        result.discountSource = "retail_category";
        return result;
      }
    }
  }

  return result;
}

/**
 * Quantity tier discount for wholesale users.
 */
function calcQuantityTierDiscount(
  totalItems: number,
  quantityTiers: any[] | undefined,
): { percent: number; tierName: string } {
  if (!quantityTiers || quantityTiers.length === 0) return { percent: 0, tierName: "" };

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

/**
 * Bundle discount calculation.
 */
function calcBundleDiscount(
  items: CartItem[],
  bundles: any[] | undefined,
  role: string,
  itemPrices: Map<string, DiscountResult>,
): { amount: number; bundleName: string } {
  if (!bundles || bundles.length === 0) return { amount: 0, bundleName: "" };

  const now = new Date();
  const activeBundles = bundles.filter((b) => {
    if (!b.is_active) return false;
    if (b.is_wholesale && role !== "wholesale") return false;
    if (!b.is_wholesale && role === "wholesale") return false;
    if (b.start_date && new Date(b.start_date) > now) return false;
    if (b.end_date && new Date(b.end_date) < now) return false;
    return true;
  });

  let bestDiscount = 0;
  let bestName = "";

  for (const bundle of activeBundles) {
    const bundleBookIds: string[] = bundle.bundle_items?.map((i: any) => i.book_id) || [];
    if (bundleBookIds.length === 0) continue;

    const matchingItems = items.filter((item) => bundleBookIds.includes(item.id));
    const matchingQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);

    if (matchingQty >= bundle.min_qty) {
      // Use discounted item prices for bundle calculation
      const matchingTotal = matchingItems.reduce((sum, item) => {
        const ip = itemPrices.get(item.id);
        return sum + (ip?.finalPrice ?? item.price) * item.quantity;
      }, 0);

      let discount = 0;
      if (bundle.discount_type === "percentage") {
        discount = matchingTotal * (Number(bundle.discount_value) / 100);
      } else {
        discount = Number(bundle.discount_value);
      }

      if (bundle.max_discount_amount && discount > Number(bundle.max_discount_amount)) {
        discount = Number(bundle.max_discount_amount);
      }

      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestName = bundle.name;
      }
    }
  }

  return { amount: bestDiscount, bundleName: bestName };
}

/**
 * Calculate coupon discount with all validations.
 */
function calcCouponDiscount(
  coupon: AppliedCoupon | null,
  subtotal: number,
): number {
  if (!coupon || subtotal <= 0) return 0;
  let discount = 0;
  if (coupon.discount_type === "percentage") {
    discount = subtotal * (Number(coupon.discount_value) / 100);
  } else {
    discount = Math.min(Number(coupon.discount_value), subtotal);
  }
  const maxCap = Number((coupon as any).max_discount_amount);
  if (maxCap > 0 && discount > maxCap) {
    discount = maxCap;
  }
  return Math.max(0, discount);
}

export interface CartDiscountSummary {
  itemPrices: Map<string, DiscountResult>;
  subtotalAfterItemDiscounts: number;
  quantityTierPercent: number;
  quantityTierAmount: number;
  quantityTierName: string;
  bundleDiscountAmount: number;
  bundleDiscountName: string;
  discountedSubtotal: number;
  totalSavings: number;
  globalCapApplied: boolean;
  couponDiscount: number;
  grandTotal: number;
  originalSubtotal: number;
}

/**
 * Main hook: single source of truth for all discount calculations on the frontend.
 * Backend (validate-order) uses identical logic for server-side validation.
 */
export function useDiscountCalculator() {
  const { data: userRole } = useUserRole();
  const { data: wholesaleDiscounts } = useWholesaleDiscounts();
  const { data: retailDiscounts } = useRetailDiscounts();
  const { data: quantityTiers } = useQuantityTiers();
  const { data: bundles } = useBundleDiscounts();
  const { data: stackingRules } = useStackingRules();
  const { getSetting } = useSettingsGetter();

  const role = userRole || "retail";

  const getBookDiscount = (book: { id: string; price: number; publisher?: string; category?: string }): DiscountResult => {
    return calcBookDiscount(book, role, wholesaleDiscounts, retailDiscounts);
  };

  const getCartDiscounts = (
    items: CartItem[],
    bookDetails: Array<{ id: string; price: number; publisher?: string; category?: string }>,
    coupon?: AppliedCoupon | null,
    shippingCost?: number,
  ): CartDiscountSummary => {
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

    const originalSubtotal = items.reduce((sum, item) => {
      const disc = itemPrices.get(item.id);
      return sum + (disc?.originalPrice ?? item.price) * item.quantity;
    }, 0);

    // Stacking checks
    const wholesaleHasDiscount = role === "wholesale" && Array.from(itemPrices.values()).some((d) => d.discountSource !== "none");
    const wholesaleCanStack = isStackingAllowed(stackingRules, "wholesale_plus_other");

    // Bundle discount
    let bundleDiscountAmount = 0;
    let bundleDiscountName = "";

    if (!wholesaleHasDiscount || wholesaleCanStack) {
      const bundleCanStack = isStackingAllowed(stackingRules, "bundle_plus_category");
      const hasCategoryDiscount = Array.from(itemPrices.values()).some((d) => d.discountSource === "category" || d.discountSource === "retail_category");

      if (!hasCategoryDiscount || bundleCanStack) {
        const bundleResult = calcBundleDiscount(items, bundles, role, itemPrices);
        bundleDiscountAmount = bundleResult.amount;
        bundleDiscountName = bundleResult.bundleName;
      }
    }

    // Quantity tier (wholesale only)
    let quantityTierPercent = 0;
    let quantityTierAmount = 0;
    let quantityTierName = "";

    if (role === "wholesale" && (!wholesaleHasDiscount || wholesaleCanStack)) {
      const cartScopeTiers = quantityTiers?.filter((t) => t.scope === "cart");
      const tier = calcQuantityTierDiscount(totalItems, cartScopeTiers);
      if (tier.percent > 0) {
        quantityTierPercent = tier.percent;
        quantityTierAmount = subtotalAfterItemDiscounts * (tier.percent / 100);
        quantityTierName = tier.tierName;
      }
    }

    // Calculate raw discount total
    const itemLevelSavings = originalSubtotal - subtotalAfterItemDiscounts;
    let totalDiscount = itemLevelSavings + quantityTierAmount + bundleDiscountAmount;

    // Apply global cap
    const globalCapPercent = Number(getSetting("business", "global_max_discount_percent")) || 0;
    const globalCapAmount = Number(getSetting("business", "global_max_discount_amount")) || 0;
    let globalCapApplied = false;

    if (globalCapPercent > 0) {
      const maxByPercent = originalSubtotal * (globalCapPercent / 100);
      if (totalDiscount > maxByPercent) {
        totalDiscount = maxByPercent;
        globalCapApplied = true;
      }
    }
    if (globalCapAmount > 0 && totalDiscount > globalCapAmount) {
      totalDiscount = globalCapAmount;
      globalCapApplied = true;
    }

    const discountedSubtotal = Math.max(0, originalSubtotal - totalDiscount);

    // Coupon discount — check stacking rules
    let couponDiscount = 0;
    if (coupon) {
      const couponCanStack = isStackingAllowed(stackingRules, "coupon_plus_wholesale");
      if (wholesaleHasDiscount && !couponCanStack) {
        couponDiscount = 0; // Wholesale override: no coupon stacking
      } else {
        couponDiscount = calcCouponDiscount(coupon, discountedSubtotal);
      }
    }

    const shipping = shippingCost ?? 0;
    const grandTotal = Math.max(0, discountedSubtotal - couponDiscount + shipping);

    return {
      itemPrices,
      subtotalAfterItemDiscounts,
      quantityTierPercent,
      quantityTierAmount,
      quantityTierName,
      bundleDiscountAmount,
      bundleDiscountName,
      discountedSubtotal,
      totalSavings: totalDiscount,
      globalCapApplied,
      couponDiscount,
      grandTotal,
      originalSubtotal,
    };
  };

  return { getBookDiscount, getCartDiscounts, role, stackingRules };
}
