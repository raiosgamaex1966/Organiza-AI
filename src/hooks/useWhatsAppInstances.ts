import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  instance_name: string;
  phone: string | null;
  status: "connected" | "disconnected" | "error" | "connecting";
  qr_code: string | null;
  evolution_instance_id: string | null;
  webhook_forward_url: string | null;
  created_at: string;
  updated_at: string;
}

const CACHE_KEY = "organiza_whatsapp_instances";

export function useWhatsAppInstances() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(() => !!localStorage.getItem(CACHE_KEY));

  const saveCache = (list: WhatsAppInstance[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
    } catch {
      // ignore storage quota errors
    }
  };

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-instances", {
      body: { _action: "list" },
    });

    if (error && !data) {
      console.error("Fetch instances error:", error);
      toast.error("Erro ao carregar instâncias do WhatsApp");
      setLoading(false);
      return;
    }

    if (data?.success) {
      const list: WhatsAppInstance[] = data.data || [];
      setInstances(list);
      saveCache(list);
      setHasFetched(true);

      for (const inst of list) {
        const shouldCheck =
          inst.status === "connecting" ||
          inst.status === "disconnected" ||
          (inst.status === "connected" && !inst.phone);

        if (shouldCheck) {
          supabase.functions
            .invoke("whatsapp-instances", {
              body: { _action: "check-status", instance_id: inst.id },
            })
            .then(({ data: statusData }) => {
              if (!statusData?.success) return;
              const nextStatus = statusData?.data?.status;
              const nextPhone = statusData?.data?.phone ?? null;

              if (nextStatus !== inst.status || nextPhone !== (inst.phone ?? null)) {
                setInstances((prev) => {
                  const updated = prev.map((i) =>
                    i.id === inst.id ? { ...i, status: nextStatus, phone: nextPhone } : i
                  );
                  saveCache(updated);
                  return updated;
                });
              }
            })
            .catch(() => {});
        }
      }
    }
    setLoading(false);
  }, []);

  const createInstance = useCallback(
    async (instanceName: string, webhookForwardUrl?: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instances", {
        body: {
          _action: "create",
          instance_name: instanceName,
          webhook_forward_url: webhookForwardUrl,
        },
      });
      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao criar instância");
        return null;
      }
      toast.success("Instância criada com sucesso!");
      await fetchInstances();
      return data.data as WhatsAppInstance;
    },
    [fetchInstances]
  );

  const connectInstance = useCallback(
    async (instanceId: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instances", {
        body: { _action: "connect", instance_id: instanceId },
      });
      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao gerar QR Code");
        return null;
      }
      await fetchInstances();
      return data.data as { qr_code: string | null };
    },
    [fetchInstances]
  );

  const disconnectInstance = useCallback(
    async (instanceId: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instances", {
        body: { _action: "disconnect", instance_id: instanceId },
      });
      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao desconectar instância");
        return;
      }
      toast.success("Instância desconectada");
      await fetchInstances();
    },
    [fetchInstances]
  );

  const deleteInstance = useCallback(
    async (instanceId: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instances", {
        body: { _action: "delete", instance_id: instanceId },
      });
      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao excluir instância");
        await fetchInstances();
        return;
      }
      setInstances((prev) => {
        const updated = prev.filter((i) => i.id !== instanceId);
        saveCache(updated);
        return updated;
      });
      toast.success("Instância excluída com sucesso");
    },
    [fetchInstances]
  );

  const checkInstanceStatus = useCallback(async (instanceId: string) => {
    const { data, error } = await supabase.functions.invoke("whatsapp-instances", {
      body: { _action: "check-status", instance_id: instanceId },
    });
    if (error || !data?.success) return null;
    return data.data as { status: string; phone: string | null };
  }, []);

  const setWebhook = useCallback(
    async (instanceId: string, webhookForwardUrl?: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instances", {
        body: {
          _action: "set-webhook",
          instance_id: instanceId,
          webhook_forward_url: webhookForwardUrl,
        },
      });
      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao configurar webhook");
        return null;
      }
      toast.success("Webhook atualizado com sucesso!");
      await fetchInstances();
      return data.data;
    },
    [fetchInstances]
  );

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  return {
    instances,
    loading,
    hasFetched,
    fetchInstances,
    createInstance,
    connectInstance,
    disconnectInstance,
    deleteInstance,
    checkInstanceStatus,
    setWebhook,
  };
}
