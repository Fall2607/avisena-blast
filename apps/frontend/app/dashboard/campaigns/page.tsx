"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Clock } from "lucide-react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";

export default function CampaignHistoryPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.get("/campaigns");
      setCampaigns(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'RUNNING': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Running</span>;
      case 'COMPLETED': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Completed</span>;
      case 'SCHEDULED': return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Scheduled</span>;
      case 'CANCELLED': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Cancelled</span>;
      case 'DRAFT': return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Draft</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Riwayat Blast</h1>
          <p className="text-muted-foreground">Pantau status dan riwayat pengiriman campaign Anda.</p>
        </div>
        <Button onClick={fetchCampaigns} variant="outline">
          Refresh Data
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Daftar Campaign</CardTitle>
          <CardDescription>Menampilkan semua blast campaign yang pernah dibuat.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jadwal Kirim</TableHead>
                  <TableHead className="text-center">Total Target</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Loading data...
                    </TableCell>
                  </TableRow>
                ) : campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Belum ada riwayat campaign.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((camp) => (
                    <TableRow key={camp.id}>
                      <TableCell className="font-medium">{camp.name}</TableCell>
                      <TableCell>{getStatusBadge(camp.status)}</TableCell>
                      <TableCell>
                        {camp.scheduledAt ? (
                          <div className="flex items-center text-sm">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(camp.scheduledAt).toLocaleString('id-ID')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Langsung Kirim</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {camp._count?.recipients || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => router.push(`/dashboard/campaigns/${camp.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Tracking
                        </Button>
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
