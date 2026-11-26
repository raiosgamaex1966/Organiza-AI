import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import Assinatura from "@/pages/Assinatura";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowInactive?: boolean;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({
  children,
  allowInactive = false,
  requireAdmin = false,
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isAdmin, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const isLoading = authLoading || (!!user && subLoading);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    } else if (!isLoading && user && requireAdmin && !isAdmin) {
      navigate("/dashboard");
    }
  }, [user, authLoading, isLoading, requireAdmin, isAdmin, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  if (!allowInactive && !hasAccess) {
    return <Assinatura />;
  }

  return <>{children}</>;
};
