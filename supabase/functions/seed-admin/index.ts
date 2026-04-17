import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const email = "admin@diabetes.local";
    const password = "admin123";
    const username = "admin";

    // Check if already seeded
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      // Ensure admin role exists
      await admin
        .from("user_roles")
        .upsert({ user_id: existing.id, role: "admin" }, { onConflict: "user_id,role" });
      return new Response(JSON.stringify({ ok: true, seeded: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (cErr) throw cErr;

    const uid = created.user!.id;
    // Trigger created profile + patient role; promote to admin
    await admin
      .from("user_roles")
      .upsert({ user_id: uid, role: "admin" }, { onConflict: "user_id,role" });
    // Remove patient role for clarity
    await admin.from("user_roles").delete().eq("user_id", uid).eq("role", "patient");

    return new Response(JSON.stringify({ ok: true, seeded: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
