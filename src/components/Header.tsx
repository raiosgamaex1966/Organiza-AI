import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { OAIIcon } from "@/components/OAIIcon";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 sticky top-0 z-50 transition-colors">
      <div className="container mx-auto px-4 py-3.5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-2 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <OAIIcon className="w-7 h-7" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Organiza-AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <a href="#recursos" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Recursos
            </a>
            <a href="#como-funciona" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Como Funciona
            </a>
            <a href="#precos" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Preços
            </a>
            <a href="#contato" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Contato
            </a>
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="outline" className="border-slate-300 dark:border-slate-700">
                Fazer Login
              </Button>
            </Link>
            <Link to="/login">
              <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20">
                Começar Grátis
              </Button>
            </Link>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Abrir menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-slate-200 dark:border-slate-800">
            <nav className="flex flex-col space-y-4 mt-4">
              <a href="#recursos" onClick={() => setIsMenuOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors">
                Recursos
              </a>
              <a href="#como-funciona" onClick={() => setIsMenuOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors">
                Como Funciona
              </a>
              <a href="#precos" onClick={() => setIsMenuOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors">
                Preços
              </a>
              <a href="#contato" onClick={() => setIsMenuOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors">
                Contato
              </a>
              <div className="flex flex-col space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Fazer Login
                  </Button>
                </Link>
                <Link to="/login">
                  <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white w-full">
                    Começar Grátis
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
