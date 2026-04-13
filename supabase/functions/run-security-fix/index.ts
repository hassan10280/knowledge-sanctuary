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
      // 1. Fix views to use SECURITY INVOKER
      await conn.queryObject(`
        CREATE OR REPLACE VIEW public.book_ratings_public
        WITH (security_invoker = true)
        AS SELECT id, book_id, rating, created_at FROM public.book_ratings;
      `);
      results.push("Fixed book_ratings_public view to SECURITY INVOKER");

      await conn.queryObject(`
        CREATE OR REPLACE VIEW public.coupons_public
        WITH (security_invoker = true)
        AS SELECT id, code, discount_type, discount_value, auto_apply, 
               min_order_amount, max_discount_amount, first_order_only, wholesale_only,
               is_active, expiry_date
        FROM public.coupons
        WHERE is_active = true AND (expiry_date IS NULL OR expiry_date > now());
      `);
      results.push("Fixed coupons_public view to SECURITY INVOKER");

      // 2. Restrict book_ratings SELECT to authenticated only (hide user_id via view for public)
      await conn.queryObject(`DROP POLICY IF EXISTS "Anyone can read ratings" ON public.book_ratings;`);
      await conn.queryObject(`
        CREATE POLICY "Authenticated can read ratings"
        ON public.book_ratings
        FOR SELECT
        TO authenticated
        USING (true);
      `);
      results.push("Restricted book_ratings SELECT to authenticated users only");

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
