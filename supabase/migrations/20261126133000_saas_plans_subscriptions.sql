-- =====================================================
-- ESTRUTURA SAAS: PLANS, USER_ROLES E SUBSCRIPTIONS
-- =====================================================

-- 1. Tabela de Planos
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  checkout_url TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de Papéis (Admin / User)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Função auxiliar para checar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  );
$$;

-- 3. Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'overdue', 'canceled', 'blocked')),
  gateway TEXT NOT NULL DEFAULT 'manual',
  gateway_customer_id TEXT,
  gateway_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_sub ON public.subscriptions(gateway_subscription_id);

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON public.plans;
CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage plans" ON public.plans;
CREATE POLICY "Admins manage plans"
  ON public.plans FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Planos iniciais
INSERT INTO public.plans (name, slug, description, price_cents, billing_cycle, features)
VALUES
  (
    'Plano Mensal',
    'mensal',
    'Acesso completo ao Organiza-AI + Assistente no WhatsApp',
    2990,
    'monthly',
    '["Dashboard completo", "Assistente no WhatsApp (texto, áudio e recibos)", "Relatórios e metas", "Gestão de veículos e mercado"]'::jsonb
  ),
  (
    'Plano Anual',
    'anual',
    'Economize 2 meses no pagamento anual',
    29700,
    'yearly',
    '["Tudo do Plano Mensal", "2 meses grátis", "Suporte prioritário"]'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

-- Define o proprietário como Admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'robsoncordeiro1966@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Cria assinatura automática de trial (7 dias) para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_plan_id UUID;
BEGIN
  SELECT id INTO default_plan_id FROM public.plans WHERE slug = 'mensal' LIMIT 1;

  INSERT INTO public.subscriptions (user_id, plan_id, status, gateway, current_period_end)
  VALUES (NEW.id, default_plan_id, 'trial', 'manual', now() + interval '7 days')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Backfill para usuários já existentes
INSERT INTO public.subscriptions (user_id, plan_id, status, gateway, current_period_end)
SELECT
  u.id,
  (SELECT id FROM public.plans WHERE slug = 'mensal' LIMIT 1),
  CASE WHEN u.email = 'robsoncordeiro1966@gmail.com' THEN 'active' ELSE 'trial' END,
  'manual',
  CASE WHEN u.email = 'robsoncordeiro1966@gmail.com' THEN now() + interval '10 years' ELSE now() + interval '7 days' END
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;
