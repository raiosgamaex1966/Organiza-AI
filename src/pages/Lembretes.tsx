import { useState } from "react";
import { Plus, Bell, Calendar as CalendarIcon, Trash2, Edit2, Check, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { useLembretes, Lembrete } from "@/hooks/useLembretes";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";

const Lembretes = () => {
    const { lembretes, loading, createLembrete, updateLembrete, deleteLembrete } = useLembretes();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const [formData, setFormData] = useState({
        titulo: "",
        descricao: "",
        data: "",
        hora: "",
        prioridade: "media" as "baixa" | "media" | "alta",
    });
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.titulo || !formData.data) {
            toast({
                title: "Erro",
                description: "Preencha todos os campos obrigatórios",
                variant: "destructive",
            });
            return;
        }

        if (editingId) {
            await updateLembrete(editingId, formData);
        } else {
            await createLembrete({
                ...formData,
                concluido: false,
            });
        }

        resetForm();
        setIsDialogOpen(false);
    };

    const resetForm = () => {
        setFormData({
            titulo: "",
            descricao: "",
            data: selectedDate ? selectedDate.toISOString().split('T')[0] : "",
            hora: "",
            prioridade: "media",
        });
        setEditingId(null);
    };

    const handleEdit = (lembrete: Lembrete) => {
        setFormData({
            titulo: lembrete.titulo,
            descricao: lembrete.descricao || "",
            data: lembrete.data,
            hora: lembrete.hora || "",
            prioridade: lembrete.prioridade,
        });
        setEditingId(lembrete.id);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este lembrete?")) {
            await deleteLembrete(id);
        }
    };

    const toggleConcluido = async (lembrete: Lembrete) => {
        await updateLembrete(lembrete.id, { concluido: !lembrete.concluido });
    };

    const getPrioridadeColor = (prioridade: string) => {
        switch (prioridade) {
            case "alta":
                return "text-red-500 bg-red-50 border-red-200";
            case "media":
                return "text-yellow-500 bg-yellow-50 border-yellow-200";
            case "baixa":
                return "text-green-500 bg-green-50 border-green-200";
            default:
                return "text-gray-500 bg-gray-50 border-gray-200";
        }
    };

    const lembretesOrdenados = [...lembretes].sort((a, b) => {
        const dateA = new Date(`${a.data}T${a.hora || "00:00"}`);
        const dateB = new Date(`${b.data}T${b.hora || "00:00"}`);
        return dateA.getTime() - dateB.getTime();
    });

    const lembretesDoDia = selectedDate
        ? lembretesOrdenados.filter(l => l.data === selectedDate.toISOString().split('T')[0])
        : [];

    return (
        <Layout>
            <div className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Bell className="h-8 w-8 text-primary" />
                            Lembretes
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Gerencie seus lembretes e nunca esqueça nada importante
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <div className="bg-white p-1 rounded-lg border border-gray-200 flex">
                            <Button
                                variant={viewMode === "list" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("list")}
                                className="gap-2"
                            >
                                <List className="h-4 w-4" />
                                Lista
                            </Button>
                            <Button
                                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("calendar")}
                                className="gap-2"
                            >
                                <CalendarIcon className="h-4 w-4" />
                                Calendário
                            </Button>
                        </div>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={resetForm}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Novo Lembrete
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingId ? "Editar Lembrete" : "Novo Lembrete"}
                                    </DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <Label htmlFor="titulo">Título *</Label>
                                        <Input
                                            id="titulo"
                                            value={formData.titulo}
                                            onChange={(e) =>
                                                setFormData({ ...formData, titulo: e.target.value })
                                            }
                                            placeholder="Ex: Reunião com cliente"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="descricao">Descrição</Label>
                                        <Textarea
                                            id="descricao"
                                            value={formData.descricao}
                                            onChange={(e) =>
                                                setFormData({ ...formData, descricao: e.target.value })
                                            }
                                            placeholder="Detalhes do lembrete..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="data">Data *</Label>
                                            <Input
                                                id="data"
                                                type="date"
                                                value={formData.data}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, data: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="hora">Hora</Label>
                                            <Input
                                                id="hora"
                                                type="time"
                                                value={formData.hora}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, hora: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="prioridade">Prioridade</Label>
                                        <Select
                                            value={formData.prioridade}
                                            onValueChange={(value: "baixa" | "media" | "alta") =>
                                                setFormData({ ...formData, prioridade: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="baixa">Baixa</SelectItem>
                                                <SelectItem value="media">Média</SelectItem>
                                                <SelectItem value="alta">Alta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                resetForm();
                                                setIsDialogOpen(false);
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit">
                                            {editingId ? "Atualizar" : "Criar"}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : viewMode === "list" ? (
                    lembretes.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <Bell className="h-16 w-16 text-gray-300 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Nenhum lembrete cadastrado
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Crie seu primeiro lembrete para começar
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {lembretesOrdenados.map((lembrete) => (
                                <Card
                                    key={lembrete.id}
                                    className={`transition-all ${lembrete.concluido ? "opacity-60" : ""
                                        }`}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4 flex-1">
                                                <button
                                                    onClick={() => toggleConcluido(lembrete)}
                                                    className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${lembrete.concluido
                                                            ? "bg-primary border-primary"
                                                            : "border-gray-300 hover:border-primary"
                                                        }`}
                                                >
                                                    {lembrete.concluido && (
                                                        <Check className="h-3 w-3 text-white" />
                                                    )}
                                                </button>
                                                <div className="flex-1">
                                                    <h3
                                                        className={`text-lg font-semibold ${lembrete.concluido
                                                                ? "line-through text-gray-500"
                                                                : "text-gray-900"
                                                            }`}
                                                    >
                                                        {lembrete.titulo}
                                                    </h3>
                                                    {lembrete.descricao && (
                                                        <p className="text-gray-600 mt-1">
                                                            {lembrete.descricao}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-4 mt-3">
                                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                                            <CalendarIcon className="h-4 w-4" />
                                                            {new Date(lembrete.data).toLocaleDateString(
                                                                "pt-BR"
                                                            )}
                                                            {lembrete.hora && ` às ${lembrete.hora}`}
                                                        </div>
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getPrioridadeColor(
                                                                lembrete.prioridade
                                                            )}`}
                                                        >
                                                            {lembrete.prioridade.charAt(0).toUpperCase() +
                                                                lembrete.prioridade.slice(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(lembrete)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(lembrete.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="grid md:grid-cols-[350px_1fr] gap-6">
                        <Card>
                            <CardContent className="p-4">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    locale={ptBR}
                                    className="rounded-md border"
                                    modifiers={{
                                        hasReminder: (date) =>
                                            lembretes.some(l => l.data === date.toISOString().split('T')[0])
                                    }}
                                    modifiersStyles={{
                                        hasReminder: {
                                            fontWeight: 'bold',
                                            textDecoration: 'underline',
                                            color: 'var(--primary)'
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">
                                Lembretes para {selectedDate?.toLocaleDateString('pt-BR')}
                            </h2>

                            {lembretesDoDia.length === 0 ? (
                                <Card>
                                    <CardContent className="p-8 text-center text-gray-500">
                                        Nenhum lembrete para este dia
                                    </CardContent>
                                </Card>
                            ) : (
                                lembretesDoDia.map((lembrete) => (
                                    <Card
                                        key={lembrete.id}
                                        className={`transition-all ${lembrete.concluido ? "opacity-60" : ""
                                            }`}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <button
                                                        onClick={() => toggleConcluido(lembrete)}
                                                        className={`mt-1 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${lembrete.concluido
                                                                ? "bg-primary border-primary"
                                                                : "border-gray-300 hover:border-primary"
                                                            }`}
                                                    >
                                                        {lembrete.concluido && (
                                                            <Check className="h-3 w-3 text-white" />
                                                        )}
                                                    </button>
                                                    <div>
                                                        <h3 className={`font-medium ${lembrete.concluido ? "line-through text-gray-500" : ""}`}>
                                                            {lembrete.titulo}
                                                        </h3>
                                                        {lembrete.hora && (
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                {lembrete.hora}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEdit(lembrete)}
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleDelete(lembrete.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Lembretes;
