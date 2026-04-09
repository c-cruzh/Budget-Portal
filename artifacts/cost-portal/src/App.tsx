import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  LayoutDashboard, TableProperties, Plane, Menu, X, ChevronRight,
  Wine, Coffee, Sandwich
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import DashboardPage from "@/pages/DashboardPage";
import BudgetPage from "@/pages/BudgetPage";
import AviancaPage from "@/pages/AviancaPage";
import CoctelPage from "@/pages/CoctelPage";
import BarBebidasPage from "@/pages/BarBebidasPage";
import LunchPage from "@/pages/LunchPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const NAV_ITEMS = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/budget", label: "Budget Items", icon: TableProperties },
  { path: "/travel", label: "Flights & Transfers", icon: Plane },
  { path: "/coctel", label: "Coctel (Delibanquetes)", icon: Wine },
  { path: "/bar-bebidas", label: "Bar & Bebidas", icon: Coffee },
  { path: "/lunch", label: "Lunch & Coffee Breaks", icon: Sandwich },
];

function NavLink({ item }: { item: typeof NAV_ITEMS[number] }) {
  const [location] = useLocation();
  const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
  return (
    <Link
      href={item.path}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {item.label}
    </Link>
  );
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const [location] = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed top-0 left-0 h-full z-40 w-[240px] bg-sidebar border-r border-sidebar-border flex flex-col",
        "transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="px-4 pt-5 pb-4 border-b border-sidebar-border">
          <div className="flex items-start justify-between">
            <Link href="/" className="block hover:opacity-90 transition-opacity">
              <img
                src={`${import.meta.env.BASE_URL}emtech-logo.png`}
                alt="EmTech Digital LATAM El Salvador 2026"
                className="w-full max-w-[180px] h-auto"
              />
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground mt-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-sidebar-foreground/40 mt-2 uppercase tracking-widest">Organizers Portal</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          <img
            src={`${import.meta.env.BASE_URL}presenting-partners.png`}
            alt="Presenting Partners: MIT Technology Review (Publicado por Opinno) and C2 Labs"
            className="w-full max-w-[190px] h-auto opacity-80"
          />
          <p className="text-[10px] text-sidebar-foreground/30 leading-relaxed">
            Data synced to cloud. Share the link with your team.
          </p>
        </div>
      </aside>
    </>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const currentPage = NAV_ITEMS.find(n =>
    n.path === "/" ? location === "/" : location.startsWith(n.path)
  ) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-[240px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-3.5 flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground hidden sm:inline">EmTech Digital El Salvador 2026</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 hidden sm:inline" />
            <span className="font-semibold text-foreground">{currentPage.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-muted border border-border">
              April 2026
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-5 sm:px-8 py-6 max-w-[1440px] w-full mx-auto">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Layout><DashboardPage /></Layout>} />
      <Route path="/budget" component={() => <Layout><BudgetPage /></Layout>} />
      <Route path="/travel" component={() => <Layout><AviancaPage /></Layout>} />
      <Route path="/coctel" component={() => <Layout><CoctelPage /></Layout>} />
      <Route path="/bar-bebidas" component={() => <Layout><BarBebidasPage /></Layout>} />
      <Route path="/lunch" component={() => <Layout><LunchPage /></Layout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
