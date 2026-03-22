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

    // Verify user via getUser
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const payload: OrderPayload = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Fetch actual book prices
    const bookIds = payload.items.map((i) => i.book_id);
    const { data: books, error: booksErr } = await admin
      .from("books")
      .select("id, price, publisher, category, in_stock")
      .in("id", bookIds);
    if (booksErr) throw booksErr;

    // Stock check
    const outOfStock = (books || []).filter((b: any) => !b.in_stock);
    if (outOfStock.length > 0) {
      return new Response(
        JSON.stringify({ valid: false, error: `Out of stock: ${outOfStock.map((b: any) => b.id).join(", ")}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch discount data based on role
    let wholesaleDiscounts: any[] = [];
    let retailDiscounts: any[] = [];

    if (payload.is_wholesale) {
      const { data } = await admin.from("wholesale_discounts").select("*");
      wholesaleDiscounts = data || [];
    } else {
      const { data } = await admin.from("retail_discounts").select("*").eq("is_active", true);
      retailDiscounts = data || [];
    }

    // 3. Recalculate per-item prices server-side
    // Priority: Fixed Price > Product % > Publisher > Category (matching frontend exactly)
    let serverSubtotal = 0;
    const now = new Date();

    for (const item of payload.items) {
      const book = (books || []).find((b: any) => b.id === item.book_id);
      if (!book) {
        return new Response(
          JSON.stringify({ valid: false, error: `Book ${item.book_id} not found` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let unitPrice = Number(book.price);

      if (payload.is_wholesale) {
        // 1. Fixed Price Override
        const fixedPrice = wholesaleDiscounts.find(
          (d) => d.discount_type === "product" && d.book_id === book.id && d.fixed_price && Number(d.fixed_price) > 0
        );
        if (fixedPrice) {
          unitPrice = Number(fixedPrice.fixed_price);
        } else {
          // 2. Product-based Discount
          const productDisc = wholesaleDiscounts.find(
            (d) => d.discount_type === "product" && d.book_id === book.id && Number(d.discount_percent) > 0
          );
          if (productDisc) {
            unitPrice = unitPrice * (1 - Number(productDisc.discount_percent) / 100);
          } else {
            // 3. Publisher-based Discount (independent check)
            let applied = false;
            if (book.publisher) {
              const pubDisc = wholesaleDiscounts.find(
                (d) => d.discount_type === "publisher" && d.reference_value === book.publisher
              );
              if (pubDisc && Number(pubDisc.discount_percent) > 0) {
                unitPrice = unitPrice * (1 - Number(pubDisc.discount_percent) / 100);
                applied = true;
              }
            }
            // 4. Category-based Discount (independent from publisher)
            if (!applied && book.category) {
              const catDisc = wholesaleDiscounts.find(
                (d) => d.discount_type === "category" && d.reference_value === book.category
              );
              if (catDisc && Number(catDisc.discount_percent) > 0) {
                unitPrice = unitPrice * (1 - Number(catDisc.discount_percent) / 100);
              }
            }
          }
        }
      } else {
        // Retail: product > category (with date check)
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
          unitPrice = unitPrice * (1 - Number(productDisc.discount_percent) / 100);
        } else if (book.category) {
          const catDisc = activeRetail.find(
            (d: any) => d.discount_type === "category" && d.reference_value === book.category
          );
          if (catDisc && Number(catDisc.discount_percent) > 0) {
            unitPrice = unitPrice * (1 - Number(catDisc.discount_percent) / 100);
          }
        }
      }

      serverSubtotal += unitPrice * item.quantity;
    }

    // 4. Quantity tier (wholesale cart-scope)
    if (payload.is_wholesale) {
      const totalQty = payload.items.reduce((s, i) => s + i.quantity, 0);
      const { data: tiers } = await admin
        .from("wholesale_quantity_tiers")
        .select("*")
        .eq("scope", "cart")
        .order("discount_percent", { ascending: false });

      if (tiers && tiers.length > 0) {
        const applicable = tiers.filter(
          (t: any) => totalQty >= t.min_qty && (!t.max_qty || totalQty <= t.max_qty)
        );
        if (applicable.length > 0) {
          serverSubtotal = serverSubtotal * (1 - Number(applicable[0].discount_percent) / 100);
        }
      }
    }

    // 5. Coupon validation
    let serverCouponDiscount = 0;
    if (payload.coupon_code) {
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
          // Min order amount check
          if (coupon.min_order_amount && serverSubtotal < Number(coupon.min_order_amount)) {
            // Coupon not applicable — minimum not met
          } else {
            if (coupon.discount_type === "percentage") {
              serverCouponDiscount = serverSubtotal * (Number(coupon.discount_value) / 100);
            } else {
              serverCouponDiscount = Math.min(Number(coupon.discount_value), serverSubtotal);
            }

            // Per-user usage check
            const { count } = await admin
              .from("coupon_user_usage")
              .select("*", { count: "exact", head: true })
              .eq("coupon_id", coupon.id)
              .eq("user_id", userId);

            if (count && count > 0) {
              serverCouponDiscount = 0;
            }
          }
        }
      }
    }

    const subtotalAfterCoupon = Math.max(0, serverSubtotal - serverCouponDiscount);

    // 6. Shipping validation — match frontend logic exactly
    // Frontend uses: discountedSubtotal (before coupon) for shipping calculation
    const shippingBase = serverSubtotal; // matches frontend's cartDiscounts.discountedSubtotal

    let serverShipping = 3.99; // default fallback

    // Check zone-based shipping first (advanced system)
    const { data: zones } = await admin.from("shipping_zones").select("*").eq("is_active", true).order("sort_order");
    const { data: rates } = await admin.from("shipping_rates").select("*").eq("is_active", true);
    const { data: methods } = await admin.from("shipping_methods").select("*").eq("is_active", true);
    const { data: freeRules } = await admin.from("free_shipping_rules").select("*").eq("is_active", true).eq("is_wholesale", payload.is_wholesale);

    let isFree = false;

    // Check free shipping rules
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
      // Zone-based shipping system
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
        
        // Find cheapest rate (matching frontend auto-select behavior)
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
      // Legacy shipping_rules fallback
      const { data: rules } = await admin
        .from("shipping_rules")
        .select("*")
        .eq("is_active", true)
        .eq("is_wholesale", payload.is_wholesale)
        .order("min_amount", { ascending: false });

      if (rules && rules.length > 0) {
        const matchedRule = rules.find((r: any) => shippingBase >= Number(r.min_amount));
        if (matchedRule) {
          serverShipping = Number(matchedRule.shipping_cost);
        }
      }

      // Also check if legacy free shipping threshold applies
      if (!isFree && shippingBase >= 25) {
        serverShipping = 0;
        isFree = true;
      }
    }

    const serverTotal = subtotalAfterCoupon + serverShipping;

    // 7. Compare with frontend values (tolerance £0.05 for floating point)
    const tolerance = 0.05;
    const totalMatch = Math.abs(serverTotal - payload.claimed_total) <= tolerance;

    return new Response(
      JSON.stringify({
        valid: totalMatch,
        server: {
          subtotal: Math.round(serverSubtotal * 100) / 100,
          coupon_discount: Math.round(serverCouponDiscount * 100) / 100,
          shipping: Math.round(serverShipping * 100) / 100,
          total: Math.round(serverTotal * 100) / 100,
        },
        claimed: {
          subtotal: payload.claimed_subtotal,
          coupon_discount: payload.claimed_coupon_discount,
          shipping: payload.claimed_shipping,
          total: payload.claimed_total,
        },
        error: totalMatch ? null : "Price mismatch detected. Order rejected for security.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ valid: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
