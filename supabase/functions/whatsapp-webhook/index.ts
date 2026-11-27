import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_REPLY_PREFIXES = ["✅", "📊", "❌"];

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function monthRangeISO(): { start: string; end: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1).toISOString().split("T")[0];
  const end = new Date(year, month + 1, 0).toISOString().split("T")[0];
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return { start, end, label: `${months[month]}/${year}` };
}

async function sendWhatsAppText(
  evoUrl: string,
  evoKey: string,
  instanceName: string,
  remoteJid: string,
  text: string
) {
  if (!evoUrl || !evoKey || !instanceName || !remoteJid) return;
  try {
    await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evoKey },
      body: JSON.stringify({ number: remoteJid, text }),
    });
  } catch (e) {
    console.error("[SEND_TEXT] Error:", e);
  }
}

async function fetchMediaBase64(
  evoUrl: string,
  evoKey: string,
  instanceName: string,
  messageData: any,
  innerMsg: any,
  rootPayload?: any
): Promise<string | null> {
  const inline =
    messageData?.base64 ||
    rootPayload?.base64 ||
    messageData?.message?.base64 ||
    innerMsg?.base64 ||
    innerMsg?.audioMessage?.base64 ||
    innerMsg?.imageMessage?.base64 ||
    null;
  if (inline) return inline;

  if (!evoUrl || !evoKey) return null;
  const endpoints = [
    `/chat/getBase64FromMediaMessage/${instanceName}`,
    `/message/getBase64FromMediaMessage/${instanceName}`,
    `/message/convert/getBase64/${instanceName}`,
  ];
  for (const path of endpoints) {
    const payloads = [
      { message: { key: { id: messageData?.key?.id } } },
      { message: { key: messageData?.key, message: innerMsg || messageData?.message } },
    ];
    for (const bodyObj of payloads) {
      try {
        const res = await fetch(`${evoUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: evoKey },
          body: JSON.stringify(bodyObj),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.base64) return json.base64;
        }
      } catch (e) {
        console.error(`[MEDIA] Fetch base64 error on ${path}:`, e);
      }
    }
  }
  return null;
}

function cleanBase64(raw: string): { b64: string; mime: string } {
  if (raw.includes(",")) {
    const [prefix, b64] = raw.split(",");
    const mime = prefix.split(":")[1]?.split(";")[0] || "application/octet-stream";
    return { b64: b64.replace(/\s/g, ""), mime };
  }
  return { b64: raw.replace(/\s/g, ""), mime: "application/octet-stream" };
}

async function transcribeAudioWithOpenAI(
  b64: string,
  mimeHint: string,
  openAiKey: string
): Promise<string | null> {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const ext = mimeHint.includes("mp4") || mimeHint.includes("m4a")
      ? "m4a"
      : mimeHint.includes("mpeg") || mimeHint.includes("mp3")
      ? "mp3"
      : mimeHint.includes("wav")
      ? "wav"
      : "ogg";
    const mimeType = ext === "ogg" ? "audio/ogg" : `audio/${ext}`;

    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mimeType }), `audio.${ext}`);
    form.append("model", "whisper-1");
    form.append("language", "pt");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: form,
    });
    if (!res.ok) {
      console.error("[WHISPER] Error:", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    return json.text || null;
  } catch (e) {
    console.error("[WHISPER] Exception:", e);
    return null;
  }
}

async function analyzeImageWithOpenAI(
  b64: string,
  mime: string,
  caption: string,
  openAiKey: string,
  forceReminder = false
): Promise<string | null> {
  const finalMime = mime.startsWith("image/") ? mime : "image/jpeg";
  const prompt = forceReminder
    ? `O usuário pediu para ADICIONAR UM LEMBRETE a partir desta imagem${
        caption ? ` (legenda: "${caption}")` : ""
      }. Extraia o compromisso, conta, aviso ou texto principal da imagem e responda APENAS com um JSON válido:
{
  "acao": "lembrete",
  "titulo": "título curto e claro do lembrete",
  "descricao": "detalhes extras visíveis na imagem",
  "data": "YYYY-MM-DD (se não visível, use ${todayISO()})",
  "hora": "HH:MM (se não visível, use 09:00)",
  "prioridade": "baixa | media | alta"
}`
    : `Você é um analista financeiro e assistente pessoal. Analise esta imagem/comprovante/lembrete${
        caption ? ` (legenda: "${caption}")` : ""
      } e responda APENAS com um JSON válido em UM dos formatos abaixo:

1) Se a legenda pedir lembrete (ex: "lembrete", "adicionar lembrete", "me lembre") OU se a imagem for um compromisso/aviso/boleto para lembrar:
{
  "acao": "lembrete",
  "titulo": "título curto do lembrete",
  "descricao": "detalhes extras se houver",
  "data": "YYYY-MM-DD (se não visível, use ${todayISO()})",
  "hora": "HH:MM (se não visível, use 09:00)",
  "prioridade": "baixa | media | alta"
}

2) Caso contrário (nota fiscal, recibo, comprovante PIX, compra ou recebimento):
{
  "acao": "registrar",
  "tipo": "receita" ou "despesa",
  "descricao": "descrição clara da transação",
  "valor": número (apenas número, ex: 150.50),
  "categoria": "Alimentação | Transporte | Moradia | Saúde | Educação | Lazer | Roupas | Tecnologia | Serviços | Salário | Freelance | Investimentos | Vendas | Aluguel Recebido | Outros",
  "data": "YYYY-MM-DD (se não visível, use ${todayISO()})"
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${finalMime};base64,${b64}` } },
          ],
        },
      ],
      max_tokens: 400,
    }),
  });
  if (!res.ok) {
    console.error("[VISION] Error:", await res.text());
    return null;
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || null;
}

async function analyzeTextWithOpenAI(
  text: string,
  openAiKey: string,
  forceReminder = false
): Promise<string | null> {
  const prompt = forceReminder
    ? `O usuário está respondendo com os dados de um LEMBRETE. Hoje é ${todayISO()}.
Extraia o lembrete da mensagem e responda APENAS com um JSON válido:
{
  "acao": "lembrete",
  "titulo": "título curto do lembrete",
  "descricao": "detalhes extras se houver",
  "data": "YYYY-MM-DD (se não informada, use ${todayISO()})",
  "hora": "HH:MM (se não informada, use 09:00)",
  "prioridade": "baixa | media | alta"
}
Mensagem: "${text}"`
    : `Você é o assistente financeiro do Organiza-AI. Hoje é ${todayISO()}.
Analise a mensagem do usuário e responda APENAS com um JSON válido:

1) Se for um registro de gasto ou ganho (se mencionar parcelado, ex: "em 10x de 200", informe "parcelas": 10 e "valor": 200 como valor de cada parcela):
{
  "acao": "registrar",
  "tipo": "despesa" ou "receita",
  "descricao": "descrição curta e clara",
  "valor": número (ex: 29.90),
  "parcelas": número inteiro >= 1 (padrão 1),
  "categoria": "Alimentação | Transporte | Moradia | Saúde | Educação | Lazer | Roupas | Tecnologia | Serviços | Salário | Freelance | Investimentos | Vendas | Aluguel Recebido | Outros",
  "data": "YYYY-MM-DD"
}

2) Se for uma consulta de gastos do mês ("quanto gastei", "total despesas", "quanto saiu"):
{ "acao": "consultar_despesas" }

3) Se for uma consulta de receitas do mês ("quanto recebi", "total receitas", "quanto entrou"):
{ "acao": "consultar_receitas" }

4) Se for uma consulta de saldo ("qual meu saldo", "resumo financeiro"):
{ "acao": "consultar_saldo" }

5) Se o usuário pedir apenas para adicionar um lembrete SEM informar qual é o lembrete/título (ex: "adicionar lembrete", "criar lembrete", "quero um lembrete"):
{ "acao": "pedir_lembrete" }

6) Se o usuário informar um lembrete com o assunto/compromisso (ex: "lembrete pagar luz amanhã às 10h", "me lembre de ir ao médico dia 30 às 14:30"):
{
  "acao": "lembrete",
  "titulo": "título curto do lembrete",
  "descricao": "detalhes extras se houver",
  "data": "YYYY-MM-DD (se não informada, use ${todayISO()})",
  "hora": "HH:MM (se não informada, use 09:00)",
  "prioridade": "baixa | media | alta"
}

7) Se o usuário quiser cancelar, excluir ou remover um lembrete existente (ex: "cancelar lembrete de pegar Guilherme", "excluir lembrete da conta de luz"):
{
  "acao": "cancelar_lembrete",
  "termo": "palavra-chave principal do lembrete"
}

8) Se o usuário perguntar pelos seus lembretes, contas a vencer ou dívidas (ex: "quais são meus lembretes", "o que vence essa semana", "minhas dívidas"):
{ "acao": "consultar_lembretes_dividas" }

9) Se o usuário pedir para apagar/desfazer o último lançamento, gasto ou receita (ex: "apagar último gasto", "desfazer último lançamento", "excluir última despesa"):
{ "acao": "desfazer_ultimo" }

10) Se o usuário pedir para definir um orçamento/limite mensal para uma categoria de despesa (ex: "definir orçamento de Alimentação em 800", "limite de Transporte 500"):
{
  "acao": "definir_orcamento",
  "categoria": "nome da categoria",
  "valor": número (ex: 800)
}

11) Se não for possível identificar nenhuma das opções acima:
{ "acao": "invalido" }

Mensagem: "${text}"`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 300,
    }),
  });
  if (!res.ok) {
    console.error("[TEXT_AI] Error:", await res.text());
    return null;
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || null;
}

async function resolveUserId(adminClient: any, remoteJid: string, fallbackUserId: string): Promise<string> {
  const rawDigits = remoteJid.split("@")[0].split(":")[0].replace(/\D/g, "");
  const without55 = rawDigits.startsWith("55") ? rawDigits.slice(2) : rawDigits;

  const candidates = [rawDigits, without55];
  if (without55.length === 11) {
    candidates.push(`${without55.slice(0, 2)} ${without55.slice(2)}`);
  }

  for (const phone of candidates) {
    if (!phone) continue;
    const { data } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("telefone", phone)
      .limit(1)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  return fallbackUserId;
}

async function resolveCategoryId(
  adminClient: any,
  userId: string,
  tipo: "receita" | "despesa",
  categoryName: string
): Promise<{ id: string | null; nome: string; orcamento_mensal: number | null }> {
  const { data: cats } = await adminClient
    .from("categorias")
    .select("id, nome, tipo, orcamento_mensal")
    .eq("user_id", userId)
    .eq("tipo", tipo);

  if (!cats || cats.length === 0) {
    return { id: null, nome: categoryName || "Outros", orcamento_mensal: null };
  }

  const target = (categoryName || "").toLowerCase().trim();
  const exact = cats.find((c: any) => c.nome.toLowerCase() === target);
  if (exact) return { id: exact.id, nome: exact.nome, orcamento_mensal: exact.orcamento_mensal ? Number(exact.orcamento_mensal) : null };

  const partial = cats.find(
    (c: any) => c.nome.toLowerCase().includes(target) || target.includes(c.nome.toLowerCase())
  );
  if (partial) return { id: partial.id, nome: partial.nome, orcamento_mensal: partial.orcamento_mensal ? Number(partial.orcamento_mensal) : null };

  const outros = cats.find((c: any) => c.nome.toLowerCase() === "outros");
  if (outros) return { id: outros.id, nome: outros.nome, orcamento_mensal: outros.orcamento_mensal ? Number(outros.orcamento_mensal) : null };

  return { id: cats[0].id, nome: cats[0].nome, orcamento_mensal: cats[0].orcamento_mensal ? Number(cats[0].orcamento_mensal) : null };
}

async function sumMonth(
  adminClient: any,
  userId: string,
  tipo: "receita" | "despesa",
  start: string,
  end: string
): Promise<number> {
  const table = tipo === "receita" ? "receitas" : "despesas";
  const [{ data: directRows }, { data: transRows }] = await Promise.all([
    adminClient.from(table).select("valor").eq("user_id", userId).gte("data", start).lte("data", end),
    adminClient
      .from("transacoes")
      .select("valor")
      .eq("user_id", userId)
      .eq("tipo", tipo)
      .gte("data", start)
      .lte("data", end),
  ]);

  const sumDirect = (directRows || []).reduce((acc: number, r: any) => acc + Number(r.valor || 0), 0);
  const sumTrans = (transRows || []).reduce((acc: number, r: any) => acc + Number(r.valor || 0), 0);
  return sumDirect + sumTrans;
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
    const openAiKey = (Deno.env.get("OPENAI_API_KEY") || "").trim();

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

    // 1. Atualização de QR Code
    if (event === "QRCODE_UPDATED" || event === "QRCODE.UPDATED") {
      const qr = payload.data?.qrcode?.base64 || payload.data?.base64 || null;
      if (qr) {
        await adminClient
          .from("whatsapp_instances")
          .update({ qr_code: qr, status: "connecting" })
          .eq("id", inst.id);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Atualização de Status de Conexão
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
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Processamento direto de mensagens (sem n8n)
    if (event !== "MESSAGES_UPSERT" && event !== "MESSAGES.UPSERT") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msgData = payload.data;
    const rawRemoteJid: string = msgData?.key?.remoteJid || "";
    const remoteJid: string = msgData?.key?.remoteJidAlt || rawRemoteJid;

    if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") {
      return new Response(JSON.stringify({ ok: true, ignored: "group/status" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Evita processamento duplicado quando o usuário envia de uma instância conectada para outra
    const cleanTargetPhone = remoteJid.split("@")[0].split(":")[0].replace(/\D/g, "");
    const cleanInstPhone = (inst.phone || "").replace(/\D/g, "");
    if (msgData?.key?.fromMe === true && cleanInstPhone && cleanTargetPhone && cleanInstPhone !== cleanTargetPhone) {
      return new Response(JSON.stringify({ ok: true, ignored: "outbound_to_other_contact" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const innerMsg =
      msgData?.message?.ephemeralMessage?.message ||
      msgData?.message?.viewOnceMessage?.message ||
      msgData?.message?.viewOnceMessageV2?.message ||
      msgData?.message ||
      {};

    const textContent: string =
      innerMsg?.conversation ||
      innerMsg?.extendedTextMessage?.text ||
      "";

    // Trava anti-loop inteligente: ignora respostas do próprio bot
    if (
      BOT_REPLY_PREFIXES.some((prefix) => textContent.trim().startsWith(prefix)) ||
      textContent.trim().startsWith("🔔 Qual é o lembrete")
    ) {
      return new Response(JSON.stringify({ ok: true, ignored: "bot_reply" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!openAiKey) {
      await sendWhatsAppText(
        evoUrl,
        evoKey,
        evoInstanceName,
        remoteJid,
        "❌ OPENAI_API_KEY não configurada nos Secrets do Supabase."
      );
      return new Response(JSON.stringify({ ok: false, error: "missing openai key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica estado pendente (ex.: usuário digitou "adicionar lembrete" na mensagem anterior)
    const { data: pendingState } = await adminClient
      .from("whatsapp_conversation_state")
      .select("pending_action, expires_at")
      .eq("phone", remoteJid)
      .maybeSingle();

    const forceReminder =
      pendingState?.pending_action === "lembrete" &&
      new Date(pendingState.expires_at) > new Date();

    if (pendingState) {
      await adminClient.from("whatsapp_conversation_state").delete().eq("phone", remoteJid);
    }

    // Atalho determinístico se o usuário só pediu "adicionar lembrete"
    const normalizedText = textContent.trim().toLowerCase().replace(/[!?.]/g, "");
    if (
      !forceReminder &&
      ["adicionar lembrete", "criar lembrete", "novo lembrete", "lembrete"].includes(normalizedText)
    ) {
      await adminClient.from("whatsapp_conversation_state").upsert({
        phone: remoteJid,
        pending_action: "lembrete",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      await sendWhatsAppText(
        evoUrl,
        evoKey,
        evoInstanceName,
        remoteJid,
        "🔔 Qual é o lembrete, a data e a hora?\n\nVocê pode responder por *texto*, *áudio* ou enviar uma *imagem* do lembrete (ex.: \"Lembrete: pagar internet dia 30/11 às 10:00\")."
      );
      return new Response(JSON.stringify({ ok: true, awaiting: "lembrete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageType: string = msgData?.messageType || "";
    let aiRawJson: string | null = null;

    if (messageType === "audioMessage" || innerMsg?.audioMessage) {
      const rawB64 = await fetchMediaBase64(evoUrl, evoKey, evoInstanceName, msgData, innerMsg, payload);
      if (rawB64) {
        const { b64, mime } = cleanBase64(rawB64);
        const mimeHint = innerMsg?.audioMessage?.mimetype || mime || "audio/ogg";
        const transcript = await transcribeAudioWithOpenAI(b64, mimeHint, openAiKey);
        if (transcript) {
          const normTranscript = transcript.trim().toLowerCase().replace(/[!?.]/g, "");
          if (
            !forceReminder &&
            ["adicionar lembrete", "criar lembrete", "novo lembrete", "lembrete"].includes(normTranscript)
          ) {
            aiRawJson = JSON.stringify({ acao: "pedir_lembrete" });
          } else {
            aiRawJson = await analyzeTextWithOpenAI(transcript, openAiKey, forceReminder);
          }
        }
      }
    } else if (messageType === "imageMessage" || innerMsg?.imageMessage) {
      const rawB64 = await fetchMediaBase64(evoUrl, evoKey, evoInstanceName, msgData, innerMsg, payload);
      if (rawB64) {
        const { b64, mime } = cleanBase64(rawB64);
        const mimeHint = innerMsg?.imageMessage?.mimetype || mime || "image/jpeg";
        const caption = innerMsg?.imageMessage?.caption || "";
        aiRawJson = await analyzeImageWithOpenAI(b64, mimeHint, caption, openAiKey, forceReminder);
      }
    } else if (textContent.trim()) {
      aiRawJson = await analyzeTextWithOpenAI(textContent.trim(), openAiKey, forceReminder);
    } else {
      return new Response(JSON.stringify({ ok: true, ignored: "unsupported_empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!aiRawJson) {
      await sendWhatsAppText(
        evoUrl,
        evoKey,
        evoInstanceName,
        remoteJid,
        "❌ Não consegui processar sua mensagem. Tente enviar em texto, áudio ou foto nítida do recibo."
      );
      return new Response(JSON.stringify({ ok: true, step: "aiRawJson_null", messageType }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(aiRawJson);
    } catch {
      parsed = { acao: "invalido" };
    }

    const userId = await resolveUserId(adminClient, remoteJid, inst.user_id);

    // Verifica se o usuário possui assinatura ativa (ou é admin) antes de processar IA
    const [{ data: roleRow }, { data: subRow }] = await Promise.all([
      adminClient.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      adminClient.from("subscriptions").select("status, current_period_end").eq("user_id", userId).maybeSingle(),
    ]);
    const isAdminUser = !!roleRow;
    const isSubActive =
      isAdminUser ||
      ((subRow?.status === "active" || subRow?.status === "trial") &&
        (!subRow?.current_period_end || new Date(subRow.current_period_end) > new Date()));

    if (!isSubActive) {
      await sendWhatsAppText(
        evoUrl,
        evoKey,
        evoInstanceName,
        remoteJid,
        "❌ Sua assinatura do Organiza-AI está inativa ou vencida. Acesse o painel para renovar seu plano e continuar registrando pelo WhatsApp."
      );
      return new Response(JSON.stringify({ ok: true, blocked: "subscription_inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.acao === "registrar" && Number(parsed.valor) > 0 && parsed.descricao) {
      const tipo: "receita" | "despesa" = parsed.tipo === "receita" ? "receita" : "despesa";
      const table = tipo === "receita" ? "receitas" : "despesas";
      const valor = Math.round(Number(parsed.valor) * 100) / 100;
      const parcelas = Math.min(Math.max(parseInt(parsed.parcelas || "1", 10) || 1, 1), 36);
      const baseDate = new Date((parsed.data || todayISO()) + "T12:00:00Z");
      const { id: categoriaId, nome: categoriaNome, orcamento_mensal: orcamentoMensal } = await resolveCategoryId(
        adminClient,
        userId,
        tipo,
        parsed.categoria || "Outros"
      );

      const rowsToInsert = Array.from({ length: parcelas }, (_, idx) => {
        const d = new Date(baseDate);
        d.setUTCMonth(d.getUTCMonth() + idx);
        const desc =
          parcelas > 1
            ? `${String(parsed.descricao).trim()} (${idx + 1}/${parcelas})`
            : String(parsed.descricao).trim();
        return {
          user_id: userId,
          categoria_id: categoriaId,
          descricao: desc,
          valor,
          data: d.toISOString().split("T")[0],
        };
      });

      const { error: insertErr } = await adminClient.from(table).insert(rowsToInsert);

      if (insertErr) {
        console.error("[INSERT] Error:", insertErr);
        await sendWhatsAppText(
          evoUrl,
          evoKey,
          evoInstanceName,
          remoteJid,
          `❌ Erro ao salvar ${tipo}: ${insertErr.message}`
        );
      } else {
        const labelTipo = tipo === "receita" ? "Receita" : "Despesa";
        let budgetAlert = "";

        if (tipo === "despesa" && categoriaId && orcamentoMensal && orcamentoMensal > 0) {
          const { start, end } = monthRangeISO();
          const { data: catRows } = await adminClient
            .from("despesas")
            .select("valor")
            .eq("user_id", userId)
            .eq("categoria_id", categoriaId)
            .gte("data", start)
            .lte("data", end);
          const totalCat = (catRows || []).reduce((acc: number, r: any) => acc + Number(r.valor || 0), 0);
          const pct = Math.round((totalCat / orcamentoMensal) * 100);
          if (pct >= 80) {
            budgetAlert = `\n\n⚠️ Atenção: você já usou *${pct}%* do seu orçamento de *${categoriaNome}* este mês (R$ ${formatBRL(totalCat)} de R$ ${formatBRL(orcamentoMensal)}).`;
          }
        }

        await sendWhatsAppText(
          evoUrl,
          evoKey,
          evoInstanceName,
          remoteJid,
          `✅ ${labelTipo} registrada${parcelas > 1 ? ` (${parcelas}x)` : ""}:\n📝 ${parsed.descricao}\n💰 R$ ${formatBRL(valor)}${parcelas > 1 ? " /mês" : ""}\n🏷️ ${categoriaNome}${budgetAlert}`
        );
      }
    } else if (parsed.acao === "pedir_lembrete") {
      await adminClient.from("whatsapp_conversation_state").upsert({
        phone: remoteJid,
        pending_action: "lembrete",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      await sendWhatsAppText(
        evoUrl,
        evoKey,
        evoInstanceName,
        remoteJid,
        "🔔 Qual é o lembrete, a data e a hora?\n\nVocê pode responder por *texto*, *áudio* ou enviar uma *imagem* do lembrete (ex.: \"Lembrete: pagar internet dia 30/11 às 10:00\")."
      );
    } else if (parsed.acao === "lembrete" && parsed.titulo) {
      const dataLembrete = parsed.data || todayISO();
      const horaLembrete = parsed.hora || "09:00";
      const prioridade = ["baixa", "media", "alta"].includes(parsed.prioridade)
        ? parsed.prioridade
        : "media";

      const { error: lembErr } = await adminClient.from("lembretes").insert({
        user_id: userId,
        titulo: String(parsed.titulo).trim(),
        descricao: parsed.descricao ? String(parsed.descricao).trim() : null,
        data: dataLembrete,
        hora: horaLembrete,
        prioridade,
        concluido: false,
      });

      if (lembErr) {
        await sendWhatsAppText(
          evoUrl,
          evoKey,
          evoInstanceName,
          remoteJid,
          `❌ Erro ao salvar lembrete: ${lembErr.message}`
        );
      } else {
        const [y, m, d] = dataLembrete.split("-");
        await sendWhatsAppText(
          evoUrl,
          evoKey,
          evoInstanceName,
          remoteJid,
          `✅ Lembrete agendado:\n🔔 ${parsed.titulo}\n📅 ${d}/${m}/${y} às ${horaLembrete}`
        );
      }
    } else if (parsed.acao === "cancelar_lembrete") {
      const termo = String(parsed.termo || "").trim();
      const { data: openReminders } = await adminClient
        .from("lembretes")
        .select("id, titulo, data, hora")
        .eq("user_id", userId)
        .eq("concluido", false)
        .order("data", { ascending: true });

      const match = (openReminders || []).find((r: any) =>
        termo ? r.titulo.toLowerCase().includes(termo.toLowerCase()) : false
      );

      if (match) {
        await adminClient.from("lembretes").delete().eq("id", match.id).eq("user_id", userId);
        await sendWhatsAppText(
          evoUrl,
          evoKey,
          evoInstanceName,
          remoteJid,
          `✅ Lembrete cancelado:\n🔔 ${match.titulo}`
        );
      } else if (!openReminders || openReminders.length === 0) {
        await sendWhatsAppText(
          evoUrl,
          evoKey,
          evoInstanceName,
          remoteJid,
          "📊 Você não tem nenhum lembrete pendente no momento."
        );
      } else {
        const lista = openReminders
          .slice(0, 5)
          .map((r: any) => `• ${r.titulo} (${r.data.split("-").reverse().join("/")})`)
          .join("\n");
        await sendWhatsAppText(
          evoUrl,
          evoKey,
          evoInstanceName,
          remoteJid,
          `❌ Não encontrei um lembrete com "${termo}". Seus lembretes ativos:\n${lista}`
        );
      }
    } else if (parsed.acao === "consultar_lembretes_dividas") {
      const [{ data: lembs }, { data: divs }] = await Promise.all([
        adminClient
          .from("lembretes")
          .select("titulo, data, hora")
          .eq("user_id", userId)
          .eq("concluido", false)
          .order("data", { ascending: true })
          .limit(10),
        adminClient
          .from("dividas")
          .select("descricao, valor_restante, data_vencimento, status")
          .eq("user_id", userId)
          .in("status", ["pendente", "vencida"])
          .order("data_vencimento", { ascending: true })
          .limit(10),
      ]);

      const lembText = (lembs && lembs.length > 0)
        ? lembs.map((l: any) => `• ${l.titulo} (${l.data.split("-").reverse().join("/")}${l.hora ? ` às ${String(l.hora).slice(0, 5)}` : ""})`).join("\n")
        : "Nenhum lembrete pendente.";

      const divText = (divs && divs.length > 0)
        ? divs.map((d: any) => `• ${d.descricao}: R$ ${formatBRL(Number(d.valor_restante || 0))} (vence ${d.data_vencimento.split("-").reverse().join("/")})`).join("\n")
        : "Nenhuma dívida/conta pendente.";

      await sendWhatsAppText(
        evoUrl,
        evoKey,
        evoInstanceName,
        remoteJid,
        `📊 *Seus Lembretes e Contas:*\n\n🔔 *Lembretes:*\n${lembText}\n\n💳 *Contas/Dívidas a vencer:*\n${divText}`
      );
    } else if (parsed.acao === "desfazer_ultimo") {
      const [{ data: lastDesp }, { data: lastRec }] = await Promise.all([
        adminClient
          .from("despesas")
          .select("id, descricao, valor, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        adminClient
          .from("receitas")
          .select("id, descricao, valor, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      let target: { table: "despesas" | "receitas"; row: any } | null = null;
      if (lastDesp && lastRec) {
        target = new Date(lastDesp.created_at) >= new Date(lastRec.created_at)
          ? { table: "despesas", row: lastDesp }
          : { table: "receitas", row: lastRec };
      } else if (lastDesp) {
        target = { table: "despesas", row: lastDesp };
      } else if (lastRec) {
        target = { table: "receitas", row: lastRec };
      }

      if (!target) {
        await sendWhatsAppText(evoUrl, evoKey, evoInstanceName, remoteJid, "📊 Não encontrei nenhum lançamento recente para apagar.");
      } else {
        await adminClient.from(target.table).delete().eq("id", target.row.id).eq("user_id", userId);
        await sendWhatsAppText(
          evoUrl,
          evoKey,
          evoInstanceName,
          remoteJid,
          `✅ Último lançamento apagado:\n📝 ${target.row.descricao} (R$ ${formatBRL(Number(target.row.valor || 0))})`
        );
      }
    } else if (parsed.acao === "definir_orcamento" && Number(parsed.valor) > 0 && parsed.categoria) {
      const { id: catId, nome: catNome } = await resolveCategoryId(adminClient, userId, "despesa", parsed.categoria);
      if (!catId) {
        await sendWhatsAppText(evoUrl, evoKey, evoInstanceName, remoteJid, "❌ Não encontrei essa categoria de despesa.");
      } else {
        const limite = Math.round(Number(parsed.valor) * 100) / 100;
        await adminClient.from("categorias").update({ orcamento_mensal: limite }).eq("id", catId);
        await sendWhatsAppText(
          evoUrl,
          evoKey,
          evoInstanceName,
          remoteJid,
          `✅ Orçamento mensal definido:\n🏷️ ${catNome}: R$ ${formatBRL(limite)}\n\nVou te avisar quando seus gastos atingirem 80% deste limite.`
        );
      }
    } else if (parsed.acao === "consultar_despesas") {
      const { start, end, label } = monthRangeISO();
      const total = await sumMonth(adminClient, userId, "despesa", start, end);
      await sendWhatsAppText(
        evoUrl,
        evoKey,
        evoInstanceName,
        remoteJid,
        `📊 Total de despesas em ${label}:\n💰 R$ ${formatBRL(total)}`
      );
    } else if (parsed.acao === "consultar_receitas") {
      const { start, end, label } = monthRangeISO();
      const total = await sumMonth(adminClient, userId, "receita", start, end);
      await sendWhatsAppText(
        evoUrl,
        evoKey,
        evoInstanceName,
        remoteJid,
        `📊 Total de receitas em ${label}:\n💰 R$ ${formatBRL(total)}`
      );
    } else if (parsed.acao === "consultar_saldo") {
      const { start, end, label } = monthRangeISO();
      const [rec, desp] = await Promise.all([
        sumMonth(adminClient, userId, "receita", start, end),
        sumMonth(adminClient, userId, "despesa", start, end),
      ]);
      await sendWhatsAppText(
        evoUrl,
        evoKey,
        evoInstanceName,
        remoteJid,
        `📊 Resumo Financeiro - ${label}:\n💰 Receitas: R$ ${formatBRL(rec)}\n💰 Despesas: R$ ${formatBRL(desp)}\n💰 Saldo: R$ ${formatBRL(rec - desp)}`
      );
    } else {
      await sendWhatsAppText(
        evoUrl,
        evoKey,
        evoInstanceName,
        remoteJid,
        "❌ Formato inválido. Tente algo como: \"Gastei 35,00 no almoço\", \"Recebi 1500 de freela\", ou envie um áudio / foto de recibo."
      );
    }

    return new Response(JSON.stringify({ ok: true, step: "done", acao: parsed.acao || null }), {
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
