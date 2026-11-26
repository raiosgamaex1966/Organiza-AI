-- Tabela para gerenciar conexões WhatsApp via Evolution API
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  evolution_instance_id TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
  qr_code TEXT,
  webhook_forward_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON public.whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_evo_id ON public.whatsapp_instances(evolution_instance_id);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own whatsapp_instances" ON public.whatsapp_instances;
CREATE POLICY "Users can view their own whatsapp_instances"
  ON public.whatsapp_instances FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own whatsapp_instances" ON public.whatsapp_instances;
CREATE POLICY "Users can create their own whatsapp_instances"
  ON public.whatsapp_instances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own whatsapp_instances" ON public.whatsapp_instances;
CREATE POLICY "Users can update their own whatsapp_instances"
  ON public.whatsapp_instances FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own whatsapp_instances" ON public.whatsapp_instances;
CREATE POLICY "Users can delete their own whatsapp_instances"
  ON public.whatsapp_instances FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_whatsapp_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
