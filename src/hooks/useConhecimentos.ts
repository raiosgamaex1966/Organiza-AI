import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Documento {
    id: string;
    user_id: string;
    nome: string;
    tipo: 'pdf' | 'docx' | 'png' | 'jpg' | 'jpeg';
    tamanho: number;
    storage_path: string;
    texto_extraido?: string;
    processado: boolean;
    created_at: string;
    updated_at: string;
}

export const useConhecimentos = () => {
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Buscar documentos do usuário
    const listarDocumentos = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            const { data, error } = await supabase
                .from('conhecimentos_documentos')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setDocumentos(data || []);
        } catch (error: any) {
            toast({
                title: 'Erro ao listar documentos',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Upload de documento
    const uploadDocumento = async (file: File) => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            // Validar tipo de arquivo
            const tiposPermitidos = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
            if (!tiposPermitidos.includes(file.type)) {
                throw new Error('Tipo de arquivo não suportado. Use PDF, DOCX, PNG ou JPG.');
            }

            // Validar tamanho (10MB)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error('Arquivo muito grande. Tamanho máximo: 10MB');
            }

            // Gerar nome único para o arquivo
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}_${file.name}`;

            // Upload para Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('conhecimentos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Determinar tipo
            let tipo: 'pdf' | 'docx' | 'png' | 'jpg' | 'jpeg' = 'pdf';
            if (file.type.includes('word')) tipo = 'docx';
            else if (file.type.includes('png')) tipo = 'png';
            else if (file.type.includes('jpeg') || file.type.includes('jpg')) tipo = 'jpeg';

            // Salvar metadados no banco
            const { error: dbError } = await supabase
                .from('conhecimentos_documentos')
                .insert({
                    user_id: user.id,
                    nome: file.name,
                    tipo,
                    tamanho: file.size,
                    storage_path: fileName,
                    processado: false,
                });

            if (dbError) throw dbError;

            toast({
                title: 'Documento enviado',
                description: `${file.name} foi enviado com sucesso!`,
            });

            // Atualizar lista
            await listarDocumentos();
        } catch (error: any) {
            toast({
                title: 'Erro ao enviar documento',
                description: error.message,
                variant: 'destructive',
            });
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Deletar documento
    const deletarDocumento = async (id: string, storagePath: string) => {
        try {
            setLoading(true);

            // Deletar do storage
            const { error: storageError } = await supabase.storage
                .from('conhecimentos')
                .remove([storagePath]);

            if (storageError) throw storageError;

            // Deletar do banco
            const { error: dbError } = await supabase
                .from('conhecimentos_documentos')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;

            toast({
                title: 'Documento deletado',
                description: 'O documento foi removido com sucesso.',
            });

            // Atualizar lista
            await listarDocumentos();
        } catch (error: any) {
            toast({
                title: 'Erro ao deletar documento',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Baixar documento
    const baixarDocumento = async (storagePath: string, nome: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('conhecimentos')
                .download(storagePath);

            if (error) throw error;

            // Criar URL temporária e fazer download
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = nome;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({
                title: 'Download iniciado',
                description: `Baixando ${nome}...`,
            });
        } catch (error: any) {
            toast({
                title: 'Erro ao baixar documento',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    // Carregar documentos ao montar
    useEffect(() => {
        listarDocumentos();
    }, []);

    return {
        documentos,
        loading,
        uploadDocumento,
        deletarDocumento,
        baixarDocumento,
        listarDocumentos,
    };
};
