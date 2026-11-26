import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone, BarChart3, Target } from "lucide-react";
import { Link } from "react-router-dom";

export const HowItWorks = () => {
  const steps = [
    {
      icon: Smartphone,
      title: "1. Cadastre-se",
      description: "Crie sua conta em menos de 2 minutos e ganhe 7 dias grátis para testar tudo.",
      color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400",
    },
    {
      icon: BarChart3,
      title: "2. Conecte seu WhatsApp",
      description: "Informe seu número ou conecte via QR Code e envie textos, áudios ou fotos de recibos.",
      color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400",
    },
    {
      icon: Target,
      title: "3. Acompanhe em Tempo Real",
      description: "Veja seu saldo, metas e relatórios atualizados automaticamente na tela.",
      color: "bg-teal-100 text-teal-600 dark:bg-teal-950/70 dark:text-teal-400",
    },
  ];

  return (
    <section id="como-funciona" className="py-20 bg-white dark:bg-slate-900 transition-colors">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">COMO FUNCIONA</h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Simples de usar, poderoso nos resultados
          </p>
          <p className="text-slate-500 dark:text-slate-400 mt-4">
            Conheça o funcionamento da plataforma e veja como é simples gerenciar suas finanças.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${step.color}`}>
                <step.icon className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{step.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-10 sm:p-12 text-center text-white shadow-xl shadow-emerald-600/20">
          <h3 className="text-3xl font-bold mb-4">Pronto para começar?</h3>
          <p className="text-lg sm:text-xl mb-8 opacity-90">
            Junte-se a milhares de usuários que já transformaram suas finanças com o Organiza-AI
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-white text-emerald-700 hover:bg-slate-100 text-lg px-8 py-6 rounded-xl font-semibold">
              Começar Agora Grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
