"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Trash2, Edit, ArrowLeft, Users } from "lucide-react";
import api from "@/lib/axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useParams, useRouter } from "next/navigation";

export default function GroupContactsPage() {
  const { groupId } = useParams();
  const router = useRouter();
  
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  
  // Modal states
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    groupId: groupId
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resContacts, resGroups] = await Promise.all([
        api.get(`/contacts?groupId=${groupId}`),
        api.get("/contact-groups")
      ]);
      setContacts(resContacts.data);
      const currentGroup = resGroups.data.find((g: any) => g.id === groupId);
      setGroupInfo(currentGroup);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId]);

  const handleImport = async () => {
    if (!file) return;
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("groupId", groupId as string);
    try {
      await api.post("/contacts/import", uploadData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      fetchData();
      setFile(null);
      alert("Berhasil import kontak!");
    } catch (e) {
      console.error(e);
      alert("Gagal import kontak");
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n');
    let csvContent = 'name,phone\n';
    let validCount = 0;

    lines.forEach(line => {
      // Pemisah otomatis: tab, koma, atau titik koma
      const parts = line.split(/[\t,;]+/);
      if (parts.length >= 2) {
        const name = parts[0].trim().replace(/"/g, '""'); // escape nama
        let phone = parts[1].trim().replace(/\D/g, ''); // hanya ambil angka

        if (name && phone) {
          csvContent += `"${name}","${phone}"\n`;
          validCount++;
        }
      }
    });

    if (validCount === 0) {
      alert("Tidak ada data kontak yang valid ditemukan. Pastikan format: Nama, NomorTelepon");
      return;
    }

    try {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const virtualFile = new File([blob], 'bulk_import.csv', { type: 'text/csv' });

      const uploadData = new FormData();
      uploadData.append("file", virtualFile);
      uploadData.append("groupId", groupId as string);

      await api.post("/contacts/import", uploadData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setBulkOpen(false);
      setBulkText("");
      fetchData();
      alert(`Berhasil mengimpor ${validCount} kontak sekaligus!`);
    } catch (e) {
      console.error(e);
      alert("Gagal memproses import teks");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/contacts", { ...formData, groupId });
      setOpen(false);
      setFormData({ name: "", phone: "", email: "", groupId: groupId });
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Gagal menambah kontak");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kontak ini?")) return;
    try {
      await api.delete(`/contacts/${id}`);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Button variant="ghost" onClick={() => router.push('/dashboard/contacts')} className="mb-2 -ml-4 hover:bg-transparent text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali ke Daftar Grup
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            {groupInfo?.name || 'Loading...'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {groupInfo?.description || 'Kelola daftar kontak untuk grup ini.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Input 
            type="file" 
            accept=".csv, .xlsx" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full md:w-[200px]"
          />
          <Button variant="outline" onClick={handleImport} disabled={!file} className="flex-1 md:flex-none">
            <Upload className="w-4 h-4 mr-2" />
            File CSV
          </Button>

          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger render={<Button variant="secondary" className="flex-1 md:flex-none" />}>
              <Users className="w-4 h-4 mr-2" />
              Import Teks
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Import Kontak via Teks</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBulkSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkText">Paste Data Kontak Anda (Satu per baris)</Label>
                  <p className="text-xs text-muted-foreground">
                    Format: <strong>Nama, Nomor WhatsApp</strong>. Pemisah bisa menggunakan Koma (,), Tab (dari Excel), atau Titik Koma (;).
                  </p>
                  <textarea
                    id="bulkText"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    required
                    placeholder="Budi Santoso, 628123456789&#10;Siti Aminah, 085712345678&#10;Agus; 08122334455"
                    className="flex min-h-[250px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>Batal</Button>
                  <Button type="submit">Proses & Simpan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="flex-1 md:flex-none" />}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Manual
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Kontak ke {groupInfo?.name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Kontak</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">No. WhatsApp</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    required 
                    placeholder="Contoh: 628123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Opsional)</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Simpan Kontak</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Daftar Anggota Grup</CardTitle>
          <CardDescription>Total {contacts.length} kontak di dalam grup ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>No. WhatsApp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[100px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      Loading data...
                    </TableCell>
                  </TableRow>
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      Tidak ada kontak di grup ini. Silakan tambah atau import data.
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.phone}</TableCell>
                      <TableCell>{contact.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(contact.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
