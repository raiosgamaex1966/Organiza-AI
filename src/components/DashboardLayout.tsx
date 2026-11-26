import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  TrendingUp,
  TrendingDown,
  FileText,
  BarChart3,
  Tag,
  PieChart,
  Target,
  Users,
  Bot,
  ShoppingCart,
  Car,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  BookOpen,
  MessageSquare,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { OAIIcon } from "@/components/OAIIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useSubscription();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: TrendingUp, label: "Receitas", path: "/receitas" },
    { icon: TrendingDown, label: "Despesas", path: "/despesas" },
    { icon: FileText, label: "Transações", path: "/transacoes" },
    { icon: PieChart, label: "Dívidas", path: "/dividas" },
    { icon: Tag, label: "Categorias", path: "/categorias" },
    { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
    { icon: Target, label: "Metas", path: "/metas" },
    { icon: Bell, label: "Lembretes", path: "/lembretes" },
    { icon: BookOpen, label: "Conhecimentos", path: "/conhecimentos" },
    { icon: ShoppingCart, label: "Mercado", path: "/mercado" },
    { icon: Car, label: "Veículos", path: "/veiculos" },
    { icon: Users, label: "Perfil", path: "/perfil" },
    { icon: Bot, label: "IA", path: "/ia" },
    { icon: MessageSquare, label: "Assistente IA", path: "/assistente-openai" },
    { icon: Smartphone, label: "WhatsApp", path: "/whatsapp" },
    ...(isAdmin ? [{ icon: ShieldCheck, label: "Admin SaaS", path: "/admin" }] : []),
  ];

  const handleLogout = () => {
    // Limpar dados de autenticação do localStorage
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("isAuthenticated");

    // Mostrar toast de confirmação
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });

    // Redirecionar para a página inicial (login)
    navigate("/");
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex relative transition-colors">
      {/* Mobile Menu Button - Only show when menu is closed */}
      {!isMobileMenuOpen && (
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-white shadow-md rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-screen
          ${isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
          }
          transition-all duration-300
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col
          z-40
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg p-2">
                <OAIIcon className="w-10 h-10" />
              </div>
              {!isCollapsed && (
                <span className="text-xl font-bold text-slate-800 dark:text-white">Organiza-AI</span>
              )}
            </div>

            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 hover:bg-gray-100 transition-colors"
              onClick={closeMobileMenu}
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Collapse Button - Positioned on the edge - Desktop only */}
        <Button
          variant="ghost"
          size="icon"
          className={`
            hidden lg:flex absolute top-6 -right-3
            h-6 w-6 rounded-full bg-white border border-gray-300
            hover:bg-gray-100 hover:border-gray-400
            transition-all duration-200 shadow-sm
            items-center justify-center
          `}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-gray-600" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-gray-600" />
          )}
        </Button>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === item.path
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  } ${isCollapsed ? "justify-center" : "space-x-3"}`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
        </nav>

        {/* Theme & Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            className={`flex-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ${isCollapsed ? "justify-center px-0" : "justify-start"
              }`}
            onClick={() => {
              handleLogout();
              closeMobileMenu();
            }}
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Sair</span>}
          </Button>
          {!isCollapsed && <ThemeToggle />}
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 ${isCollapsed ? "lg:ml-20" : "lg:ml-64"
          } transition-all duration-300`}
      >
        <div className="lg:hidden h-16"></div>{" "}
        {/* Spacer for mobile menu button */}
        {children}
      </div>
    </div>
  );
};
