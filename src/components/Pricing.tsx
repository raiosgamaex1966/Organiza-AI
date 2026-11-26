import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const Pricing = () => {
  const plans = [
    {
      name: "Trial 7 Dias",
      price: "R$ 0",
      period: "/7 dias",
      description: "Teste completo sem compromisso",
      features: [
        "Dashboard completo",
        "Controle de receitas e despesas",
        "Categorias personalizadas",
        "Relatórios detalhados",
        "Teste da IA no WhatsApp",
      ],
      popular: false,
    },
    {
      name: "Plano Mensal",
      price: "R$ 29,90",
      period: "/mês",
      description: "Para controle financeiro completo",
      features: [
        "Tudo do período de teste",
        "Lançamentos ilimitados no WhatsApp",
        "Leitura de recibos e áudios por IA",
        "Metas financeiras e dívidas",
        "Controle de veículos e mercado",
        "Suporte prioritário",
      ],
      popular: true,
    },
    {
      name: "Plano Anual",
      price: "R$ 297",
      period: "/ano",
      description: "Economize 2 meses no ano",
      features: [
        "Tudo do Plano Mensal",
        "2 meses grátis",
        "Acesso antecipado a novos recursos",
        "Suporte VIP",
      ],
      popular: false,
    },
  ];

  return (
    <section id="precos" className="py-20 bg-white dark:bg-slate-900 transition-colors">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">PLANOS E PREÇOS</h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Escolha o plano ideal para suas necessidades
          </p>
          <p className="text-slate-500 dark:text-slate-400 mt-4">
            Comece com 7 dias grátis e faça upgrade quando quiser
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative bg-white dark:bg-slate-950 ${
                plan.popular
                  ? "border-emerald-500 border-2 md:scale-105 shadow-xl shadow-emerald-500/10"
                  : "border-slate-200 dark:border-slate-800"
              } hover:shadow-xl transition-all`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow">
                    MAIS POPULAR
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</CardTitle>
                <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                  {plan.price}
                  <span className="text-lg text-slate-500 dark:text-slate-400 font-normal">{plan.period}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3.5 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/login">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                        : "bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700"
                    } text-white`}
                    size="lg"
                  >
                    {plan.name.includes("Trial") ? "Começar 7 Dias Grátis" : "Assinar Agora"}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Cancele a qualquer momento, sem fidelidade ou taxas ocultas.
          </p>
        </div>
      </div>
    </section>
  );
};
