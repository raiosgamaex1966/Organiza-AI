-- Tabela para cadastro de múltiplos assistentes OpenAI
CREATE TABLE public.assistentes_openai (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  assistant_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  descricao TEXT,
  prompt_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para threads de conversa
CREATE TABLE public.assistente_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assistente_id UUID NOT NULL REFERENCES public.assistentes_openai(id) ON DELETE CASCADE,
  thread_id_openai TEXT NOT NULL,
  titulo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para mensagens das conversas
CREATE TABLE public.assistente_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.assistente_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  quiz_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.assistentes_openai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistente_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistente_mensagens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para assistentes_openai
CREATE POLICY "Users can view their own assistentes_openai"
ON public.assistentes_openai FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistentes_openai"
ON public.assistentes_openai FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistentes_openai"
ON public.assistentes_openai FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistentes_openai"
ON public.assistentes_openai FOR DELETE
USING (auth.uid() = user_id);

-- Políticas RLS para assistente_threads
CREATE POLICY "Users can view their own assistente_threads"
ON public.assistente_threads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistente_threads"
ON public.assistente_threads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistente_threads"
ON public.assistente_threads FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistente_threads"
ON public.assistente_threads FOR DELETE
USING (auth.uid() = user_id);

-- Políticas RLS para assistente_mensagens (via thread ownership)
CREATE POLICY "Users can view messages from their threads"
ON public.assistente_mensagens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assistente_threads t
    WHERE t.id = assistente_mensagens.thread_id
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their threads"
ON public.assistente_mensagens FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assistente_threads t
    WHERE t.id = assistente_mensagens.thread_id
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete messages from their threads"
ON public.assistente_mensagens FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.assistente_threads t
    WHERE t.id = assistente_mensagens.thread_id
    AND t.user_id = auth.uid()
  )
);

-- Triggers para updated_at
CREATE TRIGGER update_assistentes_openai_updated_at
BEFORE UPDATE ON public.assistentes_openai
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assistente_threads_updated_at
BEFORE UPDATE ON public.assistente_threads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
