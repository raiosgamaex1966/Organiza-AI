import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Smartphone,
  Wifi,
  WifiOff,
  QrCode,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle,
  Loader2,
  Phone,
} from "lucide-react";
import { useWhatsAppInstances, WhatsAppInstance } from "@/hooks/useWhatsAppInstances";
import { toast } from "sonner";

export default function WhatsApp() {
  const {
    instances,
    loading,
    hasFetched,
    fetchInstances,
    createInstance,
    connectInstance,
    disconnectInstance,
    deleteInstance,
    checkInstanceStatus,
  } = useWhatsAppInstances();

  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const [showConnectModal, setShowConnectModal] = useState<WhatsAppInstance | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<WhatsAppInstance | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [webhookModalInstance, setWebhookModalInstance] = useState<WhatsAppInstance | null>(null);
  const [editWebhookUrl, setEditWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);

  const [confirmDisconnect, setConfirmDisconnect] = useState<WhatsAppInstance | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WhatsAppInstance | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPolling(false);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Informe um nome para a instância");
      return;
    }
    setCreating(true);
    const created = await createInstance(newName.trim(), newWebhookUrl.trim() || undefined);
    setCreating(false);
    if (created) {
      setShowNewModal(false);
      setNewName("");
      setNewWebhookUrl("");
      if (created.qr_code) {
        setQrData(created.qr_code);
        setShowConnectModal(created);
        startPolling(created);
      } else {
        handleConnect(created);
      }
    }
  };

  const startPolling = (inst: WhatsAppInstance) => {
    stopPolling();
    setPolling(true);
    pollingRef.current = setInterval(async () => {
      const res = await checkInstanceStatus(inst.id);
      if (res?.status === "connected") {
        stopPolling();
        setShowConnectModal(null);
        setQrData(null);
        await fetchInstances();
        setShowSuccessModal({ ...inst, status: "connected", phone: res.phone });
      }
    }, 3000);
  };

  const handleConnect = async (inst: WhatsAppInstance) => {
    setShowConnectModal(inst);
    setQrData(inst.qr_code || null);
    const res = await connectInstance(inst.id);
    if (res?.qr_code) {
      setQrData(res.qr_code);
      startPolling(inst);
    } else {
      startPolling(inst);
    }
  };

  const handleOpenWebhookModal = (inst: WhatsAppInstance) => {
    setWebhookModalInstance(inst);
    setEditWebhookUrl(inst.webhook_forward_url || "");
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookModalInstance) return;
    setSavingWebhook(true);
    const res = await setWebhook(webhookModalInstance.id, editWebhookUrl.trim());
    setSavingWebhook(false);
    if (res) {
      setWebhookModalInstance(null);
    }
  };

  const getStatusBadge = (status: WhatsAppInstance["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 gap-1">
            <Wifi className="w-3 h-3" /> Conectado
          </Badge>
        );
      case "connecting":
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Conectando
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <WifiOff className="w-3 h-3" /> Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <WifiOff className="w-3 h-3" /> Desconectado
          </Badge>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Smartphone className="w-7 h-7 text-orange-500" />
              Conexão WhatsApp
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Conecte seu WhatsApp via QR Code para registrar despesas, receitas, áudios e recibos diretamente por mensagem.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => fetchInstances()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button
              onClick={() => setShowNewModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Conexão
            </Button>
          </div>
        </div>

        {!hasFetched && loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : instances.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-orange-500" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-semibold text-gray-900">Nenhuma conexão WhatsApp</h3>
                <p className="text-sm text-gray-500">
                  Crie uma instância para gerar o QR Code e conectar seu número de WhatsApp ao Organiza-AI.
                </p>
              </div>
              <Button
                onClick={() => setShowNewModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Conectar WhatsApp
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instances.map((inst) => (
              <Card key={inst.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{inst.instance_name}</h3>
                      {inst.phone ? (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" /> +{inst.phone}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">Aguardando pareamento</p>
                      )}
                    </div>
                    {getStatusBadge(inst.status)}
                  </div>

                  {inst.webhook_forward_url && (
                    <div className="text-xs bg-slate-50 border rounded-md px-2.5 py-1.5 text-gray-600 truncate">
                      <span className="font-medium">Webhook:</span> {inst.webhook_forward_url}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                    {inst.status === "connected" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDisconnect(inst)}
                        className="flex-1 gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                      >
                        <WifiOff className="w-3.5 h-3.5" />
                        Desconectar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(inst)}
                        className="flex-1 gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Conectar QR
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(inst)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Excluir instância"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar Nova Instância */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance-name">Nome da instância</Label>
              <Input
                id="instance-name"
                placeholder="Ex: WhatsApp Principal"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar e Gerar QR Code
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code */}
      <Dialog
        open={!!showConnectModal}
        onOpenChange={(open) => {
          if (!open) {
            stopPolling();
            setShowConnectModal(null);
            setQrData(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar {showConnectModal?.instance_name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-2">
            {qrData ? (
              <div className="p-3 bg-white border rounded-xl shadow-sm">
                <img
                  src={qrData.startsWith("data:") ? qrData : `data:image/png;base64,${qrData}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 object-contain"
                />
              </div>
            ) : (
              <div className="w-64 h-64 flex flex-col items-center justify-center border rounded-xl bg-slate-50 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="text-xs text-gray-500">Gerando QR Code...</span>
              </div>
            )}
            <p className="text-xs text-center text-gray-600">
              Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho e aponte a câmera.
            </p>
            {polling && (
              <div className="flex items-center gap-2 text-xs text-orange-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Aguardando leitura do QR Code...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Sucesso */}
      <Dialog open={!!showSuccessModal} onOpenChange={() => setShowSuccessModal(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center py-4 space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <h3 className="text-lg font-semibold">WhatsApp Conectado!</h3>
            <p className="text-sm text-gray-600">
              A instância <strong>{showSuccessModal?.instance_name}</strong> foi conectada com sucesso
              {showSuccessModal?.phone ? ` (+${showSuccessModal.phone})` : ""}.
            </p>
            <Button
              onClick={() => setShowSuccessModal(null)}
              className="bg-orange-500 hover:bg-orange-600 text-white w-full"
            >
              Concluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Configurar Webhook */}
      <Dialog open={!!webhookModalInstance} onOpenChange={() => setWebhookModalInstance(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Webhook / n8n — {webhookModalInstance?.instance_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveWebhook} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-webhook-url">URL de encaminhamento (n8n)</Label>
              <Input
                id="edit-webhook-url"
                type="url"
                placeholder="https://seu-n8n.com/webhook/..."
                value={editWebhookUrl}
                onChange={(e) => setEditWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Deixe em branco para usar apenas o registro padrão (ou o secret global N8N_WEBHOOK_URL).
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setWebhookModalInstance(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingWebhook}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {savingWebhook ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar Webhook
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação Desconectar */}
      <AlertDialog open={!!confirmDisconnect} onOpenChange={() => setConfirmDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso encerrará a sessão da instância <strong>{confirmDisconnect?.instance_name}</strong> no WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDisconnect) disconnectInstance(confirmDisconnect.id);
                setConfirmDisconnect(null);
              }}
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação Excluir */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
            <AlertDialogDescription>
              A instância <strong>{confirmDelete?.instance_name}</strong> será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (confirmDelete) deleteInstance(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
