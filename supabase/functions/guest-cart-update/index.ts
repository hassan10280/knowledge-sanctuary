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

    const body = await req.json();
    const { action, record_id, session_id, cart_items, subtotal, user_id, status } = body;

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INSERT: create a new abandoned cart record ──
    if (action === "insert") {
      const { data, error } = await supabaseAdmin
        .from("abandoned_carts")
        .insert({
          session_id,
          user_id: user_id || null,
          cart_items: cart_items || [],
          subtotal: subtotal || 0,
          status: status || "active",
        })
        .select("id")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── UPDATE: modify an existing record ──
    if (action === "update") {
      if (!record_id) {
        return new Response(JSON.stringify({ error: "record_id required for update" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabaseAdmin
        .from("abandoned_carts")
        .select("id, session_id, user_id")
        .eq("id", record_id)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: "Record not found", code: "NOT_FOUND" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sessionMatch = existing.session_id === session_id;
      const userMatch = user_id && existing.user_id && existing.user_id === user_id;
      if (!sessionMatch && !userMatch) {
        return new Response(JSON.stringify({ error: "Unauthorized: session mismatch", code: "SESSION_MISMATCH" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: Record<string, unknown> = {};
      if (cart_items !== undefined) updateData.cart_items = cart_items;
      if (subtotal !== undefined) updateData.subtotal = subtotal;
      if (status !== undefined) updateData.status = status;
      if (user_id !== undefined) updateData.user_id = user_id;
      if (session_id !== undefined) updateData.session_id = session_id;
      if (status === "recovered") updateData.recovered_at = new Date().toISOString();

      const { error } = await supabaseAdmin
        .from("abandoned_carts")
        .update(updateData)
        .eq("id", record_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
