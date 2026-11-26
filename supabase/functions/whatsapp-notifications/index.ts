import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeWhatsAppNumber(rawPhone: string): string | null {
  const digits = (rawPhone || "").replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `${withCountry}@s.whatsapp.net`;
}

async function sendWhatsApp(
  evoUrl: string,
  evoKey: string,
  instanceName: string,
  remoteJid: string,
  text: string
) {
  if (!evoUrl || !evoKey || !instanceName || !remoteJid) return false;
  try {
    const res = await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evoKey },
      body: JSON.stringify({ number: remoteJid, text }),
    });
    return res.ok;
  } catch (e) {
    console.error("[NOTIFY] Send error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evoUrl = (Deno.env.get("EVOLUTION_API_URL") || "").trim().replace(/\/+$/, "");
    const evoKey = (Deno.env.get("EVOLUTION_API_KEY") || "").trim();

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode = body.mode || "auto";

    // Data atual no fuso de Brasília (UTC-3)
    const nowBRT = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayStr = nowBRT.toISOString().split("T")[0];
    const isFirstDayOfMonth = nowBRT.getUTCDate() === 1;

    // Busca instâncias WhatsApp conectadas
    const { data: connectedInstances } = await adminClient
      .from("whatsapp_instances")
      .select("user_id, evolution_instance_id")
      .eq("status", "connected");

    const instanceByUser = new Map(
      (connectedInstances || []).map((i: any) => [i.user_id, i.evolution_instance_id])
    );
    const fallbackInstance = connectedInstances?.[0]?.evolution_instance_id || null;

    if (!fallbackInstance) {
      return new Response(JSON.stringify({ ok: true, skipped: "no connected whatsapp instance" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca perfis com telefone e assinaturas ativas
    const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
      adminClient.from("profiles").select("user_id, name, telefone"),
      adminClient.from("subscriptions").select("user_id, status, current_period_end"),
    ]);

    const subMap = new Map((subscriptions || []).map((s: any) => [s.user_id, s]));
    let sentReminders = 0;
    let sentSummaries = 0;

    for (const prof of profiles || []) {
      const remoteJid = normalizeWhatsAppNumber(prof.telefone || "");
      if (!remoteJid) continue;

      const sub: any = subMap.get(prof.user_id);
      const active =
        sub &&
        (sub.status === "active" || sub.status === "trial") &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      if (!active) continue;

      const evoInstance = instanceByUser.get(prof.user_id) || fallbackInstance;

      // 1. Lembretes e dívidas vencendo hoje
      if (mode === "auto" || mode === "daily-reminders") {
        const [{ data: lembretes }, { data: dividas }] = await Promise.all([
          adminClient
            .from("lembretes")
            .select("titulo, descricao")
            .eq("user_id", prof.user_id)
            .eq("data", todayStr)
            .eq("concluido", false),
          adminClient
            .from("dividas")
            .select("descricao, valor_restante")
            .eq("user_id", prof.user_id)
            .eq("data_vencimento", todayStr)
            .in("status", ["pendente", "vencida"]),
        ]);

        for (const l of lembretes || []) {
          const ok = await sendWhatsApp(
            evoUrl,
            evoKey,
            evoInstance,
            remoteJid,
            `☀️ Bom dia, ${prof.name || ""}! Lembrete de hoje:\n🔔 *${l.titulo}*${
              l.descricao ? `\n📝 ${l.descricao}` : ""
            }`
          );
          if (ok) sentReminders++;
        }

        for (const d of dividas || []) {
          const ok = await sendWhatsApp(
            evoUrl,
            evoKey,
            evoInstance,
            remoteJid,
            `☀️ Bom dia! Sua conta *${d.descricao}* (R$ ${formatBRL(Number(d.valor_restante || 0))}) vence hoje.`
          );
          if (ok) sentReminders++;
        }
      }

      // 2. Resumo mensal (todo dia 1º do mês)
      if ((mode === "auto" && isFirstDayOfMonth) || mode === "monthly-summary") {
        const prevMonthEnd = new Date(Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), 0));
        const prevMonthStart = new Date(Date.UTC(prevMonthEnd.getUTCFullYear(), prevMonthEnd.getUTCMonth(), 1));
        const startStr = prevMonthStart.toISOString().split("T")[0];
        const endStr = prevMonthEnd.toISOString().split("T")[0];

        const [{ data: recRows }, { data: despRows }] = await Promise.all([
          adminClient
            .from("receitas")
            .select("valor")
            .eq("user_id", prof.user_id)
            .gte("data", startStr)
            .lte("data", endStr),
          adminClient
            .from("despesas")
            .select("valor, categorias(nome)")
            .eq("user_id", prof.user_id)
            .gte("data", startStr)
            .lte("data", endStr),
        ]);

        const totalRec = (recRows || []).reduce((acc: number, r: any) => acc + Number(r.valor || 0), 0);
        const totalDesp = (despRows || []).reduce((acc: number, r: any) => acc + Number(r.valor || 0), 0);

        if (totalRec > 0 || totalDesp > 0) {
          const catTotals = new Map<string, number>();
          for (const d of despRows || []) {
            const catName = (d as any)?.categorias?.nome || "Outros";
            catTotals.set(catName, (catTotals.get(catName) || 0) + Number(d.valor || 0));
          }
          const top3 = [...catTotals.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, val], i) => `${i + 1}. ${name}: R$ ${formatBRL(val)}`)
            .join("\n");

          const msg = `📊 *Resumo Financeiro do Mês Anterior*\n\n💰 Entradas: R$ ${formatBRL(
            totalRec
          )}\n💸 Saídas: R$ ${formatBRL(totalDesp)}\n📌 Saldo: R$ ${formatBRL(totalRec - totalDesp)}${
            top3 ? `\n\n🏷️ *Top 3 Categorias de Gastos:*\n${top3}` : ""
          }`;

          const ok = await sendWhatsApp(evoUrl, evoKey, evoInstance, remoteJid, msg);
          if (ok) sentSummaries++;
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, today: todayStr, sentReminders, sentSummaries }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[NOTIFY] Fatal error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
