import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  Ban,
  Clock,
  RefreshCw,
  Copy,
  Search,
  DollarSign,
  Loader2,
  Save,
} from "lucide-react";

interface Subscriber {
  user_id: string;
  email: string;
  name: string;
  telefone: string;
  created_at: string;
  subscription: {
    id: string;
    status: string;
    gateway: string;
    current_period_end: string | null;
    plans?: { name: string; price_cents: number } | null;
  } | null;
}

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  billing_cycle: string;
  checkout_url: string | null;
}

export default function Admin() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [asaasWebhookUrl, setAsaasWebhookUrl] = useState("");
  const [dbUsage, setDbUsage] = useState<{ used_mb: number; limit_mb: number; percent: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-saas", {
      body: { _action: "dashboard" },
    });
    if (error || !data?.success) {
      toast.error(data?.error || "Erro ao carregar painel Admin");
      setLoading(false);
      return;
    }
    setSubscribers(data.data.subscribers || []);
    setPlans(data.data.plans || []);
    setAsaasWebhookUrl(data.data.asaas_webhook_url || "");
    setDbUsage(data.data.db_usage || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleUpdateSub = async (
    userId: string,
    payload: { status?: string; add_days?: number }
  ) => {
    setUpdatingUser(userId);
    const { data, error } = await supabase.functions.invoke("admin-saas", {
      body: { _action: "update-subscription", user_id: userId, ...payload },
    });
    setUpdatingUser(null);
    if (error || !data?.success) {
      toast.error(data?.error || "Erro ao atualizar assinatura");
      return;
    }
    toast.success("Assinatura atualizada!");
    fetchDashboard();
  };

  const handleSavePlan = async (plan: PlanRow) => {
    setSavingPlan(plan.id);
    const { data, error } = await supabase.functions.invoke("admin-saas", {
      body: {
        _action: "update-plan",
        plan_id: plan.id,
        price_cents: plan.price_cents,
        checkout_url: plan.checkout_url || "",
      },
    });
    setSavingPlan(null);
    if (error || !data?.success) {
      toast.error(data?.error || "Erro ao salvar plano");
      return;
    }
    toast.success(`Plano "${plan.name}" atualizado!`);
  };

  const filtered = subscribers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.telefone.includes(search)
  );

  const activeCount = subscribers.filter((s) => s.subscription?.status === "active").length;
  const trialCount = subscribers.filter((s) => s.subscription?.status === "trial").length;
  const blockedCount = subscribers.filter((s) =>
    ["blocked", "overdue", "canceled"].includes(s.subscription?.status || "")
  ).length;

  const estimatedMrrCents = subscribers
    .filter((s) => s.subscription?.status === "active")
    .reduce((acc, s) => acc + (s.subscription?.plans?.price_cents || 0), 0);

  const statusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ativo</Badge>;
      case "trial":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Trial</Badge>;
      case "overdue":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Atrasado</Badge>;
      case "blocked":
      case "canceled":
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return <Badge variant="secondary">Sem plano</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-emerald-500" />
              Painel Admin SaaS
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gerencie assinantes, ative ou bloqueie acessos com 1 clique e configure seus links do Asaas.
            </p>
          </div>
          <Button variant="outline" onClick={fetchDashboard} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Clientes</p>
                <p className="text-2xl font-bold">{subscribers.length}</p>
              </div>
              <Users className="w-7 h-7 text-gray-400" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Assinaturas Ativas</p>
                <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
              </div>
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Trial / Bloqueados</p>
                <p className="text-2xl font-bold">
                  {trialCount} <span className="text-sm font-normal text-red-500">/ {blockedCount}</span>
                </p>
              </div>
              <Clock className="w-7 h-7 text-blue-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Receita Ativa (MRR)</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {(estimatedMrrCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
              <DollarSign className="w-7 h-7 text-emerald-500" />
            </CardContent>
          </Card>
        </div>

        {/* Medidor de Uso do Banco Supabase */}
        {dbUsage && (
          <Card className={dbUsage.percent >= 75 ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20" : ""}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Uso do Banco de Dados (Supabase)</CardTitle>
              <Badge variant={dbUsage.percent >= 75 ? "destructive" : "secondary"}>
                {dbUsage.used_mb} MB / {dbUsage.limit_mb} MB ({dbUsage.percent}%)
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    dbUsage.percent >= 75 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(dbUsage.percent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {dbUsage.percent >= 75
                  ? "⚠️ Atenção: acima de 75% do plano gratuito. Alerta automático configurado para o seu WhatsApp."
                  : "Capacidade saudável. Se atingir 75%, você receberá um alerta automático no WhatsApp (22992142782)."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Webhook Asaas */}
        {asaasWebhookUrl && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Integração Automática Asaas (Webhook)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <Input readOnly value={asaasWebhookUrl} className="font-mono text-xs" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(asaasWebhookUrl);
                  toast.success("URL do webhook Asaas copiada!");
                }}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar URL
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Planos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Planos e Links de Checkout (Asaas)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className="border rounded-lg p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name}</span>
                  <Badge variant="outline">{plan.billing_cycle === "yearly" ? "Anual" : "Mensal"}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Valor (centavos)</Label>
                    <Input
                      type="number"
                      value={plan.price_cents}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.id === plan.id ? { ...p, price_cents: Number(e.target.value) } : p
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Link Checkout Asaas</Label>
                    <Input
                      placeholder="https://www.asaas.com/c/..."
                      value={plan.checkout_url || ""}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.id === plan.id ? { ...p, checkout_url: e.target.value } : p
                          )
                        )
                      }
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSavePlan(plan)}
                  disabled={savingPlan === plan.id}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
                >
                  {savingPlan === plan.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Salvar Plano
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Lista de Assinantes */}
        <Card>
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Clientes e Assinaturas</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Nenhum cliente encontrado.</p>
            ) : (
              filtered.map((sub) => (
                <div
                  key={sub.user_id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 border rounded-lg bg-white"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{sub.name}</span>
                      {statusBadge(sub.subscription?.status)}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {sub.email} {sub.telefone ? `• WhatsApp: ${sub.telefone}` : ""}
                    </p>
                    {sub.subscription?.current_period_end && (
                      <p className="text-xs text-gray-400">
                        Validade: {new Date(sub.subscription.current_period_end).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingUser === sub.user_id}
                      onClick={() => handleUpdateSub(sub.user_id, { status: "active", add_days: 30 })}
                      className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ativar (+30d)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingUser === sub.user_id}
                      onClick={() => handleUpdateSub(sub.user_id, { status: "blocked" })}
                      className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Bloquear
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
