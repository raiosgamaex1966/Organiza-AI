import { useEffect, useState } from "react";
import { Bell, Calendar, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLembretes, Lembrete } from "@/hooks/useLembretes";

export const LembretesWidget = () => {
    const { lembretes, loading } = useLembretes();
    const [upcomingLembretes, setUpcomingLembretes] = useState<Lembrete[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (lembretes.length > 0) {
            // Filtrar apenas lembretes não concluídos e ordenar por data
            const lembretesAtivos = lembretes
                .filter((lembrete) => !lembrete.concluido)
                .sort((a, b) => {
                    const dateA = new Date(`${a.data}T${a.hora || "00:00"}`);
                    const dateB = new Date(`${b.data}T${b.hora || "00:00"}`);
                    return dateA.getTime() - dateB.getTime();
                });

            setUpcomingLembretes(lembretesAtivos.slice(0, 3)); // Mostrar apenas os 3 próximos
        } else {
            setUpcomingLembretes([]);
        }
    }, [lembretes]);

    const getPrioridadeColor = (prioridade: string) => {
        switch (prioridade) {
            case "alta":
                return "bg-red-100 text-red-800 border-red-200";
            case "media":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "baixa":
                return "bg-green-100 text-green-800 border-green-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const formatarData = (dataString: string) => {
        const data = new Date(dataString);
        return data.toLocaleDateString("pt-BR");
    };

    const isProximo = (dataString: string, horaString: string | null) => {
        const agora = new Date();
        const dataLembrete = new Date(`${dataString}T${horaString || "00:00"}`);
        const diferencaHoras = (dataLembrete.getTime() - agora.getTime()) / (1000 * 60 * 60);
        return diferencaHoras <= 24 && diferencaHoras > 0;
    };

    if (loading) {
        return (
            <Card className="p-4 md:p-6 mb-6 md:mb-8">
                <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
            </Card>
        );
    }

    if (upcomingLembretes.length === 0) {
        return null; // Não mostrar o widget se não houver lembretes
    }

    return (
        <Card className="p-4 md:p-6 mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-500" />
                    Próximos Lembretes
                </h2>
                <Button
                    variant="ghost"
                    className="text-orange-600 hover:text-orange-700 text-sm"
                    onClick={() => navigate("/lembretes")}
                >
                    Ver todos
                </Button>
            </div>
            <div className="space-y-3">
                {upcomingLembretes.map((lembrete) => (
                    <div
                        key={lembrete.id}
                        className="flex items-start justify-between p-3 md:p-4 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate("/lembretes")}
                    >
                        <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-orange-100">
                                <Bell className="w-4 h-4 text-orange-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-sm md:text-base font-semibold text-gray-900">
                                        {lembrete.titulo}
                                    </h3>
                                    {isProximo(lembrete.data, lembrete.hora) && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 whitespace-nowrap">
                                            Em breve
                                        </span>
                                    )}
                                </div>
                                {lembrete.descricao && (
                                    <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-1">
                                        {lembrete.descricao}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600">
                                        <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                                        {formatarData(lembrete.data)}
                                        {lembrete.hora && ` às ${lembrete.hora}`}
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPrioridadeColor(
                                            lembrete.prioridade
                                        )}`}
                                    >
                                        {lembrete.prioridade.charAt(0).toUpperCase() +
                                            lembrete.prioridade.slice(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                ))}
            </div>
        </Card>
    );
};
