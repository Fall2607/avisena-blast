"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Clock, Bold, Italic, Strikethrough, Code, User, Calendar, Mail } from "lucide-react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";

export default function BlastPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [groupId, setGroupId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [scheduledAt, setScheduledAt] = useState("");
  
  const [groups, setGroups] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resGroups, resSessions] = await Promise.all([
          api.get("/contact-groups"),
          api.get("/wa/sessions")
        ]);
        setGroups(resGroups.data);
        setSessions(resSessions.data.filter((s: any) => s.status === "CONNECTED"));
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('message') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + before + text.substring(start, end) + after + text.substring(end);
    setMessage(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleBlast = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Ekstrak variabel dari pesan (contoh: {{nama}} -> nama)
      const matches = message.match(/{{(.*?)}}/g);
      const variables = matches ? matches.map(v => v.replace(/[{}]/g, '')) : [];

      // 2. Buat template secara diam-diam di background
      const templateRes = await api.post("/templates", {
        name: `Campaign - ${name}`,
        message: message,
        variables: variables
      });
      const templateId = templateRes.data.id;

      // 3. Buat Campaign menggunakan templateId tersebut
      const campaignRes = await api.post("/campaigns", {
        name,
        templateId,
        groupId,
        sessionName,
        minDelaySec: minDelay,
        maxDelaySec: maxDelay,
        scheduledAt: scheduledAt || null
      });
      
      // Redirect ke halaman tracking
      router.push(`/dashboard/campaigns/${campaignRes.data.campaignId}`);
    } catch (error: any) {
      alert(error.response?.data?.error || "Terjadi kesalahan saat membuat campaign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Blast & Scheduler</h1>
        <p className="text-muted-foreground">Buat campaign blast baru atau jadwalkan untuk masa depan.</p>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Formulir Campaign Blast</CardTitle>
          <CardDescription>Pilih target, atur pesan, dan tentukan delay untuk menghindari blokir WhatsApp.</CardDescription>
        </CardHeader>
        <form onSubmit={handleBlast}>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Campaign</Label>
                <Input 
                  id="name" 
                  placeholder="Promo Spesial Akhir Tahun" 
                  value={name} onChange={(e) => setName(e.target.value)} required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session">WhatsApp Sender (Connected)</Label>
                <select 
                  id="session" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={sessionName} onChange={(e) => setSessionName(e.target.value)} required
                >
                  <option value="">-- Pilih Sesi --</option>
                  {sessions.map(s => (
                    <option key={s.sessionName} value={s.sessionName}>{s.sessionName} ({s.phoneNumber})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="group">Grup Target</Label>
                <select 
                  id="group" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={groupId} onChange={(e) => setGroupId(e.target.value)} required
                >
                  <option value="">-- Pilih Grup Target --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g._count?.contacts} Kontak)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="message">Isi Pesan</Label>
                <div className="border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => insertText('*', '*')} title="Bold">
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => insertText('_', '_')} title="Italic">
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => insertText('~', '~')} title="Strikethrough">
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => insertText('```', '```')} title="Monospace">
                      <Code className="h-4 w-4" />
                    </Button>
                    <div className="w-[1px] h-4 bg-border mx-1"></div>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-white dark:bg-background" onClick={() => insertText('{{nama}}')}>
                      <User className="h-3 w-3 mr-1" /> Nama
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-white dark:bg-background" onClick={() => insertText('{{tanggal}}')}>
                      <Calendar className="h-3 w-3 mr-1" /> Tanggal
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs bg-white dark:bg-background" onClick={() => insertText('{{email}}')}>
                      <Mail className="h-3 w-3 mr-1" /> Email
                    </Button>
                  </div>
                  <textarea 
                    id="message" 
                    rows={6}
                    className="flex min-h-[120px] w-full bg-background px-3 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    placeholder="Halo {{nama}}, ini adalah pesan promosi kami hari ini {{tanggal}}..." 
                    value={message} onChange={(e) => setMessage(e.target.value)} required 
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6 grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Anti-Spam Delay Setting</h3>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="minDelay">Min Delay (detik)</Label>
                    <Input id="minDelay" type="number" min="1" value={minDelay} onChange={(e) => setMinDelay(parseInt(e.target.value))} required />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="maxDelay">Max Delay (detik)</Label>
                    <Input id="maxDelay" type="number" min={minDelay} value={maxDelay} onChange={(e) => setMaxDelay(parseInt(e.target.value))} required />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Pesan akan dikirim dengan jeda waktu acak di antara min dan max delay.</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Scheduler (Opsional)</h3>
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Jadwal Kirim (Kosongkan untuk kirim sekarang)</Label>
                  <Input 
                    id="scheduledAt" 
                    type="datetime-local" 
                    value={scheduledAt} 
                    onChange={(e) => setScheduledAt(e.target.value)} 
                  />
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-6">
            <Button type="button" variant="outline" onClick={() => {
              setName(""); setMessage(""); setScheduledAt(""); setGroupId(""); setSessionName("");
            }}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {scheduledAt ? <Clock className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {scheduledAt ? 'Jadwalkan Blast' : 'Mulai Blast Sekarang'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
