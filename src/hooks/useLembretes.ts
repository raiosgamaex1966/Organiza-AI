import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Lembrete {
    id: string;
    user_id: string;
    titulo: string;
    descricao: string | null;
    data: string;
    hora: string | null;
    prioridade: "baixa" | "media" | "alta";
    concluido: boolean;
    created_at: string;
    updated_at: string;
}

export const useLembretes = () => {
    const [lembretes, setLembretes] = useState<Lembrete[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchLembretes = async () => {
        try {
            const { data, error } = await supabase
                .from("lembretes")
                .select("*")
                .order("data", { ascending: true });

            if (error) throw error;

            setLembretes(data as Lembrete[]);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar lembretes",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const createLembrete = async (lembrete: Omit<Lembrete, "id" | "user_id" | "created_at" | "updated_at">) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error("Usuário não autenticado");

            const { data, error } = await supabase
                .from("lembretes")
                .insert([
                    {
                        ...lembrete,
                        user_id: userData.user.id,
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            setLembretes((prev) => [...prev, data as Lembrete]);

            toast({
                title: "Sucesso",
                description: "Lembrete criado com sucesso!",
            });

            return { data, error: null };
        } catch (error: any) {
            toast({
                title: "Erro ao criar lembrete",
                description: error.message,
                variant: "destructive",
            });
            return { data: null, error };
        }
    };

    const updateLembrete = async (id: string, updates: Partial<Lembrete>) => {
        try {
            const { data, error } = await supabase
                .from("lembretes")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;

            setLembretes((prev) =>
                prev.map((lembrete) => (lembrete.id === id ? (data as Lembrete) : lembrete))
            );

            toast({
                title: "Sucesso",
                description: "Lembrete atualizado com sucesso!",
            });

            return { data, error: null };
        } catch (error: any) {
            toast({
                title: "Erro ao atualizar lembrete",
                description: error.message,
                variant: "destructive",
            });
            return { data: null, error };
        }
    };

    const deleteLembrete = async (id: string) => {
        try {
            const { error } = await supabase.from("lembretes").delete().eq("id", id);

            if (error) throw error;

            setLembretes((prev) => prev.filter((lembrete) => lembrete.id !== id));

            toast({
                title: "Sucesso",
                description: "Lembrete excluído com sucesso!",
            });

            return { error: null };
        } catch (error: any) {
            toast({
                title: "Erro ao excluir lembrete",
                description: error.message,
                variant: "destructive",
            });
            return { error };
        }
    };

    useEffect(() => {
        fetchLembretes();

        const channel = supabase
            .channel("lembretes-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "lembretes" },
                () => fetchLembretes()
            )
            .subscribe();

        const handleFocus = () => {
            fetchLembretes();
        };

        window.addEventListener("focus", handleFocus);

        return () => {
            window.removeEventListener("focus", handleFocus);
            supabase.removeChannel(channel);
        };
    }, []);

    return {
        lembretes,
        loading,
        fetchLembretes,
        refetch: fetchLembretes,
        createLembrete,
        updateLembrete,
        deleteLembrete,
    };
};
