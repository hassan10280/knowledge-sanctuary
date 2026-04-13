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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) throw new Error("SUPABASE_DB_URL not configured");

    const { Pool } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
    const pool = new Pool(dbUrl, 1);
    const conn = await pool.connect();

    const results: string[] = [];

    try {
      // 1. Remove admin_notifications from realtime publication
      await conn.queryObject(`ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.admin_notifications;`);
      results.push("Removed admin_notifications from supabase_realtime publication");

      // 2. Drop old public coupon SELECT policy and create authenticated one
      await conn.queryObject(`DROP POLICY IF EXISTS "Public can read active coupons" ON public.coupons;`);
      results.push("Dropped old public coupon SELECT policy");

      await conn.queryObject(`
        CREATE POLICY "Authenticated can read active coupons"
        ON public.coupons
        FOR SELECT
        TO authenticated
        USING (is_active = true AND (expiry_date IS NULL OR expiry_date > now()));
      `);
      results.push("Created authenticated-only coupon SELECT policy");

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
