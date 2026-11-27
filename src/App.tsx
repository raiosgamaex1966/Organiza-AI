import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./App.css";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Receitas = lazy(() => import("./pages/Receitas"));
const Despesas = lazy(() => import("./pages/Despesas"));
const Transacoes = lazy(() => import("./pages/Transacoes"));
const Dividas = lazy(() => import("./pages/Dividas"));
const Categorias = lazy(() => import("./pages/Categorias"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Metas = lazy(() => import("./pages/Metas"));
const Mercado = lazy(() => import("./pages/Mercado"));
const Veiculos = lazy(() => import("./pages/Veiculos"));
const Perfil = lazy(() => import("./pages/Perfil"));
const IA = lazy(() => import("./pages/IA"));
const Lembretes = lazy(() => import("./pages/Lembretes"));
const Conhecimentos = lazy(() => import("./pages/Conhecimentos"));
const AssistenteOpenAI = lazy(() => import("./pages/AssistenteOpenAI"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const Index = lazy(() => import("./pages/Index"));
const Admin = lazy(() => import("./pages/Admin"));
const Assinatura = lazy(() => import("./pages/Assinatura"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
  </div>
);

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="organiza-ai-theme">
      <Router>
      <div className="min-h-screen bg-background">
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/assinatura"
            element={
              <ProtectedRoute allowInactive>
                <Assinatura />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receitas"
            element={
              <ProtectedRoute>
                <Receitas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/despesas"
            element={
              <ProtectedRoute>
                <Despesas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transacoes"
            element={
              <ProtectedRoute>
                <Transacoes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dividas"
            element={
              <ProtectedRoute>
                <Dividas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categorias"
            element={
              <ProtectedRoute>
                <Categorias />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute>
                <Relatorios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metas"
            element={
              <ProtectedRoute>
                <Metas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mercado"
            element={
              <ProtectedRoute>
                <Mercado />
              </ProtectedRoute>
            }
          />
          <Route
            path="/veiculos"
            element={
              <ProtectedRoute>
                <Veiculos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ia"
            element={
              <ProtectedRoute>
                <IA />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lembretes"
            element={
              <ProtectedRoute>
                <Lembretes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conhecimentos"
            element={
              <ProtectedRoute>
                <Conhecimentos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistente-openai"
            element={
              <ProtectedRoute>
                <AssistenteOpenAI />
              </ProtectedRoute>
            }
          />
          <Route
            path="/whatsapp"
            element={
              <ProtectedRoute requireAdmin>
                <WhatsApp />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <Toaster />
      </div>
    </Router>
    </ThemeProvider>
  );
}

export default App;
