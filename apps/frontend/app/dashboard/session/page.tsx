"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Smartphone, RefreshCw, Trash2, CheckCircle2, Key, Plus, WifiOff, Activity } from "lucide-react";
import api from "@/lib/axios";
import Cookies from 'js-cookie';
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  sessionName: string;
  status: string;
  phoneNumber?: string | null;
  createdAt: string;
}

export default function SessionPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Session Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [usePairingCode, setUsePairingCode] = useState(false);
  const [inputPhoneNumber, setInputPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Connection Modal State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [activeConnectingSession, setActiveConnectingSession] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/wa/sessions');
      setSessions(res.data);
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName) return;
    setIsSubmitting(true);
    try {
      await api.post("/wa/session", { 
        sessionName: newSessionName,
        phoneNumber: usePairingCode ? inputPhoneNumber : undefined
      });
      setIsAddModalOpen(false);
      setNewSessionName("");
      setInputPhoneNumber("");
      setUsePairingCode(false);
      
      // Immediately open connection modal for the new session
      setActiveConnectingSession(newSessionName);
      setIsConnectModalOpen(true);
      startQrStream(newSessionName);
      fetchSessions();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectExisting = (sessionName: string) => {
    setActiveConnectingSession(sessionName);
    setIsConnectModalOpen(true);
    startQrStream(sessionName);
  };

  const startQrStream = (name: string) => {
    setQrCode(null);
    const token = Cookies.get('token');
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/wa/session/${name}/qr?token=${token}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.qr) {
        setQrCode(data.qr);
      }
      if (data.connected) {
        eventSource.close();
        setIsConnectModalOpen(false);
        setActiveConnectingSession(null);
        fetchSessions(); // Refresh list to show connected status
      }
      if (data.error) {
        eventSource.close();
        setIsConnectModalOpen(false);
        fetchSessions();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
  };

  const disconnectSession = async (sessionName: string) => {
    if (!confirm(`Anda yakin ingin menghapus perangkat "${sessionName}"?\nIni akan memutuskan koneksi WhatsApp yang tertaut.`)) return;
    try {
      await api.delete(`/wa/session/${sessionName}`);
      fetchSessions();
    } catch (error) {
      console.error(error);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Sessions</h1>
          <p className="text-muted-foreground mt-1">Kelola daftar nomor WhatsApp yang terhubung ke sistem.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Perangkat
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed bg-transparent shadow-none">
          <Smartphone className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-bold">Belum ada sesi aktif</h3>
          <p className="text-muted-foreground max-w-sm mt-2 mb-6">
            Anda belum menghubungkan akun WhatsApp mana pun. Klik Tambah Perangkat untuk memulai.
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Perangkat
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card key={session.id} className="flex flex-col">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{session.sessionName}</CardTitle>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <Smartphone className="w-3.5 h-3.5" />
                      {session.phoneNumber || "Belum ada nomor"}
                    </div>
                  </div>
                  <div className={cn(
                    "px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider flex items-center gap-1.5 uppercase",
                    session.status === 'CONNECTED' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    session.status === 'CONNECTING' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                  )}>
                    {session.status === 'CONNECTED' && <CheckCircle2 className="w-3 h-3" />}
                    {session.status === 'CONNECTING' && <RefreshCw className="w-3 h-3 animate-spin" />}
                    {session.status === 'DISCONNECTED' && <WifiOff className="w-3 h-3" />}
                    {session.status}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 py-4 text-sm space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4"/> Dibuat pada</span>
                   <span className="font-medium text-right">{formatTime(session.createdAt)}</span>
                 </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-border/50 flex gap-2 justify-end">
                 {session.status !== 'CONNECTED' && (
                   <Button variant="outline" size="sm" onClick={() => handleConnectExisting(session.sessionName)} className="flex-1">
                     <RefreshCw className="w-3.5 h-3.5 mr-2" />
                     Reconnect
                   </Button>
                 )}
                 <Button variant="destructive" size="sm" onClick={() => disconnectSession(session.sessionName)} className={session.status === 'CONNECTED' ? "flex-1" : ""}>
                   <Trash2 className="w-4 h-4 mr-2" />
                   {session.status === 'CONNECTED' ? "Disconnect & Delete" : "Hapus"}
                 </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Device Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Perangkat WhatsApp</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSession} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="sessionName">Nama Sesi (Unik)</Label>
              <Input 
                id="sessionName" 
                placeholder="Contoh: CS-Pusat" 
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value.replace(/\s+/g, '-'))}
                required
              />
              <p className="text-xs text-muted-foreground">Tidak boleh ada spasi (akan diubah otomatis menjadi strip).</p>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="usePairingCode" 
                  checked={usePairingCode}
                  onChange={(e) => setUsePairingCode(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                />
                <Label htmlFor="usePairingCode">Gunakan Kode Pairing (Link with Phone Number)</Label>
              </div>
            </div>
            {usePairingCode && (
              <div className="space-y-2">
                <Label htmlFor="inputPhoneNumber">Nomor Telepon WA</Label>
                <Input 
                  id="inputPhoneNumber" 
                  placeholder="Contoh: 6281234567890" 
                  value={inputPhoneNumber}
                  onChange={(e) => setInputPhoneNumber(e.target.value)}
                  required={usePairingCode}
                />
                <p className="text-xs text-muted-foreground">Awali dengan 62 tanpa + atau spasi.</p>
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={!newSessionName || isSubmitting}>
                {isSubmitting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Buat Sesi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Connection / QR Stream Modal */}
      <Dialog open={isConnectModalOpen} onOpenChange={(open) => {
        setIsConnectModalOpen(open);
        if (!open) fetchSessions(); // refresh on close
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Menghubungkan: {activeConnectingSession}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
            {qrCode ? (
              qrCode.startsWith('PAIRING_CODE:') ? (
                <div className="text-center space-y-6">
                  <h3 className="text-lg font-medium text-primary flex items-center justify-center gap-2">
                    <Key className="w-5 h-5" />
                    Masukkan Kode Ini di HP Anda
                  </h3>
                  <div className="bg-surface p-6 rounded-xl border border-border shadow-sm inline-block">
                    <span className="text-4xl font-extrabold tracking-[0.25em] text-foreground">
                      {qrCode.split(':')[1]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Buka WhatsApp {'>'} Linked Devices {'>'} Link with phone number
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-medium">Scan QR Code</h3>
                  <div className="bg-white p-4 rounded-lg shadow-sm border inline-block">
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Buka WhatsApp {'>'} Linked Devices {'>'} Link a Device
                  </p>
                </div>
              )
            ) : (
              <div className="text-center space-y-4 text-muted-foreground">
                <RefreshCw className="w-10 h-10 animate-spin mx-auto text-primary" />
                <p>Meminta kode koneksi dari WhatsApp...</p>
                <p className="text-xs">Tunggu sebentar, sedang menginisialisasi sesi di server.</p>
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-center">
             <Button variant="outline" onClick={() => setIsConnectModalOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
