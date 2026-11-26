import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  billing_cycle: "monthly" | "yearly";
  checkout_url: string | null;
  features: string[];
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: "trial" | "active" | "overdue" | "canceled" | "blocked";
  gateway: string;
  current_period_end: string | null;
  plans?: Plan | null;
}

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: roleData }, { data: subData }, { data: plansData }] = await Promise.all([
        (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
        (supabase as any)
          .from("subscriptions")
          .select("*, plans(*)")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("plans")
          .select("*")
          .eq("is_active", true)
          .order("price_cents", { ascending: true }),
      ]);

      setIsAdmin(!!roleData);
      setSubscription(subData || null);
      setPlans((plansData || []) as Plan[]);
    } catch (e) {
      console.error("Erro ao verificar assinatura:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchStatus();
    }
  }, [authLoading, fetchStatus]);

  const isPeriodValid =
    !subscription?.current_period_end ||
    new Date(subscription.current_period_end) > new Date();

  const hasAccess =
    isAdmin ||
    ((subscription?.status === "active" || subscription?.status === "trial") && isPeriodValid);

  return {
    isAdmin,
    subscription,
    plans,
    hasAccess,
    loading: authLoading || loading,
    refetch: fetchStatus,
  };
}
