"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Send, 
  LogOut, 
  Smartphone,
  Menu,
  History
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "WhatsApp Session", url: "/dashboard/session", icon: Smartphone },
  { title: "Group Management", url: "/dashboard/contacts", icon: Users },
  { title: "Blast & Scheduler", url: "/dashboard/blast", icon: Send },
  { title: "Riwayat Blast", url: "/dashboard/campaigns", icon: History },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, initialize, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated && !localStorage.getItem('user')) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated && !user) {
    return null; // Or a loading spinner
  }

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full bg-background text-foreground overflow-hidden">
        {/* Ambient Lights Background */}
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px] pointer-events-none animate-ambient-1" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-accent/30 blur-[150px] pointer-events-none animate-ambient-2" />

        <div className="flex w-full z-10 p-2 md:p-4 gap-4 h-screen max-h-screen">
          <Sidebar className="rounded-2xl glass-panel border-white/10 shadow-none h-full shrink-0 flex flex-col overflow-hidden">
            <SidebarHeader className="h-16 flex items-center px-6 border-b border-white/10">
              <div className="flex items-center gap-2 font-bold text-xl text-primary drop-shadow-sm">
                <MessageSquare className="w-6 h-6" />
                <span>WA Blast</span>
              </div>
            </SidebarHeader>
            <SidebarContent className="flex-1 overflow-y-auto">
              <SidebarGroup>
                <SidebarGroupLabel className="text-foreground/50">Menu</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2">
                    {navItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          isActive={pathname === item.url} 
                          tooltip={item.title} 
                          onClick={() => router.push(item.url)}
                          className={pathname === item.url ? "bg-white/20 dark:bg-white/10 text-primary font-semibold shadow-sm hover:scale-[1.02] transition-all duration-300 relative overflow-hidden before:absolute before:left-0 before:top-1/4 before:bottom-1/4 before:w-1.5 before:bg-primary before:rounded-r-full" : "hover:bg-white/10 hover:text-foreground hover:scale-[1.02] active:scale-95 transition-all duration-300 text-sidebar-foreground"}
                        >
                          <item.icon className={pathname === item.url ? "text-primary drop-shadow-md" : "text-sidebar-foreground"} />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-white/10">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-inner">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {user?.roleId === 1 ? 'Super Admin' : user?.roleId === 2 ? 'Admin' : 'Operator'}
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive border-white/10 hover:bg-destructive/10 glass-panel" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>

          <div className="flex-1 flex flex-col w-full overflow-hidden rounded-2xl glass-panel relative z-20">
            <header className="h-16 border-b border-white/10 bg-white/5 dark:bg-black/5 backdrop-blur-md flex items-center px-6 z-10 sticky top-0">
               <div className="font-bold text-xl text-foreground flex items-center gap-3">
                 <div className="w-1.5 h-5 bg-primary rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                 {navItems.find(i => i.url === pathname)?.title || 'Dashboard'}
               </div>
            </header>
            <main className="flex-1 overflow-auto p-6 relative">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
