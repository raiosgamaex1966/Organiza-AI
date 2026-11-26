import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  MessageCircle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  Mic,
  Camera,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DemoVideoModal } from "@/components/DemoVideoModal";
import { OAIIcon } from "@/components/OAIIcon";

export const Hero = () => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-16 md:py-24 transition-colors">
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-emerald-400/15 dark:bg-emerald-500/10 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Controle financeiro com IA + WhatsApp integrado
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
            Suas finanças no controle,
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent block">
              direto pelo WhatsApp
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            O <strong className="text-slate-900 dark:text-white">Organiza-AI</strong> transforma mensagens de texto, áudios e fotos de recibos em lançamentos financeiros organizados em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link to="/login">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-lg px-8 py-6 rounded-xl shadow-lg shadow-emerald-600/25"
              >
                Começar 7 Dias Grátis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 rounded-xl border-slate-300 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => setIsDemoModalOpen(true)}
            >
              Ver Demonstração
            </Button>
          </div>

          {/* Preview interativo do Organiza-AI (sem imagem externa Mordomo) */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 mb-16 text-left">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg p-1.5">
                  <OAIIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">Organiza-AI</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Painel Financeiro Inteligente</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                WhatsApp Conectado
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Coluna esquerda: cards financeiros */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900">
                    <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 mb-1">
                      <span>Receitas</span>
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">R$ 6.450,00</p>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900">
                    <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 mb-1">
                      <span>Despesas</span>
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">R$ 2.180,50</p>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900">
                    <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 mb-1">
                      <span>Saldo Atual</span>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">R$ 4.269,50</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Últimos lançamentos automáticos
                  </p>
                  {[
                    { title: "Supermercado Central", cat: "Alimentação", val: "- R$ 189,40", positive: false },
                    { title: "Consultoria Design", cat: "Freelance", val: "+ R$ 1.500,00", positive: true },
                    { title: "Posto Avenida", cat: "Transporte", val: "- R$ 150,00", positive: false },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{item.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.cat}</p>
                      </div>
                      <span
                        className={`font-semibold ${
                          item.positive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna direita: simulação WhatsApp IA */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950 p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Assistente WhatsApp
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="bg-emerald-600 text-white rounded-xl rounded-tr-none p-2.5 ml-6 flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>"Gastei 45 reais no almoço"</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl rounded-tl-none p-2.5 mr-4 border border-slate-200 dark:border-slate-700 space-y-1">
                    <p className="font-semibold flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Despesa registrada!
                    </p>
                    <p>Almoço • R$ 45,00 • Alimentação</p>
                  </div>
                  <div className="bg-emerald-600 text-white rounded-xl rounded-tr-none p-2.5 ml-6 flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Foto do comprovante enviada</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  Atualiza seu painel em tempo real
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="bg-emerald-100 dark:bg-emerald-950/60 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">R$</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Receitas Controladas</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Organize todas suas fontes de renda</p>
            </div>

            <div className="text-center">
              <div className="bg-indigo-100 dark:bg-indigo-950/60 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Relatórios Inteligentes</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Análises detalhadas dos seus gastos</p>
            </div>

            <div className="text-center">
              <div className="bg-teal-100 dark:bg-teal-950/60 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">WhatsApp com IA</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Lance por texto, áudio ou foto de recibo</p>
            </div>
          </div>
        </div>
      </div>

      <DemoVideoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </section>
  );
};
