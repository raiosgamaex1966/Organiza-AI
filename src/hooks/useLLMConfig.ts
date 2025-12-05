import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LLMConfig {
    id: string;
    user_id: string;
    provider: 'openai' | 'anthropic' | 'google';
    api_key_encrypted: string;
    selected_model?: string;
    created_at: string;
    updated_at: string;
}

export const useLLMConfig = () => {
    const [config, setConfig] = useState<LLMConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Buscar configuração
    const buscarConfig = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data, error } = await supabase
                .from('conhecimentos_config')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            setConfig(data);
        } catch (error: any) {
            console.error('Erro ao buscar config:', error);
        } finally {
            setLoading(false);
        }
    };

    // Salvar configuração
    const salvarConfig = async (
        provider: 'openai' | 'anthropic' | 'google',
        apiKey: string,
        model?: string
    ) => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            // Criptografar API key (base64 simples - em produção use criptografia real)
            const apiKeyEncrypted = btoa(apiKey);

            const configData = {
                user_id: user.id,
                provider,
                api_key_encrypted: apiKeyEncrypted,
                selected_model: model,
            };

            const { error } = await supabase
                .from('conhecimentos_config')
                .upsert(configData, { onConflict: 'user_id' });

            if (error) throw error;

            toast({
                title: 'Configuração salva',
                description: 'Suas configurações de LLM foram salvas com sucesso.',
            });

            await buscarConfig();
        } catch (error: any) {
            toast({
                title: 'Erro ao salvar configuração',
                description: error.message,
                variant: 'destructive',
            });
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Testar conexão
    const testarConexao = async (
        provider: 'openai' | 'anthropic' | 'google',
        apiKey: string
    ): Promise<boolean> => {
        try {
            setLoading(true);

            // Fazer uma chamada simples para testar a API
            const response = await fetch('/api/test-llm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, apiKey }),
            });

            if (!response.ok) {
                throw new Error('Falha ao conectar com a API');
            }

            toast({
                title: 'Conexão bem-sucedida',
                description: 'A chave de API está válida!',
            });

            return true;
        } catch (error: any) {
            toast({
                title: 'Erro na conexão',
                description: 'Não foi possível conectar com a API. Verifique sua chave.',
                variant: 'destructive',
            });
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Listar modelos disponíveis
    const listarModelos = (provider: 'openai' | 'anthropic' | 'google'): string[] => {
        const modelos = {
            openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
            google: ['gemini-pro', 'gemini-pro-vision'],
        };

        return modelos[provider] || [];
    };

    // Descriptografar API key
    const getApiKey = (): string | null => {
        if (!config?.api_key_encrypted) return null;
        try {
            return atob(config.api_key_encrypted);
        } catch {
            return null;
        }
    };

    useEffect(() => {
        buscarConfig();
    }, []);

    return {
        config,
        loading,
        salvarConfig,
        testarConexao,
        listarModelos,
        buscarConfig,
        getApiKey,
    };
};
