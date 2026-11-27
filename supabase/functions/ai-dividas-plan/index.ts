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

  return { userId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ success: false, error: "Não autorizado." }, 401);
    }

    const openAiKey = (Deno.env.get("OPENAI_API_KEY") || "").trim();
    if (!openAiKey) {
      return jsonResponse({ success: false, error: "OPENAI_API_KEY não configurada no servidor." }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch user's debts
    const { data: dividas, error: divErr } = await adminClient
      .from("dividas")
      .select("descricao, credor, valor_total, valor_pago, valor_restante, parcelas, parcelas_pagas, data_vencimento, status")
      .eq("user_id", auth.userId)
      .order("data_vencimento", { ascending: true });

    if (divErr) {
      return jsonResponse({ success: false, error: divErr.message }, 500);
    }

    const activeDebts = (dividas || []).filter((d) => d.status !== "quitada" && Number(d.valor_restante) > 0);
    if (activeDebts.length === 0) {
      return jsonResponse({
        success: true,
        plan: "🎉 Parabéns! Você não possui dívidas pendentes ou vencidas no momento.\n\nAproveite para direcionar a sua sobra mensal para uma reserva de emergência ou metas financeiras!",
      });
    }

    // Current month cashflow (America/Sao_Paulo)
    const nowBr = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const ym = `${nowBr.getFullYear()}-${String(nowBr.getMonth() + 1).padStart(2, "0")}`;
    const startMonth = `${ym}-01`;
    const lastDay = new Date(nowBr.getFullYear(), nowBr.getMonth() + 1, 0).getDate();
    const endMonth = `${ym}-${String(lastDay).padStart(2, "0")}`;

    const [recRes, despRes, transRes] = await Promise.all([
      adminClient.from("receitas").select("valor").eq("user_id", auth.userId).gte("data", startMonth).lte("data", endMonth),
      adminClient.from("despesas").select("valor").eq("user_id", auth.userId).gte("data", startMonth).lte("data", endMonth),
      adminClient.from("transacoes").select("tipo, valor").eq("user_id", auth.userId).gte("data", startMonth).lte("data", endMonth),
    ]);

    const receitasMes =
      (recRes.data || []).reduce((s, r) => s + Number(r.valor || 0), 0) +
      (transRes.data || []).filter((t) => t.tipo === "receita").reduce((s, r) => s + Number(r.valor || 0), 0);

    const despesasMes =
      (despRes.data || []).reduce((s, r) => s + Number(r.valor || 0), 0) +
      (transRes.data || []).filter((t) => t.tipo === "despesa").reduce((s, r) => s + Number(r.valor || 0), 0);

    const saldoMes = receitasMes - despesasMes;
    const totalRestante = activeDebts.reduce((s, d) => s + Number(d.valor_restante || 0), 0);

    const debtsSummaryText = activeDebts
      .map((d, idx) => {
        const parcRest = Math.max(0, Number(d.parcelas || 1) - Number(d.parcelas_pagas || 0));
        return `${idx + 1}. ${d.descricao} (Credor: ${d.credor}) | Restante: R$ ${Number(d.valor_restante).toFixed(2)} | Total: R$ ${Number(d.valor_total).toFixed(2)} | Parcelas restantes: ${parcRest}/${d.parcelas} | Vencimento: ${d.data_vencimento} | Status: ${d.status}`;
      })
      .join("\n");

    const systemPrompt = `Você é o Consultor Financeiro de Dívidas do Organiza-AI (Brasil).
Sua missão é montar um plano prático, claro, realista e motivador em português para o usuário quitar suas dívidas.
Estruture a resposta com títulos simples e objetivos:
1. 📊 Diagnóstico Rápido (total devido, vencidas vs pendentes, e relação com o fluxo do mês)
2. 🎯 Ordem Recomendada de Pagamento (explique se vale mais começar pelas vencidas/urgentes e depois usar o método Bola de Neve ou Avalanche, listando a ordem exata das dívidas do usuário)
3. 💰 Sugestão de Orçamento Mensal (quanto separar por mês com base nas receitas/despesas do mês; se o saldo estiver negativo ou zerado, dê ações concretas para liberar caixa)
4. ✅ Próximos 3 Passos Imediatos (ações práticas para esta semana)
Não invente números que não foram passados. Seja direto e evite jargões complicados.`;

    const userPrompt = `Data de hoje: ${nowBr.toLocaleDateString("pt-BR")}
Resumo do mês atual:
- Receitas do mês: R$ ${receitasMes.toFixed(2)}
- Despesas do mês: R$ ${despesasMes.toFixed(2)}
- Saldo do mês: R$ ${saldoMes.toFixed(2)}

Dívidas ativas (Total restante: R$ ${totalRestante.toFixed(2)}):
${debtsSummaryText}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1100,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return jsonResponse({ success: false, error: `Erro OpenAI (${aiRes.status}): ${errText}` }, 502);
    }

    const aiData = await aiRes.json();
    const plan = aiData.choices?.[0]?.message?.content?.trim() || "Não foi possível gerar o plano no momento.";

    return jsonResponse({
      success: true,
      plan,
      summary: {
        totalRestante,
        ativas: activeDebts.length,
        vencidas: activeDebts.filter((d) => d.status === "vencida").length,
        receitasMes,
        despesasMes,
        saldoMes,
      },
    });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Erro interno." },
      500
    );
  }
});
