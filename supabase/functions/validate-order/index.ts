import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderItem {
  book_id: string;
  quantity: number;
  claimed_price: number;
}

interface OrderPayload {
  items: OrderItem[];
  coupon_code?: string;
  shipping_method_id?: string;
  city: string;
  is_wholesale: boolean;
  claimed_subtotal: number;
  claimed_coupon_discount: number;
  claimed_shipping: number;
  claimed_total: number;
}

function isStackingAllowed(rules: any[], ruleKey: string): boolean {
  const rule = rules.find((r: any) => r.rule_key === ruleKey);
  return rule ? rule.allowed : false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use getClaims for JWT verification (faster, no network call)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const payload: OrderPayload = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);

    // Validate payload
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return new Response(
        JSON.stringify({ valid: false, error: "Empty order" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch books
    const bookIds = payload.items.map((i) => i.book_id);
    const { data: books, error: booksErr } = await admin
      .from("books")
      .select("id, price, publisher, category, in_stock")
      .in("id", bookIds);
    if (booksErr) throw booksErr;

    // Validate all books exist
    if (!books || books.length !== bookIds.length) {
      const foundIds = (books || []).map((b: any) => b.id);
      const missing = bookIds.filter((id) => !foundIds.includes(id));
      return new Response(
        JSON.stringify({ valid: false, error: `Books not found: ${missing.join(", ")}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const outOfStock = books.filter((b: any) => !b.in_stock);
    if (outOfStock.length > 0) {
      return new Response(
        JSON.stringify({ valid: false, error: `Out of stock: ${outOfStock.map((b: any) => b.id).join(", ")}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch all discount data in parallel
    const [
      wholesaleResult,
      retailResult,
      { data: stackingRules },
      { data: bundleDiscounts },
      { data: bundleItems },
      { data: quantityTiers },
      { data: siteSettings },
    ] = await Promise.all([
      payload.is_wholesale
        ? admin.from("wholesale_discounts").select("*")
        : Promise.resolve({ data: [] as any[] }),
      !payload.is_wholesale
        ? admin.from("retail_discounts").select("*").eq("is_active", true)
        : Promise.resolve({ data: [] as any[] }),
      admin.from("discount_stacking_rules").select("*"),
      admin.from("bundle_discounts").select("*").eq("is_active", true),
      admin.from("bundle_items").select("*"),
      admin.from("wholesale_quantity_tiers").select("*").eq("scope", "cart"),
      admin.from("site_settings").select("*").eq("section", "business"),
    ]);

    const wholesaleDiscounts = wholesaleResult.data || [];
    const retailDiscounts = retailResult.data || [];
    const rules = stackingRules || [];
    const now = new Date();

    // 3. Per-item discount calculation — strict priority order
    const itemPrices = new Map<string, { originalPrice: number; finalPrice: number; discountSource: string }>();
    let subtotalAfterItemDiscounts = 0;
    let totalItems = 0;

    for (const item of payload.items) {
      const book = books.find((b: any) => b.id === item.book_id)!;
      const originalPrice = Number(book.price);
      let unitPrice = originalPrice;
      let discountSource = "none";

      if (payload.is_wholesale) {
        // Fixed Price Override
        const fixedPrice = wholesaleDiscounts.find(
          (d: any) => d.discount_type === "product" && d.book_id === book.id && d.fixed_price && Number(d.fixed_price) > 0
        );
        if (fixedPrice) {
          unitPrice = Number(fixedPrice.fixed_price);
          discountSource = "fixed_price";
        } else {
          // Product-based
          const productDisc = wholesaleDiscounts.find(
            (d: any) => d.discount_type === "product" && d.book_id === book.id && Number(d.discount_percent) > 0
          );
          if (productDisc) {
            let disc = originalPrice * (Number(productDisc.discount_percent) / 100);
            if (productDisc.max_discount_amount && disc > Number(productDisc.max_discount_amount)) {
              disc = Number(productDisc.max_discount_amount);
            }
            unitPrice = originalPrice - disc;
            discountSource = "product";
          } else {
            // Publisher-based
            let applied = false;
            if (book.publisher) {
              const pubDisc = wholesaleDiscounts.find(
                (d: any) => d.discount_type === "publisher" && d.reference_value === book.publisher
              );
              if (pubDisc && Number(pubDisc.discount_percent) > 0) {
                let disc = originalPrice * (Number(pubDisc.discount_percent) / 100);
                if (pubDisc.max_discount_amount && disc > Number(pubDisc.max_discount_amount)) {
                  disc = Number(pubDisc.max_discount_amount);
                }
                unitPrice = originalPrice - disc;
                discountSource = "publisher";
                applied = true;
              }
            }
            // Category-based
            if (!applied && book.category) {
              const catDisc = wholesaleDiscounts.find(
                (d: any) => d.discount_type === "category" && d.reference_value === book.category
              );
              if (catDisc && Number(catDisc.discount_percent) > 0) {
                let disc = originalPrice * (Number(catDisc.discount_percent) / 100);
                if (catDisc.max_discount_amount && disc > Number(catDisc.max_discount_amount)) {
                  disc = Number(catDisc.max_discount_amount);
                }
                unitPrice = originalPrice - disc;
                discountSource = "category";
              }
            }
          }
        }
      } else {
        // Retail discounts with date validation
        const activeRetail = retailDiscounts.filter((d: any) => {
          if (!d.is_active) return false;
          if (d.start_date && new Date(d.start_date) > now) return false;
          if (d.end_date && new Date(d.end_date) < now) return false;
          return true;
        });
        const productDisc = activeRetail.find(
          (d: any) => d.discount_type === "product" && d.book_id === book.id
        );
        if (productDisc && Number(productDisc.discount_percent) > 0) {
          let disc = originalPrice * (Number(productDisc.discount_percent) / 100);
          if (productDisc.max_discount_amount && disc > Number(productDisc.max_discount_amount)) {
            disc = Number(productDisc.max_discount_amount);
          }
          unitPrice = originalPrice - disc;
          discountSource = "retail_product";
        } else if (book.category) {
          const catDisc = activeRetail.find(
            (d: any) => d.discount_type === "category" && d.reference_value === book.category
          );
          if (catDisc && Number(catDisc.discount_percent) > 0) {
            let disc = originalPrice * (Number(catDisc.discount_percent) / 100);
            if (catDisc.max_discount_amount && disc > Number(catDisc.max_discount_amount)) {
              disc = Number(catDisc.max_discount_amount);
            }
            unitPrice = originalPrice - disc;
            discountSource = "retail_category";
          }
        }
      }

      // Ensure price never goes below 0
      unitPrice = Math.max(0, unitPrice);

      itemPrices.set(item.book_id, { originalPrice, finalPrice: unitPrice, discountSource });
      subtotalAfterItemDiscounts += unitPrice * item.quantity;
      totalItems += item.quantity;
    }

    const originalSubtotal = payload.items.reduce((sum, item) => {
      const ip = itemPrices.get(item.book_id);
      return sum + (ip?.originalPrice ?? 0) * item.quantity;
    }, 0);

    // Stacking checks
    const wholesaleHasDiscount = payload.is_wholesale && Array.from(itemPrices.values()).some((d) => d.discountSource !== "none");
    const wholesaleCanStack = isStackingAllowed(rules, "wholesale_plus_other");

    // 4. Bundle discount (only if stacking allowed)
    let bundleDiscountAmount = 0;
    if (!wholesaleHasDiscount || wholesaleCanStack) {
      const bundleCanStack = isStackingAllowed(rules, "bundle_plus_category");
      const hasCategoryDiscount = Array.from(itemPrices.values()).some(
        (d) => d.discountSource === "category" || d.discountSource === "retail_category"
      );

      if (!hasCategoryDiscount || bundleCanStack) {
        const activeBundles = (bundleDiscounts || []).filter((b: any) => {
          if (!b.is_active) return false;
          if (b.is_wholesale && !payload.is_wholesale) return false;
          if (!b.is_wholesale && payload.is_wholesale) return false;
          if (b.start_date && new Date(b.start_date) > now) return false;
          if (b.end_date && new Date(b.end_date) < now) return false;
          return true;
        });

        let bestDiscount = 0;
        for (const bundle of activeBundles) {
          const bItems = (bundleItems || []).filter((bi: any) => bi.bundle_id === bundle.id);
          const bundleBookIds = bItems.map((bi: any) => bi.book_id);
          if (bundleBookIds.length === 0) continue;

          const matchingItems = payload.items.filter((item) => bundleBookIds.includes(item.book_id));
          const matchingQty = matchingItems.reduce((s, i) => s + i.quantity, 0);

          if (matchingQty >= bundle.min_qty) {
            const matchingTotal = matchingItems.reduce((s, item) => {
              const ip = itemPrices.get(item.book_id);
              return s + (ip?.finalPrice ?? item.claimed_price) * item.quantity;
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
            if (discount > bestDiscount) bestDiscount = discount;
          }
        }
        bundleDiscountAmount = bestDiscount;
      }
    }

    // 5. Quantity tier (wholesale only)
    let quantityTierAmount = 0;
    if (payload.is_wholesale && (!wholesaleHasDiscount || wholesaleCanStack)) {
      const tiers = (quantityTiers || []).sort((a: any, b: any) => Number(b.discount_percent) - Number(a.discount_percent));
      const applicable = tiers.filter(
        (t: any) => totalItems >= t.min_qty && (!t.max_qty || totalItems <= t.max_qty)
      );
      if (applicable.length > 0) {
        quantityTierAmount = subtotalAfterItemDiscounts * (Number(applicable[0].discount_percent) / 100);
      }
    }

    // 6. Apply global cap
    const itemLevelSavings = originalSubtotal - subtotalAfterItemDiscounts;
    let totalDiscount = itemLevelSavings + quantityTierAmount + bundleDiscountAmount;

    const getSettingValue = (key: string): number => {
      const setting = (siteSettings || []).find((s: any) => s.key === key);
      if (!setting) return 0;
      const val = setting.value;
      return typeof val === "number" ? val : Number(val) || 0;
    };
    const globalCapPercent = getSettingValue("global_max_discount_percent");
    const globalCapAmount = getSettingValue("global_max_discount_amount");

    if (globalCapPercent > 0) {
      const maxByPercent = originalSubtotal * (globalCapPercent / 100);
      if (totalDiscount > maxByPercent) totalDiscount = maxByPercent;
    }
    if (globalCapAmount > 0 && totalDiscount > globalCapAmount) {
      totalDiscount = globalCapAmount;
    }

    const serverSubtotal = Math.max(0, originalSubtotal - totalDiscount);

    // 7. Coupon validation
    let serverCouponDiscount = 0;
    if (payload.coupon_code) {
      const couponCanStack = isStackingAllowed(rules, "coupon_plus_wholesale");
      // If wholesale has discount and coupon+wholesale stacking is not allowed, skip coupon
      if (wholesaleHasDiscount && !couponCanStack) {
        serverCouponDiscount = 0;
      } else {
        const { data: coupon } = await admin
          .from("coupons")
          .select("*")
          .eq("code", payload.coupon_code.toUpperCase().trim())
          .eq("is_active", true)
          .maybeSingle();

        if (coupon) {
          const valid =
            (!coupon.wholesale_only || payload.is_wholesale) &&
            (!coupon.expiry_date || new Date(coupon.expiry_date) >= now) &&
            (!coupon.usage_limit || coupon.used_count < coupon.usage_limit);

          if (valid) {
            if (!coupon.min_order_amount || serverSubtotal >= Number(coupon.min_order_amount)) {
              if (coupon.discount_type === "percentage") {
                serverCouponDiscount = serverSubtotal * (Number(coupon.discount_value) / 100);
              } else {
                serverCouponDiscount = Math.min(Number(coupon.discount_value), serverSubtotal);
              }

              // Per-discount cap
              if (coupon.max_discount_amount && serverCouponDiscount > Number(coupon.max_discount_amount)) {
                serverCouponDiscount = Number(coupon.max_discount_amount);
              }

              // First order only
              if (coupon.first_order_only) {
                const { count } = await admin
                  .from("orders")
                  .select("*", { count: "exact", head: true })
                  .eq("user_id", userId)
                  .neq("status", "cancelled");
                if (count && count > 0) serverCouponDiscount = 0;
              }

              // Per-user usage
              if (serverCouponDiscount > 0) {
                const { count } = await admin
                  .from("coupon_user_usage")
                  .select("*", { count: "exact", head: true })
                  .eq("coupon_id", coupon.id)
                  .eq("user_id", userId);
                if (count && count > 0) serverCouponDiscount = 0;
              }
            }
          }
        }
      }
    }

    const subtotalAfterCoupon = Math.max(0, serverSubtotal - serverCouponDiscount);

    // 8. Shipping validation
    const shippingBase = serverSubtotal;
    let serverShipping = 3.99;

    const [
      { data: zones },
      { data: rates },
      { data: freeRules },
    ] = await Promise.all([
      admin.from("shipping_zones").select("*").eq("is_active", true).order("sort_order"),
      admin.from("shipping_rates").select("*").eq("is_active", true),
      admin.from("free_shipping_rules").select("*").eq("is_active", true).eq("is_wholesale", payload.is_wholesale),
    ]);

    let isFree = false;
    if (freeRules && freeRules.length > 0) {
      for (const rule of freeRules) {
        if (rule.always_free || shippingBase >= Number(rule.min_order_amount)) {
          isFree = true;
          break;
        }
      }
    }

    if (isFree) {
      serverShipping = 0;
    } else if (zones && zones.length > 0 && rates && rates.length > 0) {
      let matchedZone = null as any;
      if (payload.city) {
        const cityNorm = payload.city.toLowerCase().trim();
        if (cityNorm.length >= 2) {
          matchedZone = zones.find((z: any) =>
            (z.locations as string[]).some((loc: string) => loc.toLowerCase().trim() === cityNorm)
          );
          if (!matchedZone && cityNorm.length >= 3) {
            matchedZone = zones.find((z: any) =>
              (z.locations as string[]).some((loc: string) => {
                const locNorm = loc.toLowerCase().trim();
                if (locNorm.length < 3) return false;
                return cityNorm.startsWith(locNorm) || locNorm.startsWith(cityNorm);
              })
            );
          }
        }
      }
      if (!matchedZone) matchedZone = zones[0];

      if (matchedZone) {
        const zoneRates = (rates || []).filter((r: any) =>
          r.zone_id === matchedZone.id && r.is_wholesale === payload.is_wholesale
        );
        let cheapestCost = 3.99;
        let foundRate = false;
        for (const rate of zoneRates) {
          let cost = Number(rate.flat_rate) || 0;
          if (rate.rate_type === "price_based" && rate.price_ranges) {
            const ranges = rate.price_ranges as Array<{ min: number; max: number; cost: number }>;
            const matched = ranges.find((r: any) => shippingBase >= r.min && (r.max === 0 || shippingBase <= r.max));
            if (matched) cost = matched.cost;
          }
          if (!foundRate || cost < cheapestCost) {
            cheapestCost = cost;
            foundRate = true;
          }
        }
        if (foundRate) serverShipping = cheapestCost;
      }
    } else {
      const { data: legacyRules } = await admin
        .from("shipping_rules")
        .select("*")
        .eq("is_active", true)
        .eq("is_wholesale", payload.is_wholesale)
        .order("min_amount", { ascending: false });

      if (legacyRules && legacyRules.length > 0) {
        const matchedRule = legacyRules.find((r: any) => shippingBase >= Number(r.min_amount));
        if (matchedRule) serverShipping = Number(matchedRule.shipping_cost);
      }

      if (!isFree && shippingBase >= 25) {
        serverShipping = 0;
      }
    }

    const serverTotal = Math.round((subtotalAfterCoupon + serverShipping) * 100) / 100;

    // 9. Compare with frontend (tolerance for floating point)
    const tolerance = 0.10;
    const totalMatch = Math.abs(serverTotal - payload.claimed_total) <= tolerance;

    return new Response(
      JSON.stringify({
        valid: totalMatch,
        server: {
          subtotal: Math.round(serverSubtotal * 100) / 100,
          coupon_discount: Math.round(serverCouponDiscount * 100) / 100,
          shipping: Math.round(serverShipping * 100) / 100,
          total: serverTotal,
          discount_amount: Math.round(totalDiscount * 100) / 100,
        },
        claimed: {
          subtotal: payload.claimed_subtotal,
          coupon_discount: payload.claimed_coupon_discount,
          shipping: payload.claimed_shipping,
          total: payload.claimed_total,
        },
        error: totalMatch ? null : "Price mismatch detected. Please refresh and try again.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("validate-order error:", err.message);
    return new Response(JSON.stringify({ valid: false, error: "Order validation failed. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
