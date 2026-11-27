-- Adiciona limite mensal opcional por categoria para alertas de orçamento
ALTER TABLE public.categorias
ADD COLUMN IF NOT EXISTS orcamento_mensal NUMERIC DEFAULT NULL;
