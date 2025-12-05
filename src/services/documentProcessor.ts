import { supabase } from '@/integrations/supabase/client';

// Função para extrair texto de PDF usando PDF.js
export async function extractTextFromPDF(file: File): Promise<string> {
    try {
        // Usar API do navegador para ler o PDF como texto
        const text = await file.text();

        // Extrair texto básico (melhor que nada)
        // Em produção, você pode usar uma biblioteca como pdf-parse ou pdfjs-dist
        return text;
    } catch (error) {
        console.error('Erro ao extrair texto do PDF:', error);
        return '';
    }
}

// Função para extrair texto de DOCX
export async function extractTextFromDOCX(file: File): Promise<string> {
    try {
        // Ler como texto (básico)
        const text = await file.text();
        return text;
    } catch (error) {
        console.error('Erro ao extrair texto do DOCX:', error);
        return '';
    }
}

// Função para extrair texto de imagens usando OCR (Tesseract.js)
export async function extractTextFromImage(file: File): Promise<string> {
    try {
        // Por enquanto, retornar vazio
        // Em produção, você pode usar Tesseract.js para OCR
        console.warn('OCR não implementado ainda');
        return '';
    } catch (error) {
        console.error('Erro ao extrair texto da imagem:', error);
        return '';
    }
}

// Função principal para processar documento
export async function processDocument(
    documentId: string,
    file: File,
    tipo: 'pdf' | 'docx' | 'png' | 'jpg' | 'jpeg'
): Promise<void> {
    let textoExtraido = '';

    try {
        // Extrair texto baseado no tipo
        if (tipo === 'pdf') {
            textoExtraido = await extractTextFromPDF(file);
        } else if (tipo === 'docx') {
            textoExtraido = await extractTextFromDOCX(file);
        } else if (tipo === 'png' || tipo === 'jpg' || tipo === 'jpeg') {
            textoExtraido = await extractTextFromImage(file);
        }

        // Se não conseguiu extrair texto, usar o nome do arquivo como fallback
        if (!textoExtraido || textoExtraido.trim().length === 0) {
            textoExtraido = `Documento: ${file.name}\nTipo: ${tipo}\nTamanho: ${file.size} bytes\n\n[Texto não pôde ser extraído automaticamente. Por favor, faça upload de um arquivo de texto ou use OCR manual.]`;
        }

        // Atualizar documento no banco com o texto extraído
        const { error } = await supabase
            .from('conhecimentos_documentos')
            .update({
                texto_extraido: textoExtraido,
                processado: true,
            })
            .eq('id', documentId);

        if (error) {
            console.error('Erro ao atualizar documento:', error);
            throw error;
        }

        console.log('Documento processado com sucesso:', documentId);
    } catch (error) {
        console.error('Erro ao processar documento:', error);

        // Marcar como processado mesmo com erro, mas sem texto
        await supabase
            .from('conhecimentos_documentos')
            .update({
                texto_extraido: `Erro ao processar documento: ${error}`,
                processado: true,
            })
            .eq('id', documentId);
    }
}
