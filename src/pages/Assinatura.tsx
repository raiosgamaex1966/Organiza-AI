import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, RefreshCw, LogOut, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Assinatura() {
  const { subscription, plans, hasAccess, loading, refetch } = useSubscription();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleCheckout = (checkoutUrl: string | null) => {
    if (checkoutUrl) {
      const sep = checkoutUrl.includes("?") ? "&" : "?";
      const urlWithRef = user?.id ? `${checkoutUrl}${sep}externalReference=${user.id}` : checkoutUrl;
      window.open(urlWithRef, "_blank", "noopener,noreferrer");
    } else {
      window.open(
        "https://wa.me/5511999999999?text=Olá!%20Gostaria%20de%20ativar%20minha%20assinatura%20do%20Organiza-AI.",
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-4xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
            <Lock className="w-6 h-6 text-orange-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {hasAccess ? "Sua Assinatura está Ativa" : "Assinatura Inativa ou Expirada"}
          </h1>
          <p className="text-sm text-gray-600 max-w-xl mx-auto">
            {hasAccess
              ? "Seu acesso ao Organiza-AI e ao Assistente no WhatsApp está liberado."
              : "Para continuar acessando o painel e enviando áudios e recibos pelo WhatsApp, escolha um plano abaixo."}
          </p>
          {subscription && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <Badge variant={hasAccess ? "default" : "destructive"}>
                Status: {subscription.status.toUpperCase()}
              </Badge>
              {subscription.current_period_end && (
                <span className="text-xs text-gray-500">
                  Vencimento: {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="border-2 hover:border-orange-400 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {formatPrice(plan.price_cents)}
                    <span className="text-xs font-normal text-gray-500">
                      /{plan.billing_cycle === "yearly" ? "ano" : "mês"}
                    </span>
                  </span>
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {(plan.features || []).map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleCheckout(plan.checkout_url)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2"
                >
                  Assinar {plan.name}
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {hasAccess ? (
            <Button onClick={() => navigate("/dashboard")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Ir para o Dashboard
            </Button>
          ) : (
            <Button variant="outline" onClick={() => refetch()} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Já paguei, verificar acesso
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
            className="gap-2 text-gray-600"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
}
