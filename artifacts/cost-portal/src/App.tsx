import { Switch, Route, Router as WouterRouter, Link, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  LayoutDashboard, TableProperties, Plane, Bus, Menu, X, ChevronRight,
  Wine, Coffee, Sandwich, LogOut, Info, Eye, MessageSquare, Pencil,
  HandCoins, History, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import DashboardPage from "@/pages/DashboardPage";
import BudgetPage from "@/pages/BudgetPage";
import GroundTransportPage from "@/pages/GroundTransportPage";
import AerialTransportPage from "@/pages/AerialTransportPage";
import CoctelPage from "@/pages/CoctelPage";
import BarBebidasPage from "@/pages/BarBebidasPage";
import LunchPage from "@/pages/LunchPage";
import SponsorsPage from "@/pages/SponsorsPage";
import HistoryPage from "@/pages/HistoryPage";
import AgendaPage from "@/pages/AgendaPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

type NavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  deprecated?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/budget", label: "Budget Items", icon: TableProperties },
  { path: "/agenda", label: "Agenda", icon: Calendar },
  { path: "/travel/ground", label: "Ground Transport", icon: Bus, deprecated: true },
  { path: "/travel/aerial", label: "Flights / Vuelos SAL", icon: Plane },
  { path: "/coctel", label: "Coctel (Delibanquetes)", icon: Wine, deprecated: true },
  { path: "/bar-bebidas", label: "Bar & Bebidas", icon: Coffee, deprecated: true },
  { path: "/lunch", label: "Lunch & Coffee Breaks", icon: Sandwich, deprecated: true },
  { path: "/sponsors", label: "Sponsors & Cash", icon: HandCoins },
  { path: "/history", label: "Historial", icon: History },
];

function NavLink({ item }: { item: NavItem }) {
  const [location] = useLocation();
  const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
  return (
    <Link
      href={item.path}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : item.deprecated
            ? "text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.deprecated && (
        <span className={cn(
          "text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide",
          isActive
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
        )}>
          Deprecated
        </span>
      )}
    </Link>
  );
}

const ROLE_DEFINITIONS = [
  {
    org: "C2 LABS",
    label: "Editor",
    icon: Pencil,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    description: "Full access: edit all budget fields, add/delete items, toggle flags",
  },
  {
    org: "OPINNO",
    label: "Commenter",
    icon: MessageSquare,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    description: "View all data and add comments to descriptions and notes",
  },
  {
    org: "AURORA360",
    label: "Viewer",
    icon: Eye,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    description: "View-only access to all budget data and reports",
  },
];

function RolesInfoCard({ currentOrg }: { currentOrg: string }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("emtech-roles-dismissed") === "1"; } catch { return false; }
  });
  const [visible, setVisible] = useState(!dismissed);

  if (!visible) {
    return (
      <button
        onClick={() => { setVisible(true); try { localStorage.removeItem("emtech-roles-dismissed"); } catch {} }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
      >
        <Info className="w-3 h-3" />
        <span>User roles info</span>
      </button>
    );
  }

  return (
    <div className="mx-3 mb-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 overflow-hidden">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-sidebar-border/50">
        <span className="text-[10px] font-semibold text-sidebar-foreground/70 uppercase tracking-wider">User Roles</span>
        <button
          onClick={() => {
            setVisible(false);
            setDismissed(true);
            try { localStorage.setItem("emtech-roles-dismissed", "1"); } catch {}
          }}
          className="text-sidebar-foreground/30 hover:text-sidebar-foreground/60 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="px-2.5 py-2 space-y-1.5">
        {ROLE_DEFINITIONS.map(role => {
          const isCurrent = role.org === currentOrg;
          return (
            <div
              key={role.org}
              className={cn(
                "flex items-start gap-2 px-2 py-1.5 rounded-md border transition-colors",
                isCurrent
                  ? `${role.bgColor} ${role.borderColor}`
                  : "border-transparent"
              )}
            >
              <role.icon className={cn("w-3 h-3 mt-0.5 flex-shrink-0", role.color)} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-[10px] font-semibold", role.color)}>{role.label}</span>
                  <span className="text-[9px] text-sidebar-foreground/40">{role.org}</span>
                  {isCurrent && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-primary/20 text-primary font-medium">YOU</span>
                  )}
                </div>
                <p className="text-[9px] text-sidebar-foreground/50 leading-snug mt-0.5">{role.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { user, permissions, logout } = useAuth();

  return (
    <>
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
              <div className="flex flex-col leading-none">
                <span className="text-2xl font-extrabold tracking-tight text-white">
                  EmTech <span className="brand-gradient-text">AI</span>
                </span>
                <span className="text-[9px] text-sidebar-foreground/40 tracking-wider mt-1 uppercase">El Salvador 2026</span>
              </div>
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

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {user && <RolesInfoCard currentOrg={user.organization} />}

        {user && (
          <div className="px-3 py-3 border-t border-sidebar-border">
            <div className="flex items-center gap-2 px-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.organization}</p>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-medium border",
                    permissions.canEdit
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : permissions.canComment
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {permissions.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-2 py-1.5 w-full rounded-md text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        )}

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
  const { user } = useAuth();

  const currentPage = NAV_ITEMS.find(n =>
    n.path === "/" ? location === "/" : location.startsWith(n.path)
  ) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-[240px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-3.5 flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground hidden sm:inline">EmTech AI El Salvador 2026</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 hidden sm:inline" />
            <span className="font-semibold text-foreground">{currentPage.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {user.name} ({user.organization})
              </span>
            )}
            <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-muted border border-border">
              April 2026
            </span>
          </div>
        </header>

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

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={() => <Layout><DashboardPage /></Layout>} />
      <Route path="/budget" component={() => <Layout><BudgetPage /></Layout>} />
      <Route path="/travel/ground" component={() => <Layout><GroundTransportPage /></Layout>} />
      <Route path="/travel/aerial" component={() => <Layout><AerialTransportPage /></Layout>} />
      <Route path="/travel"><Redirect to="/travel/ground" /></Route>
      <Route path="/coctel" component={() => <Layout><CoctelPage /></Layout>} />
      <Route path="/bar-bebidas" component={() => <Layout><BarBebidasPage /></Layout>} />
      <Route path="/lunch" component={() => <Layout><LunchPage /></Layout>} />
      <Route path="/sponsors" component={() => <Layout><SponsorsPage /></Layout>} />
      <Route path="/agenda" component={() => <Layout><AgendaPage /></Layout>} />
      <Route path="/history" component={() => <Layout><HistoryPage /></Layout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthGate />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
