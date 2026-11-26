import { FeatureCard } from "./FeatureCard";
import {
  BarChart3,
  MessageCircle,
  BellRing,
  CalendarClock,
  Smartphone,
  CreditCard,
  Target,
  Car,
  Sparkles,
} from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: MessageCircle,
      title: "WhatsApp com IA (Texto, Áudio e Recibos)",
      description:
        "Envie uma mensagem, grave um áudio ou mande foto da nota fiscal/PIX no WhatsApp. Nossa IA lê, categoriza e lança tudo automaticamente.",
      color: "green",
    },
    {
      icon: CreditCard,
      title: "Parcelamento Automático por Mensagem",
      description:
        "Falou 'Comprei uma TV em 10x de R$ 200'? O sistema já divide e agenda automaticamente todas as parcelas nos próximos meses.",
      color: "blue",
    },
    {
      icon: BellRing,
      title: "Lembretes Diários às 08h no WhatsApp",
      description:
        "Receba avisos automáticos toda manhã sobre contas e dívidas que vencem no dia, além de sinal sonoro em tempo real no painel.",
      color: "yellow",
    },
    {
      icon: CalendarClock,
      title: "Resumo Mensal Todo Dia 1º",
      description:
        "No primeiro dia de cada mês, receba no WhatsApp seu fechamento completo: entradas, saídas, saldo e as 3 categorias onde mais gastou.",
      color: "indigo",
    },
    {
      icon: Smartphone,
      title: "App Instalável no Celular (PWA)",
      description:
        "Instale o Organiza-AI direto na tela inicial do Android, iPhone ou PC com 1 clique, com tema Claro e Escuro automático.",
      color: "orange",
    },
    {
      icon: BarChart3,
      title: "Dashboard em Tempo Real",
      description:
        "Assim que você manda um gasto no WhatsApp, o gráfico e o saldo da tela atualizam na mesma hora sem precisar recarregar a página.",
      color: "blue",
    },
    {
      icon: Target,
      title: "Metas Financeiras e Dívidas",
      description:
        "Defina objetivos de economia, acompanhe o progresso visual e mantenha suas faturas e compromissos sempre sob controle.",
      color: "purple",
    },
    {
      icon: Car,
      title: "Gestão de Veículos e Mercado",
      description:
        "Controle quilometragem, manutenções do carro e organize sua lista de compras e orçamento de supermercado no mesmo lugar.",
      color: "green",
    },
    {
      icon: Sparkles,
      title: "Conta Demonstração em 1 Clique",
      description:
        "Quer experimentar antes de cadastrar? Acesse nossa Conta Demonstração na tela de login com dados prontos e teste tudo na hora.",
      color: "purple",
    },
  ];

  return (
    <section id="recursos" className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">RECURSOS</h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Tudo o que você precisa para controlar suas finanças no piloto automático
          </p>
          <p className="text-slate-500 dark:text-slate-400 mt-4">
            Conheça os diferenciais que tornam o Organiza-AI o assistente financeiro mais completo no WhatsApp e na Web.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              color={feature.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
