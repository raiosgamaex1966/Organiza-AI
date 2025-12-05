import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLLMConfig } from './useLLMConfig';

export interface Consulta {
    id: string;
    user_id: string;
    documento_ids: string[];
    pergunta: string;
    resposta: string;
    modelo_usado: string;
    tokens_usados?: number;
    created_at: string;
}

export const usePesquisaConhecimentos = () => {
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { config, getApiKey } = useLLMConfig();

    // Buscar histórico de consultas
    const buscarHistorico = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data, error } = await supabase
                .from('conhecimentos_consultas')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            setConsultas(data || []);
        } catch (error: any) {
            console.error('Erro ao buscar histórico:', error);
        }
    };

    // Realizar pesquisa
    const pesquisar = async (
        pergunta: string,
        documentoIds: string[]
    ): Promise<string | null> => {
        try {
            setLoading(true);

            if (!config) {
                throw new Error('Configure sua LLM primeiro');
            }

            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('Chave de API não encontrada');
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            // Buscar documentos selecionados
            const { data: documentos, error: docError } = await supabase
                .from('conhecimentos_documentos')
                .select('*')
                .in('id', documentoIds);

            if (docError) throw docError;

            // Preparar contexto dos documentos
            const contexto = documentos
                ?.map((doc) => `Documento: ${doc.nome}\n${doc.texto_extraido || 'Texto não processado'}`)
                .join('\n\n');

            // Fazer chamada para LLM
            const resposta = await chamarLLM(
                config.provider,
                apiKey,
                config.selected_model || '',
                pergunta,
                contexto || ''
            );

            // Salvar consulta no histórico
            const { error: insertError } = await supabase
                .from('conhecimentos_consultas')
                .insert({
                    user_id: user.id,
                    documento_ids: documentoIds,
                    pergunta,
                    resposta,
                    modelo_usado: config.selected_model || config.provider,
                });

            if (insertError) console.error('Erro ao salvar consulta:', insertError);

            // Atualizar histórico
            await buscarHistorico();

            return resposta;
        } catch (error: any) {
            toast({
                title: 'Erro na pesquisa',
                description: error.message,
                variant: 'destructive',
            });
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        consultas,
        loading,
        pesquisar,
        buscarHistorico,
    };
};

// Função auxiliar para chamar LLM
async function chamarLLM(
    provider: string,
    apiKey: string,
    model: string,
    pergunta: string,
    contexto: string
): Promise<string> {
    const prompt = `Contexto dos documentos:\n${contexto}\n\nPergunta: ${pergunta}\n\nResponda baseado apenas nas informações dos documentos fornecidos.`;

    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model || 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'Você é um assistente que responde perguntas baseado em documentos fornecidos.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error('Erro na API da OpenAI');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    if (provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: model || 'claude-3-sonnet-20240229',
                max_tokens: 1024,
                messages: [
                    { role: 'user', content: prompt }
                ],
            }),
        });

        if (!response.ok) {
            throw new Error('Erro na API da Anthropic');
        }

        const data = await response.json();
        return data.content[0].text;
    }

    if (provider === 'google') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-pro'}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
            }),
        });

        if (!response.ok) {
            throw new Error('Erro na API do Google');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    throw new Error('Provider não suportado');
}
