// Supabase Edge Function: accept-member
// Secrets required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return Response.json({ error: "غير مصرح" }, { status: 401 });
  const admin = createClient(url, service);
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role))
    return Response.json({ error: "صلاحيات الإدارة مطلوبة" }, { status: 403 });
  const { application_id } = await req.json();
  const { data: app, error: appError } = await admin.from("membership_applications")
    .select("*").eq("id", application_id).single();
  if (appError || !app) return Response.json({ error: "طلب الانخراط غير موجود" }, { status: 404 });
  if (!app.email) return Response.json({ error: "البريد الإلكتروني مطلوب لإنشاء الحساب" }, { status: 400 });
  const { data: created, error: createError } = await admin.auth.admin.inviteUserByEmail(app.email, {
    data: { full_name: app.full_name, phone: app.phone }
  });
  if (createError) return Response.json({ error: createError.message }, { status: 400 });
  await admin.from("profiles").update({ full_name: app.full_name, phone: app.phone, membership_status: "accepted" }).eq("id", created.user.id);
  await admin.from("membership_applications").update({ status: "accepted", reviewed_by: user.id }).eq("id", application_id);
  return Response.json({ success: true, email: app.email });
});
