"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
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
  Send, 
  LogOut, 
  Smartphone,
  History,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "WhatsApp Session", url: "/dashboard/session", icon: Smartphone },
  { title: "Kontak & Grup", url: "/dashboard/contacts", icon: Users },
  { title: "Kirim Blast", url: "/dashboard/blast", icon: Send },
  { title: "Riwayat Kampanye", url: "/dashboard/campaigns", icon: History },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, initialize, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Loading state with Avisena branding
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-52 animate-pulse">
            <Image 
              src="/avisena-logo.png" 
              alt="Avisena Healthcare Group" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mt-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Memuat Portal Avisena...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <div className="flex w-full z-10 h-screen max-h-screen">
          <Sidebar className="border-r border-border bg-sidebar h-full shrink-0 flex flex-col overflow-hidden shadow-sm">
            {/* Sidebar Brand Header - Prominent Logo */}
            <SidebarHeader className="h-24 flex items-center justify-center px-6 border-b border-border bg-card">
              <div className="relative h-14 w-52">
                <Image 
                  src="/avisena-logo.png" 
                  alt="Avisena Healthcare Group" 
                  fill 
                  className="object-contain object-left"
                  priority
                />
              </div>
            </SidebarHeader>

            {/* Navigation Menu */}
            <SidebarContent className="flex-1 overflow-y-auto px-3 py-5">
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs uppercase font-bold tracking-wider text-muted-foreground px-3 mb-2.5">
                  Navigasi Utama
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2">
                    {navItems.map((item) => {
                      const isActive = pathname === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            isActive={isActive} 
                            tooltip={item.title} 
                            onClick={() => router.push(item.url)}
                            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                              isActive 
                                ? "!bg-[#00A389] !text-white font-semibold shadow-md shadow-[#00A389]/25 hover:!bg-[#008771] hover:!text-white [&_svg]:!text-white [&_*]:!text-white" 
                                : "text-slate-600 hover:bg-teal-50/70 hover:text-[#00A389] [&_svg]:text-slate-400 hover:[&_svg]:text-[#00A389] active:scale-[0.98]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </div>
                            {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            {/* Profile & Logout Footer */}
            <SidebarFooter className="p-4 border-t border-border bg-card">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/60 border border-border/50">
                  <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold text-foreground truncate">{user?.name}</span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      {user?.roleId === 1 ? 'Super Admin' : user?.roleId === 2 ? 'Admin' : 'Operator'}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full justify-center text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition-all font-medium h-9" 
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar Akun
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col w-full overflow-hidden bg-background relative z-20">
            <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center px-8 z-10 sticky top-0">
               <div className="font-bold text-lg text-foreground flex items-center gap-3">
                 <div className="w-2 h-5 bg-primary rounded-full"></div>
                 <span>{navItems.find(i => i.url === pathname)?.title || 'Dashboard'}</span>
               </div>
            </header>
            <main className="flex-1 overflow-auto p-8 relative">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
