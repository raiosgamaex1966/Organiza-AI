import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Assistente {
    id: string;
    nome: string;
    assistant_id: string;
    api_key: string;
    descricao?: string;
    prompt_template?: string;
    created_at: string;
}

export interface Thread {
    id: string;
    assistente_id: string;
    thread_id_openai: string;
    titulo?: string;
    created_at: string;
}

export interface Mensagem {
    id: string;
    thread_id: string;
    role: 'user' | 'assistant';
    content: string;
    quiz_data?: QuizData;
    created_at: string;
}

export interface QuizData {
    tipo: 'quiz';
    pergunta: string;
    alternativas: {
        letra: string;
        texto: string;
        correta: boolean;
    }[];
    explicacao?: string;
}

export const useAssistentesOpenAI = () => {
    const [assistentes, setAssistentes] = useState<Assistente[]>([]);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [mensagens, setMensagens] = useState<Mensagem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    // Buscar assistentes
    const fetchAssistentes = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('assistentes_openai')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAssistentes(data || []);
        } catch (error) {
            console.error('Erro ao buscar assistentes:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Buscar threads de um assistente
    const fetchThreads = useCallback(async (assistenteId: string) => {
        try {
            const { data, error } = await supabase
                .from('assistente_threads')
                .select('*')
                .eq('assistente_id', assistenteId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setThreads(data || []);
        } catch (error) {
            console.error('Erro ao buscar threads:', error);
        }
    }, []);

    // Buscar mensagens de uma thread
    const fetchMensagens = useCallback(async (threadId: string) => {
        try {
            const { data, error } = await supabase
                .from('assistente_mensagens')
                .select('*')
                .eq('thread_id', threadId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Parse quiz_data from JSON
            const mensagensFormatadas = (data || []).map(m => ({
                ...m,
                quiz_data: m.quiz_data as QuizData | undefined
            }));

            setMensagens(mensagensFormatadas);
        } catch (error) {
            console.error('Erro ao buscar mensagens:', error);
        }
    }, []);

    // Criar assistente
    const criarAssistente = async (assistente: Omit<Assistente, 'id' | 'created_at'>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { error } = await supabase
                .from('assistentes_openai')
                .insert({
                    user_id: user.id,
                    ...assistente
                });

            if (error) throw error;

            await fetchAssistentes();
            toast({
                title: "Assistente criado",
                description: "Assistente configurado com sucesso!",
            });
        } catch (error) {
            console.error('Erro ao criar assistente:', error);
            toast({
                title: "Erro",
                description: "Erro ao criar assistente. Verifique os dados.",
                variant: "destructive",
            });
        }
    };

    // Atualizar assistente
    const atualizarAssistente = async (id: string, assistente: Partial<Assistente>) => {
        try {
            const { error } = await supabase
                .from('assistentes_openai')
                .update(assistente)
                .eq('id', id);

            if (error) throw error;

            await fetchAssistentes();
            toast({
                title: "Assistente atualizado",
                description: "Alterações salvas com sucesso!",
            });
        } catch (error) {
            console.error('Erro ao atualizar assistente:', error);
            toast({
                title: "Erro",
                description: "Erro ao atualizar assistente.",
                variant: "destructive",
            });
        }
    };

    // Excluir assistente
    const excluirAssistente = async (id: string) => {
        try {
            const { error } = await supabase
                .from('assistentes_openai')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await fetchAssistentes();
            toast({
                title: "Assistente excluído",
                description: "Assistente removido com sucesso.",
            });
        } catch (error) {
            console.error('Erro ao excluir assistente:', error);
            toast({
                title: "Erro",
                description: "Erro ao excluir assistente.",
                variant: "destructive",
            });
        }
    };

    // Criar nova thread
    const criarThread = async (assistente: Assistente): Promise<Thread | null> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            // Criar thread na OpenAI
            const response = await fetch('https://api.openai.com/v1/threads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${assistente.api_key}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const threadData = await response.json();

            // Salvar no Supabase
            const { data, error } = await supabase
                .from('assistente_threads')
                .insert({
                    user_id: user.id,
                    assistente_id: assistente.id,
                    thread_id_openai: threadData.id,
                    titulo: 'Nova conversa'
                })
                .select()
                .single();

            if (error) throw error;

            await fetchThreads(assistente.id);
            return data;
        } catch (error) {
            console.error('Erro ao criar thread:', error);
            toast({
                title: "Erro",
                description: "Erro ao criar nova conversa. Verifique sua API Key.",
                variant: "destructive",
            });
            return null;
        }
    };

    // Atualizar título da thread
    const atualizarTituloThread = async (threadId: string, titulo: string) => {
        try {
            const { error } = await supabase
                .from('assistente_threads')
                .update({ titulo })
                .eq('id', threadId);

            if (error) throw error;
        } catch (error) {
            console.error('Erro ao atualizar título:', error);
        }
    };

    // Excluir thread
    const excluirThread = async (threadId: string, assistenteId: string) => {
        try {
            const { error } = await supabase
                .from('assistente_threads')
                .delete()
                .eq('id', threadId);

            if (error) throw error;

            await fetchThreads(assistenteId);
            setMensagens([]);
            toast({
                title: "Conversa excluída",
                description: "Conversa removida com sucesso.",
            });
        } catch (error) {
            console.error('Erro ao excluir thread:', error);
        }
    };

    // Enviar mensagem
    const enviarMensagem = async (
        assistente: Assistente,
        thread: Thread,
        mensagem: string
    ): Promise<boolean> => {
        setIsSending(true);
        try {
            // Salvar mensagem do usuário no Supabase
            const { error: userMsgError } = await supabase
                .from('assistente_mensagens')
                .insert({
                    thread_id: thread.id,
                    role: 'user',
                    content: mensagem
                });

            if (userMsgError) throw userMsgError;

            // Adicionar mensagem na thread da OpenAI
            await fetch(`https://api.openai.com/v1/threads/${thread.thread_id_openai}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${assistente.api_key}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    role: 'user',
                    content: mensagem
                })
            });

            // Executar o assistente
            const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.thread_id_openai}/runs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${assistente.api_key}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    assistant_id: assistente.assistant_id,
                    additional_instructions: assistente.prompt_template || undefined
                })
            });

            if (!runResponse.ok) {
                throw new Error(`OpenAI Run error: ${runResponse.status}`);
            }

            const runData = await runResponse.json();

            // Aguardar conclusão do run
            let runStatus = runData.status;
            while (runStatus === 'queued' || runStatus === 'in_progress') {
                await new Promise(resolve => setTimeout(resolve, 1000));

                const statusResponse = await fetch(
                    `https://api.openai.com/v1/threads/${thread.thread_id_openai}/runs/${runData.id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${assistente.api_key}`,
                            'OpenAI-Beta': 'assistants=v2'
                        }
                    }
                );

                const statusData = await statusResponse.json();
                runStatus = statusData.status;
            }

            if (runStatus !== 'completed') {
                throw new Error(`Run failed with status: ${runStatus}`);
            }

            // Buscar mensagens da OpenAI
            const messagesResponse = await fetch(
                `https://api.openai.com/v1/threads/${thread.thread_id_openai}/messages?limit=1&order=desc`,
                {
                    headers: {
                        'Authorization': `Bearer ${assistente.api_key}`,
                        'OpenAI-Beta': 'assistants=v2'
                    }
                }
            );

            const messagesData = await messagesResponse.json();
            const assistantMessage = messagesData.data[0];

            if (assistantMessage && assistantMessage.role === 'assistant') {
                const content = assistantMessage.content[0]?.text?.value || '';

                // Tentar parsear como quiz
                let quizData: QuizData | undefined;
                try {
                    const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
                    const parsed = JSON.parse(cleanContent);
                    if (parsed.tipo === 'quiz' && parsed.alternativas) {
                        quizData = parsed;
                    }
                } catch {
                    // Não é JSON, manter como texto
                }

                // Salvar resposta no Supabase
                const { error: assistantMsgError } = await supabase
                    .from('assistente_mensagens')
                    .insert({
                        thread_id: thread.id,
                        role: 'assistant',
                        content: quizData ? '' : content,
                        quiz_data: quizData || null
                    });

                if (assistantMsgError) throw assistantMsgError;
            }

            await fetchMensagens(thread.id);
            return true;
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            toast({
                title: "Erro",
                description: "Erro ao enviar mensagem. Verifique sua conexão e API Key.",
                variant: "destructive",
            });
            return false;
        } finally {
            setIsSending(false);
        }
    };

    useEffect(() => {
        fetchAssistentes();
    }, [fetchAssistentes]);

    return {
        assistentes,
        threads,
        mensagens,
        isLoading,
        isSending,
        fetchAssistentes,
        fetchThreads,
        fetchMensagens,
        criarAssistente,
        atualizarAssistente,
        excluirAssistente,
        criarThread,
        atualizarTituloThread,
        excluirThread,
        enviarMensagem
    };
};
