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

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is admin
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Only admins can manage roles" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, email, role_id, user_id } = await req.json();

    if (action === "add") {
      // Find user by email
      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw listErr;

      const targetUser = users.find((u) => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "User not found. They must sign up first." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already admin
      const { data: existing } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUser.id)
        .eq("role", "admin")
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "User is already an admin" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: insertErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: targetUser.id, role: "admin" });

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ success: true, email: targetUser.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      if (!role_id) {
        return new Response(JSON.stringify({ error: "role_id required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent removing yourself
      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "You cannot remove your own admin role" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: delErr } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("id", role_id);

      if (delErr) throw delErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("id, user_id, role")
        .eq("role", "admin");

      // Get emails for each admin
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const enriched = (roles || []).map((r) => {
        const u = users.find((u) => u.id === r.user_id);
        return { ...r, email: u?.email || "Unknown" };
      });

      return new Response(JSON.stringify({ admins: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
