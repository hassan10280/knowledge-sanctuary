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
      // 1. Add RESTRICTIVE policy on user_roles to prevent non-admin INSERT
      await conn.queryObject(`
        DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
      `);
      await conn.queryObject(`
        CREATE POLICY "Only admins can insert roles"
        ON public.user_roles
        FOR INSERT
        TO authenticated
        WITH CHECK (
          has_role(auth.uid(), 'admin'::app_role)
        );
      `);
      results.push("Added explicit admin-only INSERT policy on user_roles");

      // 2. Restrict discount_stacking_rules to authenticated
      await conn.queryObject(`DROP POLICY IF EXISTS "Anyone can read stacking rules" ON public.discount_stacking_rules;`);
      await conn.queryObject(`
        CREATE POLICY "Authenticated can read stacking rules"
        ON public.discount_stacking_rules
        FOR SELECT
        TO authenticated
        USING (true);
      `);
      results.push("Restricted discount_stacking_rules SELECT to authenticated");

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
