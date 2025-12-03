import { useState, useEffect } from "react";
import { Plus, Bell, Calendar, Trash2, Edit2, Check, X } from "lucide-react";
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

interface Lembrete {
    id: string;
    titulo: string;
    descricao: string;
    data: string;
    hora: string;
    prioridade: "baixa" | "media" | "alta";
    concluido: boolean;
}

const Lembretes = () => {
    const [lembretes, setLembretes] = useState<Lembrete[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        titulo: "",
        descricao: "",
        data: "",
        hora: "",
        prioridade: "media" as "baixa" | "media" | "alta",
    });
    const { toast } = useToast();

    useEffect(() => {
        const savedLembretes = localStorage.getItem("lembretes");
        if (savedLembretes) {
            setLembretes(JSON.parse(savedLembretes));
        }
    }, []);

    const saveLembretes = (newLembretes: Lembrete[]) => {
        localStorage.setItem("lembretes", JSON.stringify(newLembretes));
        setLembretes(newLembretes);
    };

    const handleSubmit = (e: React.FormEvent) => {
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
            const updatedLembretes = lembretes.map((lembrete) =>
                lembrete.id === editingId
                    ? { ...lembrete, ...formData }
                    : lembrete
            );
            saveLembretes(updatedLembretes);
            toast({
                title: "Sucesso",
                description: "Lembrete atualizado com sucesso!",
            });
        } else {
            const newLembrete: Lembrete = {
                id: Date.now().toString(),
                ...formData,
                concluido: false,
            };
            saveLembretes([...lembretes, newLembrete]);
            toast({
                title: "Sucesso",
                description: "Lembrete criado com sucesso!",
            });
        }

        resetForm();
        setIsDialogOpen(false);
    };

    const resetForm = () => {
        setFormData({
            titulo: "",
            descricao: "",
            data: "",
            hora: "",
            prioridade: "media",
        });
        setEditingId(null);
    };

    const handleEdit = (lembrete: Lembrete) => {
        setFormData({
            titulo: lembrete.titulo,
            descricao: lembrete.descricao,
            data: lembrete.data,
            hora: lembrete.hora,
            prioridade: lembrete.prioridade,
        });
        setEditingId(lembrete.id);
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        const updatedLembretes = lembretes.filter((lembrete) => lembrete.id !== id);
        saveLembretes(updatedLembretes);
        toast({
            title: "Sucesso",
            description: "Lembrete excluído com sucesso!",
        });
    };

    const toggleConcluido = (id: string) => {
        const updatedLembretes = lembretes.map((lembrete) =>
            lembrete.id === id
                ? { ...lembrete, concluido: !lembrete.concluido }
                : lembrete
        );
        saveLembretes(updatedLembretes);
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

    return (
        <Layout>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Bell className="h-8 w-8 text-primary" />
                            Lembretes
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Gerencie seus lembretes e nunca esqueça nada importante
                        </p>
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

                {lembretes.length === 0 ? (
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
                                                onClick={() => toggleConcluido(lembrete.id)}
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
                                                        <Calendar className="h-4 w-4" />
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
                )}
            </div>
        </Layout>
    );
};

export default Lembretes;
