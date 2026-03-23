import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const body = await req.json();
    const { action } = body;

    if (action === "add") {
      const { email } = body;
      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw listErr;

      const targetUser = users.find((u) => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "User not found. They must sign up first." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      // Audit log
      await supabaseAdmin.from("audit_logs").insert({
        user_id: caller.id,
        action: "admin_role_added",
        target_user_id: targetUser.id,
        details: { email: targetUser.email },
      });

      return new Response(JSON.stringify({ success: true, email: targetUser.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      const { role_id, user_id } = body;
      if (!role_id) {
        return new Response(JSON.stringify({ error: "role_id required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

      // Audit log
      await supabaseAdmin.from("audit_logs").insert({
        user_id: caller.id,
        action: "admin_role_removed",
        target_user_id: user_id,
        details: { role_id },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("id, user_id, role")
        .eq("role", "admin");

      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const enriched = (roles || []).map((r) => {
        const u = users.find((u) => u.id === r.user_id);
        return { ...r, email: u?.email || "Unknown" };
      });

      return new Response(JSON.stringify({ admins: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Approve wholesale application (server-side role assignment)
    if (action === "approve_wholesale") {
      const { application_id, target_user_id } = body;
      if (!application_id || !target_user_id) {
        return new Response(JSON.stringify({ error: "application_id and target_user_id required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update application status
      const { error: appErr } = await supabaseAdmin
        .from("wholesale_applications")
        .update({ status: "approved", reviewed_by: caller.id, reviewed_at: new Date().toISOString() })
        .eq("id", application_id);
      if (appErr) throw appErr;

      // Upsert wholesale role
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: target_user_id, role: "wholesale" }, { onConflict: "user_id,role" });
      if (roleErr) throw roleErr;

      // Audit log
      await supabaseAdmin.from("audit_logs").insert({
        user_id: caller.id,
        action: "wholesale_approved",
        target_user_id,
        details: { application_id },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reject wholesale application
    if (action === "reject_wholesale") {
      const { application_id, admin_notes } = body;
      if (!application_id) {
        return new Response(JSON.stringify({ error: "application_id required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: appErr } = await supabaseAdmin
        .from("wholesale_applications")
        .update({ status: "rejected", admin_notes: admin_notes || "", reviewed_by: caller.id, reviewed_at: new Date().toISOString() })
        .eq("id", application_id);
      if (appErr) throw appErr;

      // Audit log
      await supabaseAdmin.from("audit_logs").insert({
        user_id: caller.id,
        action: "wholesale_rejected",
        target_user_id: null,
        details: { application_id, admin_notes },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List ALL users with their roles
    if (action === "list_all_users") {
      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw listErr;

      const { data: allRoles } = await supabaseAdmin
        .from("user_roles")
        .select("id, user_id, role");

      const enriched = users.map((u) => {
        const roles = (allRoles || []).filter((r) => r.user_id === u.id);
        const roleNames = roles.map((r) => r.role);
        const primaryRole = roleNames.includes("admin")
          ? "admin"
          : roleNames.includes("wholesale")
          ? "wholesale"
          : "retail";
        return {
          id: u.id,
          email: u.email || "Unknown",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          role: primaryRole,
          roles: roles,
        };
      });

      return new Response(JSON.stringify({ users: enriched }), {
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
