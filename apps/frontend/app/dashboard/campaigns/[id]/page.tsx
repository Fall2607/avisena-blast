"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import api from "@/lib/axios";
import { useParams, useRouter } from "next/navigation";

export default function CampaignTrackingPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      // We can fetch campaign info and recipients
      const [campRes, recRes] = await Promise.all([
        api.get("/campaigns"), // Find from all (since backend doesn't have getCampaignById yet, but we can filter)
        api.get(`/campaigns/${id}/recipients`)
      ]);
      const currentCamp = campRes.data.find((c: any) => c.id === id);
      setCampaign(currentCamp);
      setRecipients(recRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
    // Auto refresh every 10 seconds if campaign is running
    const interval = setInterval(() => {
      if (id) fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const stats = {
    total: recipients.length,
    sent: recipients.filter(r => r.status === 'SENT').length,
    pending: recipients.filter(r => r.status === 'PENDING').length,
    failed: recipients.filter(r => r.status === 'FAILED').length,
  };

  const getRecipientStatus = (status: string) => {
    switch(status) {
      case 'SENT': return <span className="flex items-center text-green-600"><CheckCircle2 className="w-4 h-4 mr-1" /> Sent</span>;
      case 'FAILED': return <span className="flex items-center text-red-600"><XCircle className="w-4 h-4 mr-1" /> Failed</span>;
      case 'PENDING': return <span className="flex items-center text-orange-500"><Clock className="w-4 h-4 mr-1" /> Pending</span>;
      default: return <span>{status}</span>;
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Button variant="ghost" onClick={() => router.push('/dashboard/campaigns')} className="mb-2 -ml-4 hover:bg-transparent text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali ke Riwayat
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tracking: {campaign?.name || 'Loading...'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Pantau status pengiriman pesan secara real-time.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/50 dark:bg-white/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Berhasil Dikirim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Dalam Antrean</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Gagal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Rincian Pengiriman</CardTitle>
          <CardDescription>Daftar lengkap status pengiriman untuk setiap kontak.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Penerima</TableHead>
                  <TableHead>No. WhatsApp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waktu Kirim</TableHead>
                  <TableHead>Keterangan Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Tidak ada data penerima.
                    </TableCell>
                  </TableRow>
                ) : (
                  recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell className="font-medium">{recipient.contact?.name}</TableCell>
                      <TableCell>{recipient.contact?.phone}</TableCell>
                      <TableCell>{getRecipientStatus(recipient.status)}</TableCell>
                      <TableCell>
                        {recipient.sentAt ? new Date(recipient.sentAt).toLocaleString('id-ID') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-red-500 max-w-[200px] truncate">
                        {recipient.errorMessage || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
