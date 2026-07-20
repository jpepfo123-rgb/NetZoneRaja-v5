import * as React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  PhoneCall, 
  Users, 
  BarChart3, 
  LogOut, 
  UserCircle,
  Menu,
  ShieldAlert,
  Kanban,
  Target,
  Receipt,
  CalendarDays
} from "lucide-react";
import { clearToken } from "@/lib/auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Button } from "@/components/ui/button";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground text-sm font-medium">Loading CRM...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    clearToken();
    setLocation("/");
  };

  const navItems = [
    { href: "/dashboard",  label: "Dashboard",    icon: LayoutDashboard },
    { href: "/calls",      label: "Call History", icon: PhoneCall },
    { href: "/customers",  label: "Customers",    icon: Users },
    { href: "/pipeline",   label: "Pipeline",     icon: Kanban },
    { href: "/targets",    label: "Targets",      icon: Target },
    { href: "/expenses",   label: "Expenses",     icon: Receipt },
    { href: "/attendance", label: "Attendance",   icon: CalendarDays },
    { href: "/reports",    label: "Reports",      icon: BarChart3 },
  ];

  if (user.role === "admin") {
    navItems.push({ href: "/agents",     label: "Agents",     icon: ShieldAlert });
    navItems.push({ href: "/categories", label: "Categories", icon: BarChart3 });
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-muted/20">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b">
        <div className="font-bold text-lg flex items-center gap-2 text-primary">
          <PhoneCall className="w-5 h-5" />
          Net Zone CRM
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        ${mobileOpen ? "block" : "hidden"} 
        md:block w-full md:w-64 bg-card border-r flex flex-col
        fixed md:sticky top-0 h-[100dvh] z-40
      `}>
        <div className="p-6 hidden md:flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
          <PhoneCall className="w-6 h-6" />
          Net Zone CRM
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href) && (item.href !== "/" || location === "/");
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium
                  ${isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                `}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto bg-card/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <UserCircle className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{user.name}</span>
              <span className="text-xs text-muted-foreground mt-1 capitalize">{user.role}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive" 
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
