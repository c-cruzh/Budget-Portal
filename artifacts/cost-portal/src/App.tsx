import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  LayoutDashboard, TableProperties, Plane, Menu, X, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import DashboardPage from "@/pages/DashboardPage";
import BudgetPage from "@/pages/BudgetPage";
import AviancaPage from "@/pages/AviancaPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const NAV_ITEMS = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/budget", label: "Budget Items", icon: TableProperties },
  { path: "/travel", label: "Flights & Transfers", icon: Plane },
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
        {/* Logo area */}
        <div className="px-5 pt-6 pb-5 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-1 hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">MIT</span>
                </div>
                <span className="font-bold text-sm text-sidebar-foreground">EmTech Digital</span>
              </Link>
              <p className="text-xs text-sidebar-foreground/50 leading-tight">El Salvador 2026</p>
              <p className="text-xs text-sidebar-foreground/40 mt-0.5">Cost Portal</p>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40 leading-relaxed">
            All edits are saved locally in your browser. Export CSV to share.
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
