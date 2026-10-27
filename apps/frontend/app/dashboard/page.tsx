"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { 
  Users, 
  Send, 
  Smartphone, 
  Clock, 
  Plus, 
  ArrowUpRight, 
  ShieldCheck, 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";

interface CampaignItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  template?: { name: string };
  _count?: { recipients: number };
}

interface SessionItem {
  id: string;
  sessionName: string;
  status: string;
  phoneNumber?: string | null;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [contactsRes, campaignsRes, sessionsRes] = await Promise.allSettled([
        api.get('/contacts'),
        api.get('/campaigns'),
        api.get('/wa/sessions')
      ]);

      if (contactsRes.status === 'fulfilled') {
        setTotalContacts(Array.isArray(contactsRes.value.data) ? contactsRes.value.data.length : 0);
      }
      if (campaignsRes.status === 'fulfilled') {
        setCampaigns(Array.isArray(campaignsRes.value.data) ? campaignsRes.value.data : []);
      }
      if (sessionsRes.status === 'fulfilled') {
        setSessions(Array.isArray(sessionsRes.value.data) ? sessionsRes.value.data : []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const activeConnectedSession = sessions.find(s => s.status === 'CONNECTED');
  const totalCampaigns = campaigns.length;
  const totalRecipients = campaigns.reduce((acc, curr) => acc + (curr._count?.recipients || 0), 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      
      {/* Top Welcome Banner with Avisena Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B428C] via-[#0E5198] to-[#00A389] p-8 text-white shadow-md">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-200" />
                Avisena Healthcare Portal
              </span>
              <span className="text-xs text-white/70">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Halo, {user?.name || 'Administrator'}! 👋
            </h1>
            <p className="text-white/80 text-sm max-w-xl">
              Pantau status koneksi WhatsApp, kelola daftar penerima pesan pasien, dan jalankan kampanye pengumuman resmi Avisena dengan aman.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link 
              href="/dashboard/blast" 
              className={cn(buttonVariants(), "bg-white text-[#0B428C] hover:bg-white/90 font-semibold shadow-sm text-sm")}
            >
              <Send className="w-4 h-4 mr-2 text-[#00A389]" />
              Kirim Blast Baru
            </Link>
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchDashboardData}
              disabled={loading}
              className="bg-white/15 border-white/20 text-white hover:bg-white/25 hover:text-white"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* WhatsApp Status Alert Banner if disconnected */}
      {!activeConnectedSession && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-200 text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">WhatsApp Belum Terhubung:</span> Tidak ada sesi WhatsApp yang aktif saat ini. Pesan broadcast tidak dapat dikirim sebelum Anda menghubungkan perangkat.
            </div>
          </div>
          <Link 
            href="/dashboard/session"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0 ml-4")}
          >
            Hubungkan WhatsApp
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Contacts */}
        <Card className="border border-border/80 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Kontak Terdaftar</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-primary flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {loading ? "..." : totalContacts.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Nomor pasien & staf di database
            </p>
          </CardContent>
        </Card>

        {/* WhatsApp Session Status */}
        <Card className="border border-border/80 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status WhatsApp</CardTitle>
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              activeConnectedSession 
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" 
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-600"
            )}>
              <Smartphone className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-2.5 h-2.5 rounded-full",
                activeConnectedSession ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              )} />
              <div className="text-xl font-bold tracking-tight text-foreground">
                {activeConnectedSession ? "TERHUBUNG" : "TERPUTUS"}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {activeConnectedSession 
                ? `${activeConnectedSession.sessionName} (${activeConnectedSession.phoneNumber || 'Aktif'})` 
                : "Perlu scan QR / pairing ulang"}
            </p>
          </CardContent>
        </Card>

        {/* Total Campaigns */}
        <Card className="border border-border/80 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Kampanye</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#10448E] flex items-center justify-center">
              <Send className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {loading ? "..." : totalCampaigns.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Riwayat blast yang dieksekusi
            </p>
          </CardContent>
        </Card>

        {/* Total Recipients */}
        <Card className="border border-border/80 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Target Penerima</CardTitle>
            <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#F28E2B] flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {loading ? "..." : totalRecipients.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Akumulasi pesan dalam antrean
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Main Content Grid: Recent Campaigns & Device Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Recent Campaigns Table (2 Cols) */}
        <Card className="lg:col-span-2 border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Kampanye Blast Terbaru</CardTitle>
              <CardDescription className="text-xs mt-0.5">Daftar pengiriman pesan massal terakhir yang dibuat.</CardDescription>
            </div>
            <Link 
              href="/dashboard/campaigns"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs text-primary hover:text-primary")}
            >
              Lihat Semua
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-primary" />
                Memuat riwayat kampanye...
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-3">
                <Send className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-sm">Belum ada kampanye blast yang dijalankan.</p>
                <Link 
                  href="/dashboard/blast"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Buat Kampanye Pertama
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {campaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{campaign.name}</span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          campaign.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                          campaign.status === 'RUNNING' ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" :
                          campaign.status === 'SCHEDULED' ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
                          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Template: <span className="text-foreground">{campaign.template?.name || "Kustom"}</span> &bull; {campaign._count?.recipients || 0} Penerima
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">{formatDate(campaign.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Sessions Quick Overview (1 Col) */}
        <Card className="border border-border/80 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Perangkat WhatsApp</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Sesi Baileys yang terhubung ke server.</CardDescription>
                </div>
                <Link 
                  href="/dashboard/session"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Kelola
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {sessions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <Smartphone className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  Belum ada sesi perangkat terdaftar.
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        session.status === 'CONNECTED' ? "bg-emerald-500" : "bg-rose-500"
                      )} />
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-tight">{session.sessionName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{session.phoneNumber || "Nomor belum tertaut"}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                      session.status === 'CONNECTED' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    )}>
                      {session.status}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </div>

          <div className="p-4 border-t border-border/50 bg-secondary/30 rounded-b-xl">
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Pengiriman pesan diproses otomatis menggunakan <strong>BullMQ Queue</strong> dengan jeda waktu anti-ban 5–15 detik per pesan.
              </span>
            </div>
          </div>
        </Card>

      </div>

    </div>
  );
}
