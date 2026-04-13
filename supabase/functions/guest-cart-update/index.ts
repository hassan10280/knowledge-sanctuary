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

    if (!record_id || !session_id) {
      return new Response(JSON.stringify({ error: "record_id and session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the session_id matches the record — server-side validation
    const { data: existing } = await supabaseAdmin
      .from("abandoned_carts")
      .select("id, session_id")
      .eq("id", record_id)
      .single();

    if (!existing || existing.session_id !== session_id) {
      return new Response(JSON.stringify({ error: "Unauthorized: session mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const updateData: Record<string, unknown> = {};
      if (cart_items !== undefined) updateData.cart_items = cart_items;
      if (subtotal !== undefined) updateData.subtotal = subtotal;
      if (status !== undefined) updateData.status = status;
      if (user_id !== undefined) updateData.user_id = user_id;
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
