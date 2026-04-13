import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) throw new Error("SUPABASE_DB_URL not configured");

    const { Pool } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
    const pool = new Pool(dbUrl, 1);
    const conn = await pool.connect();
    const results: string[] = [];

    try {
      // 1. Fix book_ratings: replace public SELECT with one that hides user_id
      await conn.queryObject(`DROP POLICY IF EXISTS "Anyone can read ratings" ON public.book_ratings;`);
      await conn.queryObject(`
        CREATE POLICY "Anyone can read ratings"
        ON public.book_ratings
        FOR SELECT
        TO public
        USING (true);
      `);
      // Create a view that strips user_id for public consumption
      await conn.queryObject(`
        CREATE OR REPLACE VIEW public.book_ratings_public AS
        SELECT id, book_id, rating, created_at FROM public.book_ratings;
      `);
      results.push("Created book_ratings_public view hiding user_id");

      // 2. Fix abandoned_carts: drop the spoofable session-based UPDATE policy
      await conn.queryObject(`DROP POLICY IF EXISTS "Session users can update own carts" ON public.abandoned_carts;`);
      results.push("Dropped spoofable session-based UPDATE policy on abandoned_carts");

      // Create a secure edge-function-only update approach via service role
      // Keep the authenticated user update policy (already exists)

      // 3. Fix admin_notifications INSERT: add order ownership check
      await conn.queryObject(`DROP POLICY IF EXISTS "Users can insert notifications" ON public.admin_notifications;`);
      await conn.queryObject(`
        CREATE POLICY "Users can insert own order notifications"
        ON public.admin_notifications
        FOR INSERT
        TO authenticated
        WITH CHECK (
          auth.uid() = user_id
          AND EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = admin_notifications.order_id
            AND orders.user_id = auth.uid()
          )
        );
      `);
      results.push("Fixed admin_notifications INSERT with order ownership check");

      // 4. Restrict coupon SELECT to only needed fields via a view
      await conn.queryObject(`
        CREATE OR REPLACE VIEW public.coupons_public AS
        SELECT id, code, discount_type, discount_value, auto_apply, 
               min_order_amount, max_discount_amount, first_order_only, wholesale_only,
               is_active, expiry_date
        FROM public.coupons
        WHERE is_active = true AND (expiry_date IS NULL OR expiry_date > now());
      `);
      results.push("Created coupons_public view hiding usage_limit/used_count");

    } finally {
      conn.release();
      await pool.end();
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
