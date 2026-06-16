"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Send, CheckCircle2, XCircle, Smartphone, Clock, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuthStore();

  const stats = {
    totalContacts: 12345,
    totalCampaigns: 8,
    messagesSent: 1204,
    sessionStatus: "CONNECTED"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Ringkasan performa dan statistik WhatsApp Blast Anda.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Kontak</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalContacts.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp Status</CardTitle>
            <Smartphone className={cn("h-5 w-5", stats.sessionStatus === 'CONNECTED' ? 'text-emerald-500' : 'text-accent')} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-xl font-bold mt-1", stats.sessionStatus === 'CONNECTED' ? 'text-emerald-500' : 'text-accent')}>
              {stats.sessionStatus}
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Campaign</CardTitle>
            <Send className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCampaigns.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pesan Terkirim</CardTitle>
            <MessageSquare className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.messagesSent.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Statistik Pengiriman</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 h-[300px] flex items-center justify-center border-t bg-slate-50/50 dark:bg-slate-900/50 m-4 rounded-md">
            <span className="text-muted-foreground">Chart placeholder (Recharts)</span>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Campaign Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Promo Lebaran {i+1}</p>
                    <p className="text-xs text-muted-foreground">
                      Target: Pelanggan VIP
                    </p>
                  </div>
                  <div className="text-sm font-medium text-emerald-500">
                    Selesai
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
