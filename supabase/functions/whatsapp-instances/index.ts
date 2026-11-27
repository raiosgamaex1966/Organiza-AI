import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;

  return { userId: user.id, client: userClient };
}

function getEvolutionConfig() {
  const url = (Deno.env.get("EVOLUTION_API_URL") || "").trim().replace(/\/+$/, "");
  const key = (Deno.env.get("EVOLUTION_API_KEY") || "").trim();
  return { url, key };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = req.method === "POST" ? await req.json() : {};
    const action = body._action || new URL(req.url).searchParams.get("action") || "list";

    // LIST
    if (action === "list") {
      const { data, error } = await adminClient
        .from("whatsapp_instances")
        .select("*")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false });

      if (error) return jsonResponse({ success: false, error: error.message }, 500);
      return jsonResponse({ success: true, data });
    }

    // CREATE
    if (action === "create") {
      const { instance_name, webhook_forward_url } = body;
      const normalizedName = instance_name?.trim();
      if (!normalizedName) {
        return jsonResponse({ success: false, error: "Nome da instância é obrigatório" }, 400);
      }

      const { url: evolutionUrl, key: evolutionKey } = getEvolutionConfig();
      if (!evolutionUrl || !evolutionKey) {
        return jsonResponse({
          success: false,
          error: "Evolution API não configurada. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY nos Secrets do Supabase.",
        }, 500);
      }

      const shortUserId = auth.userId.split("-")[0];
      const safeName = normalizedName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const evoInstanceName = `${shortUserId}_${safeName}_${Date.now()}`;

      const evoRes = await fetch(`${evolutionUrl}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evolutionKey },
        body: JSON.stringify({
          instanceName: evoInstanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        }),
      });

      const evoText = await evoRes.text();
      if (!evoRes.ok) {
        let errorMsg = evoText;
        try {
          const errJson = JSON.parse(evoText);
          errorMsg = errJson.message || errJson.error || evoText;
        } catch {
          // keep raw text
        }
        return jsonResponse({ success: false, error: `Evolution: ${errorMsg}` }, 500);
      }

      const evoData = JSON.parse(evoText);
      const finalEvoId = evoData.instance?.instanceName || evoInstanceName;

      const { data: instance, error: insertErr } = await adminClient
        .from("whatsapp_instances")
        .insert({
          user_id: auth.userId,
          instance_name: normalizedName,
          evolution_instance_id: finalEvoId,
          status: "disconnected",
          qr_code: evoData.qrcode?.base64 || null,
          webhook_forward_url: webhook_forward_url?.trim() || null,
        })
        .select()
        .single();

      if (insertErr) {
        return jsonResponse({ success: false, error: `Erro ao salvar no banco: ${insertErr.message}` }, 500);
      }

      // Configura webhook na Evolution API apontando para whatsapp-webhook
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
      try {
        await fetch(`${evolutionUrl}/webhook/set/${finalEvoId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: evolutionKey },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
              byEvents: false,
              base64: false,
              webhook_by_events: false,
              webhook_base64: false,
              headers: {},
            },
          }),
        });
      } catch (e) {
        console.warn("[CREATE] Webhook setup warning:", e);
      }

      return jsonResponse({ success: true, data: instance });
    }

    // CONNECT (gera QR Code)
    if (action === "connect") {
      const { instance_id } = body;
      const { data: inst } = await adminClient
        .from("whatsapp_instances")
        .select("*")
        .eq("id", instance_id)
        .eq("user_id", auth.userId)
        .single();

      if (!inst) return jsonResponse({ success: false, error: "Instância não encontrada" }, 404);

      const { url: evolutionUrl, key: evolutionKey } = getEvolutionConfig();
      if (!evolutionUrl || !evolutionKey) {
        return jsonResponse({ success: false, error: "Evolution API não configurada" }, 500);
      }

      const res = await fetch(`${evolutionUrl}/instance/connect/${inst.evolution_instance_id}`, {
        headers: { apikey: evolutionKey },
      });
      const text = await res.text();

      if (res.ok) {
        const data = JSON.parse(text);
        await adminClient
          .from("whatsapp_instances")
          .update({ status: "connecting", qr_code: data.base64 || null })
          .eq("id", instance_id);
        return jsonResponse({ success: true, data: { qr_code: data.base64 || null } });
      }
      return jsonResponse({ success: false, error: text }, 500);
    }

    // CHECK STATUS
    if (action === "check-status") {
      const { instance_id } = body;
      if (!instance_id) return jsonResponse({ success: false, error: "instance_id required" }, 400);

      const { data: inst } = await adminClient
        .from("whatsapp_instances")
        .select("*")
        .eq("id", instance_id)
        .eq("user_id", auth.userId)
        .single();

      if (!inst) return jsonResponse({ success: false, error: "Instância não encontrada" }, 404);

      const { url: evolutionUrl, key: evolutionKey } = getEvolutionConfig();
      if (evolutionUrl && evolutionKey && inst.evolution_instance_id) {
        try {
          const evoRes = await fetch(
            `${evolutionUrl}/instance/connectionState/${inst.evolution_instance_id}`,
            { headers: { apikey: evolutionKey } }
          );
          if (evoRes.ok) {
            const evoData = await evoRes.json();
            const state = evoData?.instance?.state || evoData?.state || "";
            let newStatus = inst.status;
            let phone: string | null = inst.phone;

            if (state === "open" || state === "connected") {
              newStatus = "connected";
              try {
                const infoRes = await fetch(
                  `${evolutionUrl}/instance/fetchInstances?instanceName=${inst.evolution_instance_id}`,
                  { headers: { apikey: evolutionKey } }
                );
                if (infoRes.ok) {
                  const infoData = await infoRes.json();
                  const list = Array.isArray(infoData) ? infoData : [infoData];
                  const info =
                    list.find((it: any) => (it.name || it.instance?.instanceName) === inst.evolution_instance_id) ||
                    list[0];
                  const rawOwner =
                    info?.ownerJid || info?.instance?.owner || info?.owner || info?.instance?.wuid || "";
                  const cleanPhone = String(rawOwner).split("@")[0].split(":")[0];
                  if (cleanPhone) phone = cleanPhone;
                }
              } catch (e) {
                console.warn("[CHECK-STATUS] fetchInstances warning:", e);
              }
            } else if (state === "close" || state === "disconnected") {
              newStatus = "disconnected";
            }

            if (newStatus !== inst.status || phone !== inst.phone) {
              await adminClient
                .from("whatsapp_instances")
                .update({
                  status: newStatus,
                  phone,
                  ...(newStatus === "connected" ? { qr_code: null } : {}),
                })
                .eq("id", instance_id);
            }

            return jsonResponse({ success: true, data: { status: newStatus, phone } });
          }
        } catch (e) {
          console.error("[CHECK-STATUS] Error:", e);
        }
      }

      return jsonResponse({ success: true, data: { status: inst.status, phone: inst.phone } });
    }

    // DISCONNECT
    if (action === "disconnect") {
      const { instance_id } = body;
      if (!instance_id) return jsonResponse({ success: false, error: "instance_id required" }, 400);

      const { data: inst } = await adminClient
        .from("whatsapp_instances")
        .select("*")
        .eq("id", instance_id)
        .eq("user_id", auth.userId)
        .single();

      if (!inst) return jsonResponse({ success: false, error: "Instância não encontrada" }, 404);

      const { url: evolutionUrl, key: evolutionKey } = getEvolutionConfig();
      if (evolutionUrl && evolutionKey && inst.evolution_instance_id) {
        try {
          await fetch(`${evolutionUrl}/instance/logout/${inst.evolution_instance_id}`, {
            method: "DELETE",
            headers: { apikey: evolutionKey },
          });
        } catch (e) {
          console.warn("[DISCONNECT] Logout warning:", e);
        }
      }

      await adminClient
        .from("whatsapp_instances")
        .update({ status: "disconnected", qr_code: null })
        .eq("id", instance_id);

      return jsonResponse({ success: true, data: { message: "Desconectado" } });
    }

    // SET WEBHOOK (atualiza webhook na Evolution e opcionalmente a URL de encaminhamento n8n)
    if (action === "set-webhook") {
      const { instance_id, webhook_forward_url } = body;
      if (!instance_id) return jsonResponse({ success: false, error: "instance_id required" }, 400);

      const { data: inst } = await adminClient
        .from("whatsapp_instances")
        .select("*")
        .eq("id", instance_id)
        .eq("user_id", auth.userId)
        .single();

      if (!inst) return jsonResponse({ success: false, error: "Instância não encontrada" }, 404);

      if (webhook_forward_url !== undefined) {
        await adminClient
          .from("whatsapp_instances")
          .update({ webhook_forward_url: webhook_forward_url?.trim() || null })
          .eq("id", instance_id);
      }

      const { url: evolutionUrl, key: evolutionKey } = getEvolutionConfig();
      if (evolutionUrl && evolutionKey && inst.evolution_instance_id) {
        const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
        const evoRes = await fetch(`${evolutionUrl}/webhook/set/${inst.evolution_instance_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: evolutionKey },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
              byEvents: false,
              base64: false,
              webhook_by_events: false,
              webhook_base64: false,
              headers: {},
            },
          }),
        });
        const evoData = await evoRes.text();
        if (!evoRes.ok) {
          return jsonResponse({ success: false, error: `Falha ao configurar webhook: ${evoData}` }, 400);
        }
        return jsonResponse({ success: true, data: { message: "Webhook configurado", url: webhookUrl } });
      }

      return jsonResponse({ success: false, error: "Evolution API não configurada" }, 400);
    }

    // DELETE
    if (action === "delete") {
      const { instance_id } = body;
      if (!instance_id) return jsonResponse({ success: false, error: "ID da instância não informado" }, 400);

      const { data: inst } = await adminClient
        .from("whatsapp_instances")
        .select("*")
        .eq("id", instance_id)
        .eq("user_id", auth.userId)
        .maybeSingle();

      if (!inst) return jsonResponse({ success: false, error: "Instância não encontrada" }, 404);

      const { url: evolutionUrl, key: evolutionKey } = getEvolutionConfig();
      if (evolutionUrl && evolutionKey && inst.evolution_instance_id) {
        try {
          await fetch(`${evolutionUrl}/instance/delete/${inst.evolution_instance_id}`, {
            method: "DELETE",
            headers: { apikey: evolutionKey },
          });
        } catch (e) {
          console.warn("[DELETE] Evolution warning:", e);
        }
      }

      const { error: delErr } = await adminClient
        .from("whatsapp_instances")
        .delete()
        .eq("id", instance_id)
        .eq("user_id", auth.userId);

      if (delErr) return jsonResponse({ success: false, error: delErr.message }, 500);
      return jsonResponse({ success: true, message: "Instância excluída com sucesso" });
    }

    return jsonResponse({ success: false, error: "Action not found" }, 400);
  } catch (err: any) {
    console.error("[FATAL ERROR]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
});
