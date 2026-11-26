import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();
    const event = (payload.event || "").toUpperCase();
    const evoInstanceName = payload.instance || payload.instanceName || payload.data?.instance;

    if (!evoInstanceName) {
      return new Response(JSON.stringify({ ok: true, ignored: "no instance" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inst } = await adminClient
      .from("whatsapp_instances")
      .select("*")
      .eq("evolution_instance_id", evoInstanceName)
      .maybeSingle();

    if (!inst) {
      return new Response(JSON.stringify({ ok: true, ignored: "unknown instance" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza QR Code se recebido
    if (event === "QRCODE_UPDATED" || event === "QRCODE.UPDATED") {
      const qr = payload.data?.qrcode?.base64 || payload.data?.base64 || null;
      if (qr) {
        await adminClient
          .from("whatsapp_instances")
          .update({ qr_code: qr, status: "connecting" })
          .eq("id", inst.id);
      }
    }

    // Atualiza status de conexão
    if (event === "CONNECTION_UPDATE" || event === "CONNECTION.UPDATE") {
      const state = payload.data?.state || payload.data?.status || "";
      if (state === "open" || state === "connected") {
        await adminClient
          .from("whatsapp_instances")
          .update({ status: "connected", qr_code: null })
          .eq("id", inst.id);
      } else if (state === "close" || state === "disconnected") {
        await adminClient
          .from("whatsapp_instances")
          .update({ status: "disconnected" })
          .eq("id", inst.id);
      } else if (state === "connecting") {
        await adminClient
          .from("whatsapp_instances")
          .update({ status: "connecting" })
          .eq("id", inst.id);
      }
    }

    // Encaminha mensagens para URL externa configurável (ex.: n8n) no formato esperado da Evolution API
    const forwardUrl = (inst.webhook_forward_url || Deno.env.get("N8N_WEBHOOK_URL") || "").trim();
    const isMessageEvent = event === "MESSAGES_UPSERT" || event === "MESSAGES.UPSERT";
    if (forwardUrl && isMessageEvent && payload.data?.key?.remoteJid) {
      const evoUrl = (Deno.env.get("EVOLUTION_API_URL") || "").trim().replace(/\/+$/, "");
      const evoKey = (Deno.env.get("EVOLUTION_API_KEY") || "").trim();
      const forwardPayload = {
        ...payload,
        instance: payload.instance || evoInstanceName,
        server_url: payload.server_url || evoUrl,
        apikey: payload.apikey || evoKey,
        user_id: inst.user_id,
        instance_id: inst.id,
      };
      try {
        await fetch(forwardUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(forwardPayload),
        });
      } catch (fwdErr) {
        console.error("[WEBHOOK] Forward error:", fwdErr);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[WEBHOOK] Fatal error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
