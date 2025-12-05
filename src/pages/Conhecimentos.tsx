import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Upload,
    FileText,
    Settings,
    Search,
    BookOpen,
    Trash2,
    Download,
    Key,
    Brain,
    Loader2,
} from "lucide-react";
import { useState, useRef } from "react";
import { useConhecimentos } from "@/hooks/useConhecimentos";
import { useLLMConfig } from "@/hooks/useLLMConfig";
import { usePesquisaConhecimentos } from "@/hooks/usePesquisaConhecimentos";

const Conhecimentos = () => {
    const { documentos, loading: loadingDocs, uploadDocumento, deletarDocumento, baixarDocumento } = useConhecimentos();
    const { config, loading: loadingConfig, salvarConfig, listarModelos } = useLLMConfig();
    const { consultas, loading: loadingPesquisa, pesquisar } = usePesquisaConhecimentos();

    const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic' | 'google'>(config?.provider || 'openai');
    const [apiKey, setApiKey] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>(config?.selected_model || "");
    const [pergunta, setPergunta] = useState<string>("");
    const [resposta, setResposta] = useState<string>("");
    const [documentosSelecionados, setDocumentosSelecionados] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (const file of Array.from(files)) {
            try {
                await uploadDocumento(file);
            } catch (error) {
                console.error('Erro no upload:', error);
            }
        }

        // Limpar input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSaveConfig = async () => {
        if (!apiKey) {
            alert('Digite uma chave de API');
            return;
        }

        await salvarConfig(selectedProvider, apiKey, selectedModel);
        setApiKey(''); // Limpar campo após salvar
    };

    const handleSearch = async () => {
        if (!pergunta.trim()) {
            alert('Digite uma pergunta');
            return;
        }

        if (documentosSelecionados.length === 0) {
            alert('Selecione pelo menos um documento');
            return;
        }

        const resultado = await pesquisar(pergunta, documentosSelecionados);
        if (resultado) {
            setResposta(resultado);
        }
    };

    const toggleDocumento = (id: string) => {
        setDocumentosSelecionados(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <Layout>
            <div className="p-8">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="w-8 h-8 text-orange-500" />
                        <h1 className="text-3xl font-bold text-gray-900">
                            Meus Conhecimentos
                        </h1>
                    </div>
                    <p className="text-gray-600">
                        Gerencie seus documentos e pesquise usando inteligência artificial
                    </p>
                </div>

                <Tabs defaultValue="documentos" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="documentos">
                            <FileText className="w-4 h-4 mr-2" />
                            Meus Documentos
                        </TabsTrigger>
                        <TabsTrigger value="config">
                            <Settings className="w-4 h-4 mr-2" />
                            Configurar LLM
                        </TabsTrigger>
                        <TabsTrigger value="pesquisar">
                            <Search className="w-4 h-4 mr-2" />
                            Pesquisar
                        </TabsTrigger>
                    </TabsList>

                    {/* Aba: Meus Documentos */}
                    <TabsContent value="documentos" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Documentos Enviados</CardTitle>
                                <CardDescription>
                                    Faça upload de PDFs, Word, imagens (PNG, JPG) para pesquisar com IA
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Botão de Upload */}
                                    <div
                                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                        <p className="text-sm text-gray-600 mb-2">
                                            Arraste arquivos aqui ou clique para selecionar
                                        </p>
                                        <p className="text-xs text-gray-500 mb-4">
                                            Suporta: PDF, DOCX, PNG, JPG (máx. 10MB)
                                        </p>
                                        <Button disabled={loadingDocs}>
                                            {loadingDocs ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Enviando...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Selecionar Arquivos
                                                </>
                                            )}
                                        </Button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept=".pdf,.docx,.png,.jpg,.jpeg"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Lista de Documentos */}
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-gray-900">
                                            Documentos ({documentos.length})
                                        </h3>
                                        {documentos.length === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-8">
                                                Nenhum documento enviado ainda
                                            </p>
                                        ) : (
                                            documentos.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="w-5 h-5 text-orange-500" />
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                {doc.nome}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {formatBytes(doc.tamanho)} • {formatDate(doc.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => baixarDocumento(doc.storage_path, doc.nome)}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => deletarDocumento(doc.id, doc.storage_path)}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Aba: Configurar LLM */}
                    <TabsContent value="config" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configuração da LLM</CardTitle>
                                <CardDescription>
                                    Configure sua chave de API para usar IA na pesquisa de documentos
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Seletor de Provider */}
                                <div className="space-y-2">
                                    <Label htmlFor="provider">Provider de IA</Label>
                                    <select
                                        id="provider"
                                        value={selectedProvider}
                                        onChange={(e) => {
                                            const provider = e.target.value as 'openai' | 'anthropic' | 'google';
                                            setSelectedProvider(provider);
                                            setSelectedModel('');
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                    >
                                        <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
                                        <option value="anthropic">Anthropic (Claude)</option>
                                        <option value="google">Google (Gemini)</option>
                                    </select>
                                </div>

                                {/* API Key */}
                                <div className="space-y-2">
                                    <Label htmlFor="apiKey">Chave de API</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="apiKey"
                                            type="password"
                                            placeholder={config ? "••••••••" : "sk-..."}
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="flex-1"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Sua chave será armazenada de forma segura e criptografada
                                    </p>
                                    {config && (
                                        <p className="text-xs text-green-600">
                                            ✓ Chave de API configurada
                                        </p>
                                    )}
                                </div>

                                {/* Modelo */}
                                <div className="space-y-2">
                                    <Label htmlFor="model">Modelo</Label>
                                    <select
                                        id="model"
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                    >
                                        <option value="">Selecione um modelo</option>
                                        {listarModelos(selectedProvider).map((modelo) => (
                                            <option key={modelo} value={modelo}>
                                                {modelo}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <Button
                                    onClick={handleSaveConfig}
                                    className="w-full"
                                    disabled={loadingConfig}
                                >
                                    {loadingConfig ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Settings className="w-4 h-4 mr-2" />
                                            Salvar Configuração
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Aba: Pesquisar */}
                    <TabsContent value="pesquisar" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pesquisar Conhecimentos</CardTitle>
                                <CardDescription>
                                    Faça perguntas sobre seus documentos usando IA
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Seleção de Documentos */}
                                <div className="space-y-2">
                                    <Label>Documentos para pesquisar</Label>
                                    <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                                        {documentos.length === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-2">
                                                Nenhum documento disponível
                                            </p>
                                        ) : (
                                            documentos.map((doc) => (
                                                <label
                                                    key={doc.id}
                                                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={documentosSelecionados.includes(doc.id)}
                                                        onChange={() => toggleDocumento(doc.id)}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm">{doc.nome}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Input de Pesquisa */}
                                <div className="space-y-2">
                                    <Label htmlFor="question">Sua Pergunta</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="question"
                                            placeholder="Ex: Qual é o resumo do relatório anual?"
                                            value={pergunta}
                                            onChange={(e) => setPergunta(e.target.value)}
                                            className="flex-1"
                                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        />
                                        <Button
                                            onClick={handleSearch}
                                            disabled={loadingPesquisa || !config}
                                        >
                                            {loadingPesquisa ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Pesquisando...
                                                </>
                                            ) : (
                                                <>
                                                    <Brain className="w-4 h-4 mr-2" />
                                                    Pesquisar
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    {!config && (
                                        <p className="text-xs text-orange-600">
                                            Configure sua LLM primeiro na aba "Configurar LLM"
                                        </p>
                                    )}
                                </div>

                                {/* Área de Resultados */}
                                <div className="border border-gray-200 rounded-lg p-6 min-h-[300px] bg-gray-50">
                                    {resposta ? (
                                        <div className="prose max-w-none">
                                            <p className="text-sm font-semibold text-gray-700 mb-2">Resposta:</p>
                                            <p className="text-gray-900 whitespace-pre-wrap">{resposta}</p>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500">
                                            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p>Configure sua LLM e faça uma pergunta para começar</p>
                                        </div>
                                    )}
                                </div>

                                {/* Histórico */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-gray-900">
                                        Histórico de Consultas
                                    </h3>
                                    {consultas.length === 0 ? (
                                        <p className="text-sm text-gray-500">
                                            Nenhuma consulta realizada ainda
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {consultas.map((consulta) => (
                                                <div
                                                    key={consulta.id}
                                                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => {
                                                        setPergunta(consulta.pergunta);
                                                        setResposta(consulta.resposta);
                                                    }}
                                                >
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {consulta.pergunta}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {formatDate(consulta.created_at)} • {consulta.modelo_usado}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
};

export default Conhecimentos;
