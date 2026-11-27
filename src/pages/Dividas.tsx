import { useState } from "react";
import { jsPDF } from "jspdf";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  AlertTriangle,
  Calendar,
  DollarSign,
  CreditCard,
  Filter,
  Edit,
  Trash2,
  Download,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCategorias } from "@/hooks/useCategorias";
import { useDividas } from "@/hooks/useDividas";
import { EditarDividaModal } from "@/components/EditarDividaModal";
import { supabase } from "@/integrations/supabase/client";

interface Divida {
  id: string;
  descricao: string;
  valor_total: number;
  valor_pago: number;
  valor_restante: number;
  data_vencimento: string;
  parcelas: number;
  parcelas_pagas: number;
  status: "pendente" | "vencida" | "quitada";
  categoria_id?: string;
  credor: string;
  categorias?: {
    id: string;
    nome: string;
  };
}

const Dividas = () => {
  const { toast } = useToast();
  const { categoriasDespesa } = useCategorias();
  const { dividas, createDivida, updateDivida, deleteDivida } = useDividas();
  const [activeTab, setActiveTab] = useState("lista");
  const [dividaEditando, setDividaEditando] = useState<Divida | null>(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState("");

  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  // Formulário para nova dívida
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoValorTotal, setNovoValorTotal] = useState("");
  const [novaDataVencimento, setNovaDataVencimento] = useState("");
  const [novasParcelas, setNovasParcelas] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novoCredor, setNovoCredor] = useState("");

  const dividasFiltradas = dividas
    .filter((divida) => {
      const matchDescricao = divida.descricao
        .toLowerCase()
        .includes(filtro.toLowerCase());
      const matchStatus = statusFiltro === "" || divida.status === statusFiltro;
      const matchCategoria =
        categoriaFiltro === "" || divida.categorias?.nome === categoriaFiltro;
      return matchDescricao && matchStatus && matchCategoria;
    })
    .sort(
      (a, b) =>
        new Date(b.data_vencimento + "T00:00:00").getTime() -
        new Date(a.data_vencimento + "T00:00:00").getTime()
    );

  const totalDividas = dividas.reduce(
    (total, divida) => total + divida.valor_restante,
    0
  );
  const dividasVencidas = dividas.filter((d) => d.status === "vencida").length;
  const dividasPendentes = dividas.filter(
    (d) => d.status === "pendente"
  ).length;
  const dividasQuitadas = dividas.filter((d) => d.status === "quitada").length;

  const categorias = [
    ...new Set(dividas.map((d) => d.categorias?.nome).filter(Boolean)),
  ];

  const limparFiltros = () => {
    setFiltro("");
    setStatusFiltro("");
    setCategoriaFiltro("");
  };

  const handleAdicionarDivida = async () => {
    if (
      !novaDescricao ||
      !novoValorTotal ||
      !novaDataVencimento ||
      !novasParcelas ||
      !novaCategoria ||
      !novoCredor
    ) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const categoria = categoriasDespesa.find((c) => c.nome === novaCategoria);

    await createDivida({
      descricao: novaDescricao,
      valor_total: parseFloat(novoValorTotal),
      valor_pago: 0,
      valor_restante: parseFloat(novoValorTotal),
      data_vencimento: novaDataVencimento,
      parcelas: parseInt(novasParcelas),
      parcelas_pagas: 0,
      status:
        new Date(novaDataVencimento) < new Date() ? "vencida" : "pendente",
      categoria_id: categoria?.id,
      credor: novoCredor,
    });

    // Limpar formulário
    setNovaDescricao("");
    setNovoValorTotal("");
    setNovaDataVencimento("");
    setNovasParcelas("");
    setNovaCategoria("");
    setNovoCredor("");

    setActiveTab("lista");
  };

  const handleCancelar = () => {
    setNovaDescricao("");
    setNovoValorTotal("");
    setNovaDataVencimento("");
    setNovasParcelas("");
    setNovaCategoria("");
    setNovoCredor("");
    setActiveTab("lista");
  };

  const handleExcluirDivida = async (id: string) => {
    await deleteDivida(id);
  };

  const handleEditarDivida = (id: string) => {
    const divida = dividas.find((d) => d.id === id);
    if (divida) {
      setDividaEditando(divida);
      setModalEditarAberto(true);
    }
  };

  const handleSalvarEdicao = async (dividaEditada: Divida) => {
    const categoria = categoriasDespesa.find(
      (c) => c.nome === dividaEditada.categoria
    );

    await updateDivida(dividaEditada.id, {
      descricao: dividaEditada.descricao,
      valor_total: dividaEditada.valor_total,
      valor_pago: dividaEditada.valor_pago,
      data_vencimento: dividaEditada.data_vencimento,
      parcelas: dividaEditada.parcelas,
      parcelas_pagas: dividaEditada.parcelas_pagas,
      status: dividaEditada.status,
      categoria_id: categoria?.id,
      credor: dividaEditada.credor,
    });

    setDividaEditando(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-yellow-100 text-yellow-800";
      case "vencida":
        return "bg-red-100 text-red-800";
      case "quitada":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pendente":
        return "Pendente";
      case "vencida":
        return "Vencida";
      case "quitada":
        return "Quitada";
      default:
        return status;
    }
  };

  const handleExportCSV = () => {
    if (dividasFiltradas.length === 0) {
      toast({
        title: "Nenhuma dívida para exportar",
        description: "Não há dívidas nos filtros atuais.",
        variant: "destructive",
      });
      return;
    }

    const header = "\uFEFFDescrição;Credor;Categoria;Valor Total;Valor Pago;Valor Restante;Parcelas Pagas;Total Parcelas;Vencimento;Status\r\n";
    const rows = dividasFiltradas
      .map((d) => {
        const desc = String(d.descricao || "").replace(/"/g, '""');
        const credor = String(d.credor || "").replace(/"/g, '""');
        const cat = String(d.categorias?.nome || "Sem categoria").replace(/"/g, '""');
        const total = Number(d.valor_total || 0).toFixed(2).replace(".", ",");
        const pago = Number(d.valor_pago || 0).toFixed(2).replace(".", ",");
        const restante = Number(d.valor_restante || 0).toFixed(2).replace(".", ",");
        const venc = d.data_vencimento ? d.data_vencimento.split("T")[0].split("-").reverse().join("/") : "";
        return `"${desc}";"${credor}";"${cat}";${total};${pago};${restante};${d.parcelas_pagas};${d.parcelas};${venc};${getStatusText(d.status)}`;
      })
      .join("\r\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-dividas-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "CSV exportado!",
      description: "Relatório de dívidas baixado com sucesso.",
    });
  };

  const handleExportPDF = () => {
    if (dividasFiltradas.length === 0) {
      toast({
        title: "Nenhuma dívida para exportar",
        description: "Não há dívidas nos filtros atuais.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text("Organiza-AI — Relatório de Dívidas", 14, y);
    y += 7;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} | Registros: ${dividasFiltradas.length}`, 14, y);
    y += 8;

    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Total a Pagar: R$ ${totalDividas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}   |   Vencidas: ${dividasVencidas}   |   Pendentes: ${dividasPendentes}   |   Quitadas: ${dividasQuitadas}`,
      14,
      y
    );
    y += 10;

    dividasFiltradas.forEach((d, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 18;
      }
      const venc = d.data_vencimento ? d.data_vencimento.split("T")[0].split("-").reverse().join("/") : "-";
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${d.descricao} (${d.credor})`, 14, y);
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Restante: R$ ${Number(d.valor_restante).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}  |  Total: R$ ${Number(d.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}  |  Parcelas: ${d.parcelas_pagas}/${d.parcelas}  |  Venc: ${venc}  |  Status: ${getStatusText(d.status)}`,
        18,
        y
      );
      y += 7;
    });

    doc.save(`relatorio-dividas-${new Date().toISOString().split("T")[0]}.pdf`);
    toast({
      title: "PDF gerado!",
      description: "Relatório de dívidas baixado com sucesso.",
    });
  };

  const handleGenerateAIPlan = async () => {
    setAiDialogOpen(true);
    setAiLoading(true);
    setAiPlan("");

    try {
      const { data, error } = await supabase.functions.invoke("ai-dividas-plan");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Não foi possível gerar o plano.");
      setAiPlan(data.plan);
    } catch (err: any) {
      toast({
        title: "Erro ao consultar IA",
        description: err.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
      setAiPlan("Não foi possível gerar o plano de quitação no momento. Verifique sua conexão e tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadAIPlanPDF = () => {
    if (!aiPlan) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text("Organiza-AI — Plano de Quitação de Dívidas", 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 25);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(aiPlan, 180);
    let y = 34;
    lines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, 14, y);
      y += 5.5;
    });

    doc.save(`plano-ia-dividas-${new Date().toISOString().split("T")[0]}.pdf`);
    toast({
      title: "Plano em PDF baixado!",
      description: "Seu plano de quitação foi salvo em PDF.",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Dívidas
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Controle e gerenciamento de dívidas
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateAIPlan}
              className="flex-1 sm:flex-none border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Plano com IA
            </Button>
            <Button
              onClick={() => setActiveTab("adicionar")}
              className="bg-emerald-500 hover:bg-emerald-600 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Dívida
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="p-4 md:p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-red-100 rounded-full p-2 md:p-3">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">
                  Total a Pagar
                </p>
                <p className="text-lg md:text-2xl font-bold text-red-600">
                  R${" "}
                  {totalDividas.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-red-100 rounded-full p-2 md:p-3">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Vencidas</p>
                <p className="text-lg md:text-2xl font-bold text-red-600">
                  {dividasVencidas}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-100 rounded-full p-2 md:p-3">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Pendentes</p>
                <p className="text-lg md:text-2xl font-bold text-yellow-600">
                  {dividasPendentes}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 rounded-full p-2 md:p-3">
                <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600">Quitadas</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {dividasQuitadas}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 md:space-y-6"
        >
          <TabsList className="w-full grid grid-cols-2 sm:w-auto sm:inline-flex">
            <TabsTrigger value="lista" className="text-sm">
              Lista de Dívidas
            </TabsTrigger>
            <TabsTrigger value="adicionar" className="text-sm">
              Adicionar Dívida
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="space-y-4 md:space-y-6">
            {/* Filtros */}
            <Card className="p-4 md:p-6">
              <h2 className="text-base md:text-lg font-bold text-gray-900 mb-4">
                Filtros
              </h2>
              <div className="flex flex-col space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar dívidas..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <select
                    id="status-filtro"
                    title="Filtrar por status"
                    value={statusFiltro}
                    onChange={(e) => setStatusFiltro(e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Todos os status</option>
                    <option value="pendente">Pendentes</option>
                    <option value="vencida">Vencidas</option>
                    <option value="quitada">Quitadas</option>
                  </select>
                  <select
                    id="categoria-filtro"
                    title="Filtrar por categoria"
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Todas as categorias</option>
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={limparFiltros}
                    className="w-full sm:w-auto"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tabela de Dívidas - Visível apenas em desktop */}
            <div className="hidden md:block">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Credor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">
                        Valor Restante
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dividasFiltradas.map((divida) => (
                      <TableRow key={divida.id}>
                        <TableCell className="font-medium">
                          {divida.descricao}
                        </TableCell>
                        <TableCell>{divida.credor}</TableCell>
                        <TableCell>
                          {divida.categorias?.nome || "Sem categoria"}
                        </TableCell>
                        <TableCell>
                          {divida.parcelas_pagas}/{divida.parcelas}
                        </TableCell>
                        <TableCell>
                          {new Date(
                            divida.data_vencimento + "T00:00:00"
                          ).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              divida.status
                            )}`}
                          >
                            {getStatusText(divida.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          R${" "}
                          {divida.valor_restante.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditarDivida(divida.id)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="sm:max-w-[425px]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Excluir Dívida
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir a dívida "
                                    {divida.descricao}"? Esta ação não pode ser
                                    desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleExcluirDivida(divida.id)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Visualização Mobile - Cards */}
            <div className="md:hidden space-y-4">
              {dividasFiltradas.length === 0 ? (
                <Card className="p-4">
                  <p className="text-center text-gray-500">
                    Nenhuma dívida encontrada.
                  </p>
                </Card>
              ) : (
                dividasFiltradas.map((divida) => (
                  <Card key={divida.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {divida.descricao}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {divida.credor}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            divida.status
                          )}`}
                        >
                          {getStatusText(divida.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Categoria</p>
                          <p className="font-medium">
                            {divida.categorias?.nome || "Sem categoria"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Parcelas</p>
                          <p className="font-medium">
                            {divida.parcelas_pagas}/{divida.parcelas}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Vencimento</p>
                          <p className="font-medium">
                            {new Date(
                              divida.data_vencimento + "T00:00:00"
                            ).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Valor Restante</p>
                          <p className="font-medium text-red-600">
                            R${" "}
                            {divida.valor_restante.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditarDivida(divida.id)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="sm:max-w-[425px]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Excluir Dívida
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a dívida "
                                {divida.descricao}"? Esta ação não pode ser
                                desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleExcluirDivida(divida.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="adicionar">
            <Card className="p-4 md:p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Adicionar Nova Dívida
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Input
                      id="descricao"
                      placeholder="Ex: Cartão de crédito, financiamento..."
                      value={novaDescricao}
                      onChange={(e) => setNovaDescricao(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="credor">Credor *</Label>
                    <Input
                      id="credor"
                      placeholder="Ex: Banco ABC, Loja XYZ..."
                      value={novoCredor}
                      onChange={(e) => setNovoCredor(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor Total *</Label>
                    <Input
                      id="valor"
                      type="number"
                      placeholder="0,00"
                      value={novoValorTotal}
                      onChange={(e) => setNovoValorTotal(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parcelas">Número de Parcelas *</Label>
                    <Input
                      id="parcelas"
                      type="number"
                      placeholder="Ex: 12"
                      value={novasParcelas}
                      onChange={(e) => setNovasParcelas(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria *</Label>
                    <select
                      id="categoria"
                      title="Selecionar categoria"
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categoriasDespesa.map((categoria) => (
                        <option key={categoria.id} value={categoria.nome}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vencimento">Data de Vencimento *</Label>
                    <Input
                      id="vencimento"
                      type="date"
                      value={novaDataVencimento}
                      onChange={(e) => setNovaDataVencimento(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:space-x-4">
                  <Button
                    onClick={handleAdicionarDivida}
                    className="bg-emerald-500 hover:bg-emerald-600 w-full sm:w-auto"
                  >
                    Adicionar Dívida
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelar}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Edição */}
        <EditarDividaModal
          isOpen={modalEditarAberto}
          onClose={() => {
            setModalEditarAberto(false);
            setDividaEditando(null);
          }}
          divida={dividaEditando}
          onSave={handleSalvarEdicao}
        />

        {/* Modal do Consultor IA de Dívidas */}
        <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <Sparkles className="w-5 h-5" />
                Consultor IA de Dívidas
              </DialogTitle>
              <DialogDescription>
                Estratégia personalizada com base nas suas dívidas e no seu fluxo financeiro do mês.
              </DialogDescription>
            </DialogHeader>

            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-600">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-sm">Analisando suas dívidas e montando seu plano de quitação...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 border rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {aiPlan}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
                    Fechar
                  </Button>
                  <Button
                    onClick={handleDownloadAIPlanPDF}
                    disabled={!aiPlan}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Plano em PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Dividas;
