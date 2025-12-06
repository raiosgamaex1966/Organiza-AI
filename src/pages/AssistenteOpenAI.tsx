import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    MessageSquare,
    Plus,
    Send,
    Settings,
    Trash2,
    Edit,
    Bot,
    User,
    Check,
    X,
    History,
    Loader2,
    Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAssistentesOpenAI, type Assistente, type Thread, type Mensagem, type QuizData } from "@/hooks/useAssistentesOpenAI";

const PROMPT_TEMPLATE_PADRAO = `Você é um assistente educacional. Quando o usuário pedir um quiz ou questionário, responda SEMPRE no seguinte formato JSON:

{
  "tipo": "quiz",
  "pergunta": "Texto da pergunta",
  "alternativas": [
    {"letra": "A", "texto": "Alternativa A", "correta": false},
    {"letra": "B", "texto": "Alternativa B", "correta": true},
    {"letra": "C", "texto": "Alternativa C", "correta": false},
    {"letra": "D", "texto": "Alternativa D", "correta": false}
  ],
  "explicacao": "Explicação da resposta correta"
}

Para respostas normais, responda em texto livre.`;

// Componente para renderizar quiz
const QuizComponent = ({ quiz }: { quiz: QuizData }) => {
    const [respostaSelecionada, setRespostaSelecionada] = useState<string | null>(null);
    const [mostrarResultado, setMostrarResultado] = useState(false);

    const handleResposta = (letra: string) => {
        setRespostaSelecionada(letra);
        setMostrarResultado(true);
    };

    const alternativaCorreta = quiz.alternativas.find(a => a.correta);
    const acertou = respostaSelecionada === alternativaCorreta?.letra;

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-purple-700 font-semibold">
                <Bot className="w-5 h-5" />
                <span>Quiz</span>
            </div>

            <p className="text-lg font-medium text-gray-800">{quiz.pergunta}</p>

            <div className="space-y-2">
                {quiz.alternativas.map((alt) => {
                    let buttonClass = "w-full text-left p-3 rounded-lg border transition-all ";

                    if (!mostrarResultado) {
                        buttonClass += "border-gray-200 hover:border-purple-400 hover:bg-purple-50";
                    } else if (alt.correta) {
                        buttonClass += "border-green-500 bg-green-50 text-green-800";
                    } else if (respostaSelecionada === alt.letra && !alt.correta) {
                        buttonClass += "border-red-500 bg-red-50 text-red-800";
                    } else {
                        buttonClass += "border-gray-200 opacity-50";
                    }

                    return (
                        <button
                            key={alt.letra}
                            onClick={() => !mostrarResultado && handleResposta(alt.letra)}
                            disabled={mostrarResultado}
                            className={buttonClass}
                        >
                            <span className="font-semibold mr-2">{alt.letra})</span>
                            {alt.texto}
                            {mostrarResultado && alt.correta && (
                                <Check className="inline-block ml-2 w-4 h-4 text-green-600" />
                            )}
                            {mostrarResultado && respostaSelecionada === alt.letra && !alt.correta && (
                                <X className="inline-block ml-2 w-4 h-4 text-red-600" />
                            )}
                        </button>
                    );
                })}
            </div>

            {mostrarResultado && (
                <div className={`p-3 rounded-lg ${acertou ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <p className="font-semibold mb-1">
                        {acertou ? '✅ Parabéns! Resposta correta!' : '❌ Resposta incorreta'}
                    </p>
                    {quiz.explicacao && (
                        <p className="text-sm">{quiz.explicacao}</p>
                    )}
                </div>
            )}
        </div>
    );
};

// Componente para mensagem
const MensagemComponent = ({ mensagem }: { mensagem: Mensagem }) => {
    const isUser = mensagem.role === 'user';

    if (mensagem.quiz_data) {
        return <QuizComponent quiz={mensagem.quiz_data} />;
    }

    return (
        <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-purple-600" />
                </div>
            )}
            <div className={`max-w-[80%] p-3 rounded-lg ${isUser
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                <p className="whitespace-pre-wrap">{mensagem.content}</p>
            </div>
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                </div>
            )}
        </div>
    );
};

const AssistenteOpenAI = () => {
    const { toast } = useToast();
    const {
        assistentes,
        threads,
        mensagens,
        isLoading,
        isSending,
        fetchThreads,
        fetchMensagens,
        criarAssistente,
        atualizarAssistente,
        excluirAssistente,
        criarThread,
        excluirThread,
        enviarMensagem
    } = useAssistentesOpenAI();

    // Estados
    const [activeTab, setActiveTab] = useState("assistentes");
    const [assistenteSelecionado, setAssistenteSelecionado] = useState<Assistente | null>(null);
    const [threadSelecionada, setThreadSelecionada] = useState<Thread | null>(null);
    const [inputMensagem, setInputMensagem] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editandoAssistente, setEditandoAssistente] = useState<Assistente | null>(null);

    // Form states
    const [formNome, setFormNome] = useState("");
    const [formAssistantId, setFormAssistantId] = useState("");
    const [formApiKey, setFormApiKey] = useState("");
    const [formDescricao, setFormDescricao] = useState("");
    const [formPromptTemplate, setFormPromptTemplate] = useState(PROMPT_TEMPLATE_PADRAO);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll para última mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [mensagens]);

    // Carregar threads quando selecionar assistente
    useEffect(() => {
        if (assistenteSelecionado) {
            fetchThreads(assistenteSelecionado.id);
        }
    }, [assistenteSelecionado, fetchThreads]);

    // Carregar mensagens quando selecionar thread
    useEffect(() => {
        if (threadSelecionada) {
            fetchMensagens(threadSelecionada.id);
        }
    }, [threadSelecionada, fetchMensagens]);

    const handleSalvarAssistente = async () => {
        if (!formNome.trim() || !formAssistantId.trim() || !formApiKey.trim()) {
            toast({
                title: "Campos obrigatórios",
                description: "Preencha nome, Assistant ID e API Key.",
                variant: "destructive",
            });
            return;
        }

        if (editandoAssistente) {
            await atualizarAssistente(editandoAssistente.id, {
                nome: formNome,
                assistant_id: formAssistantId,
                api_key: formApiKey,
                descricao: formDescricao,
                prompt_template: formPromptTemplate
            });
        } else {
            await criarAssistente({
                nome: formNome,
                assistant_id: formAssistantId,
                api_key: formApiKey,
                descricao: formDescricao,
                prompt_template: formPromptTemplate
            });
        }

        limparForm();
        setDialogOpen(false);
        setEditandoAssistente(null);
    };

    const limparForm = () => {
        setFormNome("");
        setFormAssistantId("");
        setFormApiKey("");
        setFormDescricao("");
        setFormPromptTemplate(PROMPT_TEMPLATE_PADRAO);
    };

    const handleEditarAssistente = (assistente: Assistente) => {
        setEditandoAssistente(assistente);
        setFormNome(assistente.nome);
        setFormAssistantId(assistente.assistant_id);
        setFormApiKey(assistente.api_key);
        setFormDescricao(assistente.descricao || "");
        setFormPromptTemplate(assistente.prompt_template || PROMPT_TEMPLATE_PADRAO);
        setDialogOpen(true);
    };

    const handleNovaConversa = async () => {
        if (!assistenteSelecionado) {
            toast({
                title: "Selecione um assistente",
                description: "Escolha um assistente antes de criar uma conversa.",
                variant: "destructive",
            });
            return;
        }

        const novaThread = await criarThread(assistenteSelecionado);
        if (novaThread) {
            setThreadSelecionada(novaThread);
            setActiveTab("chat");
        }
    };

    const handleEnviarMensagem = async () => {
        if (!inputMensagem.trim() || !assistenteSelecionado || !threadSelecionada) return;

        const mensagem = inputMensagem;
        setInputMensagem("");

        await enviarMensagem(assistenteSelecionado, threadSelecionada, mensagem);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleEnviarMensagem();
        }
    };

    const selecionarAssistenteEIrParaChat = (assistente: Assistente) => {
        setAssistenteSelecionado(assistente);
        setActiveTab("chat");
    };

    // Função para gerar PDF da conversa
    const gerarPDF = () => {
        if (mensagens.length === 0) {
            toast({
                title: "Sem mensagens",
                description: "Não há mensagens para exportar.",
                variant: "destructive",
            });
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;
        let yPosition = margin;

        // Título
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Conversa com Assistente OpenAI", margin, yPosition);
        yPosition += 10;

        // Subtítulo com nome do assistente e data
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Assistente: ${assistenteSelecionado?.nome || "N/A"}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Data: ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`, margin, yPosition);
        yPosition += 15;

        // Linha separadora
        doc.setDrawColor(200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;

        // Resetar cor do texto
        doc.setTextColor(0);

        // Contador de questões quiz
        let quizCount = 0;

        // Percorrer mensagens
        mensagens.forEach((msg) => {
            // Verificar se precisa de nova página
            if (yPosition > pageHeight - 40) {
                doc.addPage();
                yPosition = margin;
            }

            if (msg.quiz_data) {
                // Renderizar Quiz
                quizCount++;
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(102, 51, 153); // Roxo
                doc.text(`Questão ${quizCount}`, margin, yPosition);
                yPosition += 8;

                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0);

                // Quebrar texto da pergunta
                const perguntaLines = doc.splitTextToSize(msg.quiz_data.pergunta, maxWidth);
                perguntaLines.forEach((line: string) => {
                    if (yPosition > pageHeight - 20) {
                        doc.addPage();
                        yPosition = margin;
                    }
                    doc.text(line, margin, yPosition);
                    yPosition += 6;
                });
                yPosition += 4;

                // Alternativas
                msg.quiz_data.alternativas.forEach((alt) => {
                    if (yPosition > pageHeight - 20) {
                        doc.addPage();
                        yPosition = margin;
                    }

                    const prefix = alt.correta ? "✓ " : "   ";
                    const altText = `${prefix}${alt.letra}) ${alt.texto}`;
                    const altLines = doc.splitTextToSize(altText, maxWidth - 10);

                    if (alt.correta) {
                        doc.setTextColor(0, 128, 0); // Verde para resposta correta
                    } else {
                        doc.setTextColor(60);
                    }

                    altLines.forEach((line: string) => {
                        doc.text(line, margin + 5, yPosition);
                        yPosition += 6;
                    });
                });

                doc.setTextColor(0);

                // Explicação
                if (msg.quiz_data.explicacao) {
                    yPosition += 4;
                    doc.setFontSize(10);
                    doc.setTextColor(80);
                    const expLines = doc.splitTextToSize(`Explicação: ${msg.quiz_data.explicacao}`, maxWidth);
                    expLines.forEach((line: string) => {
                        if (yPosition > pageHeight - 20) {
                            doc.addPage();
                            yPosition = margin;
                        }
                        doc.text(line, margin, yPosition);
                        yPosition += 5;
                    });
                    doc.setTextColor(0);
                    doc.setFontSize(12);
                }

                yPosition += 10;
            } else if (msg.content) {
                // Mensagem normal
                const role = msg.role === "user" ? "Você" : "Assistente";
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(msg.role === "user" ? 0 : 102, msg.role === "user" ? 0 : 51, msg.role === "user" ? 139 : 153);
                doc.text(`${role}:`, margin, yPosition);
                yPosition += 6;

                doc.setFont("helvetica", "normal");
                doc.setTextColor(0);
                const contentLines = doc.splitTextToSize(msg.content, maxWidth);
                contentLines.forEach((line: string) => {
                    if (yPosition > pageHeight - 20) {
                        doc.addPage();
                        yPosition = margin;
                    }
                    doc.text(line, margin, yPosition);
                    yPosition += 6;
                });
                yPosition += 8;
            }
        });

        // Salvar o PDF
        const fileName = `conversa_${assistenteSelecionado?.nome?.replace(/\s+/g, "_") || "assistente"}_${new Date().toISOString().split("T")[0]}.pdf`;
        doc.save(fileName);

        toast({
            title: "PDF gerado!",
            description: `Arquivo ${fileName} baixado com sucesso.`,
        });
    };

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-purple-100 rounded-full p-3">
                        <MessageSquare className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Assistente OpenAI</h1>
                        <p className="text-gray-600">Converse com assistentes da OpenAI e responda quizzes</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="assistentes">
                            <Settings className="w-4 h-4 mr-2" />
                            Assistentes
                        </TabsTrigger>
                        <TabsTrigger value="chat">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Chat
                        </TabsTrigger>
                        <TabsTrigger value="historico">
                            <History className="w-4 h-4 mr-2" />
                            Histórico
                        </TabsTrigger>
                    </TabsList>

                    {/* Aba Assistentes */}
                    <TabsContent value="assistentes" className="space-y-6">
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Meus Assistentes</h2>
                                <Dialog open={dialogOpen} onOpenChange={(open) => {
                                    setDialogOpen(open);
                                    if (!open) {
                                        limparForm();
                                        setEditandoAssistente(null);
                                    }
                                }}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Novo Assistente
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>
                                                {editandoAssistente ? 'Editar Assistente' : 'Novo Assistente'}
                                            </DialogTitle>
                                            <DialogDescription>
                                                Configure seu assistente OpenAI para começar a conversar.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div>
                                                <Label htmlFor="nome">Nome do Assistente *</Label>
                                                <Input
                                                    id="nome"
                                                    placeholder="Ex: Tutor de Matemática"
                                                    value={formNome}
                                                    onChange={(e) => setFormNome(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="assistant-id">Assistant ID *</Label>
                                                <Input
                                                    id="assistant-id"
                                                    placeholder="asst_..."
                                                    value={formAssistantId}
                                                    onChange={(e) => setFormAssistantId(e.target.value)}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Encontre na plataforma OpenAI em Assistants
                                                </p>
                                            </div>
                                            <div>
                                                <Label htmlFor="api-key">API Key OpenAI *</Label>
                                                <Input
                                                    id="api-key"
                                                    type="password"
                                                    placeholder="sk-..."
                                                    value={formApiKey}
                                                    onChange={(e) => setFormApiKey(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="descricao">Descrição</Label>
                                                <Input
                                                    id="descricao"
                                                    placeholder="Breve descrição do assistente"
                                                    value={formDescricao}
                                                    onChange={(e) => setFormDescricao(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="prompt-template">Instruções Adicionais</Label>
                                                <Textarea
                                                    id="prompt-template"
                                                    placeholder="Instruções extras para o assistente..."
                                                    value={formPromptTemplate}
                                                    onChange={(e) => setFormPromptTemplate(e.target.value)}
                                                    rows={4}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Deixe o template padrão para suporte a quiz
                                                </p>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                                Cancelar
                                            </Button>
                                            <Button onClick={handleSalvarAssistente}>
                                                {editandoAssistente ? 'Salvar' : 'Criar'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {isLoading ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
                                </div>
                            ) : assistentes.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Nenhum assistente cadastrado.</p>
                                    <p className="text-sm">Clique em "Novo Assistente" para começar.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {assistentes.map((assistente) => (
                                        <Card key={assistente.id} className="p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                                        <Bot className="w-5 h-5 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{assistente.nome}</h3>
                                                        <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                                            {assistente.assistant_id}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleEditarAssistente(assistente)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="icon" variant="ghost">
                                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Excluir assistente?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Isso excluirá o assistente e todas as conversas associadas.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => excluirAssistente(assistente.id)}>
                                                                    Excluir
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                            {assistente.descricao && (
                                                <p className="text-sm text-gray-600 mb-3">{assistente.descricao}</p>
                                            )}
                                            <Button
                                                className="w-full"
                                                onClick={() => selecionarAssistenteEIrParaChat(assistente)}
                                            >
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Conversar
                                            </Button>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </TabsContent>

                    {/* Aba Chat */}
                    <TabsContent value="chat" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Sidebar conversas */}
                            <Card className="p-4 lg:col-span-1">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">Conversas</h3>
                                    <Button size="sm" onClick={handleNovaConversa} disabled={!assistenteSelecionado}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                {assistenteSelecionado ? (
                                    <div className="mb-3 p-2 bg-purple-50 rounded-lg">
                                        <p className="text-xs text-gray-500">Assistente:</p>
                                        <p className="font-medium text-purple-700 truncate">{assistenteSelecionado.nome}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 mb-3">Selecione um assistente</p>
                                )}

                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-2">
                                        {threads.map((thread) => (
                                            <div
                                                key={thread.id}
                                                className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${threadSelecionada?.id === thread.id
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'hover:bg-gray-100'
                                                    }`}
                                                onClick={() => setThreadSelecionada(thread)}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{thread.titulo || 'Nova conversa'}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(thread.created_at).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta ação não pode ser desfeita.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => {
                                                                excluirThread(thread.id, assistenteSelecionado!.id);
                                                                if (threadSelecionada?.id === thread.id) {
                                                                    setThreadSelecionada(null);
                                                                }
                                                            }}>
                                                                Excluir
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        ))}
                                        {threads.length === 0 && assistenteSelecionado && (
                                            <p className="text-sm text-gray-500 text-center py-4">
                                                Clique em + para nova conversa
                                            </p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </Card>

                            {/* Área de chat */}
                            <Card className="p-4 lg:col-span-3 flex flex-col h-[600px]">
                                {threadSelecionada ? (
                                    <>
                                        <div className="border-b pb-3 mb-4 flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900">
                                                {threadSelecionada.titulo || 'Nova conversa'}
                                            </h3>
                                            {mensagens.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={gerarPDF}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Baixar PDF
                                                </Button>
                                            )}
                                        </div>

                                        <ScrollArea className="flex-1 pr-4">
                                            <div className="space-y-4">
                                                {mensagens.map((msg) => (
                                                    <MensagemComponent key={msg.id} mensagem={msg} />
                                                ))}
                                                {isSending && (
                                                    <div className="flex justify-start">
                                                        <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span className="text-sm text-gray-600">Pensando...</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div ref={messagesEndRef} />
                                            </div>
                                        </ScrollArea>

                                        <div className="border-t pt-4 mt-4">
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Digite sua mensagem..."
                                                    value={inputMensagem}
                                                    onChange={(e) => setInputMensagem(e.target.value)}
                                                    onKeyDown={handleKeyPress}
                                                    disabled={isSending}
                                                />
                                                <Button
                                                    onClick={handleEnviarMensagem}
                                                    disabled={!inputMensagem.trim() || isSending}
                                                >
                                                    {isSending ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Send className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-500">
                                        <div className="text-center">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p>Selecione uma conversa ou crie uma nova</p>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Aba Histórico */}
                    <TabsContent value="historico" className="space-y-6">
                        <Card className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Histórico de Conversas</h2>

                            {assistentes.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Nenhum assistente cadastrado ainda.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {assistentes.map((assistente) => (
                                        <div key={assistente.id}>
                                            <div
                                                className="flex items-center gap-2 mb-3 cursor-pointer"
                                                onClick={() => {
                                                    setAssistenteSelecionado(assistente);
                                                    fetchThreads(assistente.id);
                                                }}
                                            >
                                                <Bot className="w-5 h-5 text-purple-600" />
                                                <h3 className="font-semibold text-gray-800">{assistente.nome}</h3>
                                            </div>

                                            {assistenteSelecionado?.id === assistente.id && threads.length > 0 && (
                                                <div className="ml-7 space-y-2">
                                                    {threads.map((thread) => (
                                                        <div
                                                            key={thread.id}
                                                            className="p-3 bg-gray-50 rounded-lg flex items-center justify-between hover:bg-gray-100 cursor-pointer"
                                                            onClick={() => {
                                                                setThreadSelecionada(thread);
                                                                setActiveTab("chat");
                                                            }}
                                                        >
                                                            <div>
                                                                <p className="font-medium">{thread.titulo || 'Nova conversa'}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {new Date(thread.created_at).toLocaleDateString('pt-BR', {
                                                                        day: '2-digit',
                                                                        month: 'long',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </p>
                                                            </div>
                                                            <MessageSquare className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {assistenteSelecionado?.id === assistente.id && threads.length === 0 && (
                                                <p className="ml-7 text-sm text-gray-500">Nenhuma conversa ainda</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
};

export default AssistenteOpenAI;
