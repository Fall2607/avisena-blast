"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Bot, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  MessageSquare, 
  RefreshCw,
  Send,
  Smartphone,
  ToggleLeft,
  ToggleRight,
  Tag,
  Check,
  Globe,
  CornerDownLeft,
  ExternalLink,
  PhoneCall,
  MousePointerClick,
  RotateCcw,
  ArrowRight,
  List,
  Menu,
  ChevronDown,
  X,
  Layers
} from "lucide-react";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";

interface BotSubOption {
  id: string;
  label: string;
  description?: string;
  replyMessage: string;
}

interface BotButton {
  id: string;
  label: string;
  description?: string;
  type: "QUICK_REPLY" | "URL" | "CALL" | "LIST_ITEM";
  actionType: "DIRECT_REPLY" | "LINK_RULE";
  replyMessage: string;
  includeBackToMenu?: boolean;
  value?: string;
  hasSubMenu?: boolean;
  subOptions?: BotSubOption[];
}

interface BotRule {
  id: string;
  name: string;
  triggerType: "EXACT" | "CONTAINS" | "FALLBACK";
  keywords: string;
  response: string;
  buttons?: string | null;
  isActive: boolean;
  sessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionItem {
  id: string;
  sessionName: string;
  status: string;
  phoneNumber?: string | null;
}

interface ChatMessage {
  id: string;
  sender: "patient" | "bot";
  text: string;
  buttons?: BotButton[];
  isListMenu?: boolean;
  time: string;
}

export default function BotPage() {
  const [rules, setRules] = useState<BotRule[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterSession, setFilterSession] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<"EXACT" | "CONTAINS" | "FALLBACK">("EXACT");
  const [keywords, setKeywords] = useState("");
  const [response, setResponse] = useState("");
  const [buttonsList, setButtonsList] = useState<BotButton[]>([]);
  const [menuFormat, setMenuFormat] = useState<"BUTTONS" | "LIST">("LIST");
  const [isActive, setIsActive] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);

  // Multi-Turn Interactive WhatsApp Simulation Thread inside Modal
  const [simulatedChatHistory, setSimulatedChatHistory] = useState<ChatMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [isListSheetOpen, setIsListSheetOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, sessionsRes] = await Promise.allSettled([
        api.get('/bot'),
        api.get('/wa/sessions')
      ]);

      if (rulesRes.status === 'fulfilled') {
        setRules(Array.isArray(rulesRes.value.data) ? rulesRes.value.data : []);
      }
      if (sessionsRes.status === 'fulfilled') {
        setSessions(Array.isArray(sessionsRes.value.data) ? sessionsRes.value.data : []);
      }
    } catch (err) {
      console.error("Failed to fetch bot data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to format menu options into luxury numbered WhatsApp text message (100% Baileys & WhatsApp compliant)
  const formatBotMessage = (text: string, btns: any[], isSubMenu: boolean = false) => {
    if (!btns || btns.length === 0) {
      if (!text.includes('0') && !text.toLowerCase().includes('menu')) {
        return `${text}\n\n*Ketik 0 atau MENU untuk kembali ke menu utama.*`;
      }
      return text;
    }
    
    if (btns.length === 1 && (btns[0].value === 'menu' || btns[0].value === '0' || btns[0].label.toLowerCase().includes('menu'))) {
      if (!text.toLowerCase().includes('0') && !text.toLowerCase().includes('menu')) {
        return `${text}\n\n*Ketik 0 atau MENU untuk kembali ke menu utama.*`;
      }
      return text;
    }

    // Standard numbering without emojis
    if (!text.includes('1️⃣') && !text.includes('1.')) {
      const formattedItems = btns.map((btn, idx) => {
        const num = `${idx + 1}.`;
        const label = (btn.label || `Pilihan ${idx + 1}`).replace(/^\d+[\.\s\-]+/, '').trim();
        const desc = btn.description ? `\n   _${btn.description}_` : '';
        return `${num} *${label}*${desc}`;
      }).join('\n\n');

      const backGuide = isSubMenu
        ? `0. *Kembali ke Menu Utama*\n\n*Balas dengan angka (1-${btns.length}) atau ketik 0 untuk kembali ke menu utama.*`
        : `0. *Kembali ke Menu Utama*\n\n*Balas dengan angka (1-${btns.length}) atau ketik 0 untuk menu utama.*`;

      return `${text}\n\n${formattedItems}\n\n${backGuide}`;
    }
    return text;
  };

  // Reset or initialize the phone mockup chat simulation
  const resetChatSimulation = (
    initPatientText?: string, 
    initResponseText?: string, 
    initButtons?: BotButton[]
  ) => {
    const patientText = initPatientText !== undefined ? initPatientText : (keywords.split(',')[0]?.trim() || "halo");
    const botText = initResponseText !== undefined ? initResponseText : (response || "Halo! Ada yang bisa kami bantu?");
    const activeButtons = initButtons !== undefined ? initButtons : buttonsList.filter(b => b.label.trim());
    const formattedBotText = formatBotMessage(botText, activeButtons, false);

    setIsListSheetOpen(false);
    setSimulatedChatHistory([
      {
        id: "msg-1",
        sender: "patient",
        text: patientText,
        time: "10:45"
      },
      {
        id: "msg-2",
        sender: "bot",
        text: formattedBotText,
        buttons: activeButtons,
        isListMenu: false,
        time: "10:45"
      }
    ]);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setTriggerType("EXACT");
    setKeywords("");
    setResponse("");
    setButtonsList([]);
    setMenuFormat("LIST");
    setIsActive(true);
    setSelectedSessionId("ALL");
    setTestInput("");
    resetChatSimulation("halo", "(Ketik pesan pembuka bot di form sebelah kiri...)", []);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: BotRule) => {
    setEditingId(rule.id);
    setName(rule.name);
    setTriggerType(rule.triggerType);
    setKeywords(rule.keywords);
    setResponse(rule.response);
    setIsActive(rule.isActive);
    setSelectedSessionId(rule.sessionId || "ALL");

    let parsedBtns: any[] = [];
    if (rule.buttons) {
      try {
        parsedBtns = typeof rule.buttons === 'string' ? JSON.parse(rule.buttons) : rule.buttons;
      } catch {
        parsedBtns = [];
      }
    }

    const normalizedBtns: BotButton[] = Array.isArray(parsedBtns)
      ? parsedBtns.map(b => ({
          id: b.id || Math.random().toString(36).substring(2, 9),
          label: b.label || "",
          description: b.description || "",
          type: b.type || (b.description ? "LIST_ITEM" : "QUICK_REPLY"),
          actionType: b.actionType || "DIRECT_REPLY",
          replyMessage: b.replyMessage || "",
          includeBackToMenu: b.includeBackToMenu !== undefined ? b.includeBackToMenu : true,
          value: b.value || "",
          hasSubMenu: !!b.hasSubMenu || (Array.isArray(b.subOptions) && b.subOptions.length > 0),
          subOptions: Array.isArray(b.subOptions) ? b.subOptions : []
        }))
      : [];

    setMenuFormat("LIST");
    setButtonsList(normalizedBtns);
    setTestInput("");
    const firstKeyword = rule.keywords.split(',')[0]?.trim() || "halo";
    resetChatSimulation(firstKeyword, rule.response, normalizedBtns);
    setIsModalOpen(true);
  };

  const handleAddButton = () => {
    if (buttonsList.length >= 10) return;
    const newBtn: BotButton = {
      id: Math.random().toString(36).substring(2, 9),
      label: "",
      description: "",
      type: "LIST_ITEM",
      actionType: "DIRECT_REPLY",
      replyMessage: "",
      includeBackToMenu: true,
      value: `${buttonsList.length + 1}`,
      hasSubMenu: false,
      subOptions: []
    };
    const updated = [...buttonsList, newBtn];
    setButtonsList(updated);
    // Live update mockup preview
    const activeBtns = updated.filter(b => b.label.trim());
    if (activeBtns.length > 0) {
      setSimulatedChatHistory(prev => prev.map((msg, idx) => idx === 1 ? { 
        ...msg, 
        text: formatBotMessage(response || "Halo! Silakan pilih layanan:", activeBtns, false),
        buttons: activeBtns
      } : msg));
    }
  };

  const handleRemoveButton = (index: number) => {
    const updated = buttonsList.filter((_, i) => i !== index);
    setButtonsList(updated);
    const activeBtns = updated.filter(b => b.label.trim());
    setSimulatedChatHistory(prev => prev.map((msg, idx) => idx === 1 ? { 
      ...msg, 
      text: formatBotMessage(response || "Halo! Silakan pilih layanan:", activeBtns, false),
      buttons: activeBtns
    } : msg));
  };

  const handleUpdateButton = (index: number, field: keyof BotButton, val: any) => {
    const updated = buttonsList.map((btn, i) => i === index ? { ...btn, [field]: val } : btn);
    setButtonsList(updated);
    if (field === 'label' || field === 'description' || field === 'hasSubMenu' || field === 'subOptions') {
      const activeBtns = updated.filter(b => b.label.trim());
      setSimulatedChatHistory(prev => prev.map((msg, idx) => idx === 1 ? { 
        ...msg, 
        text: formatBotMessage(response || "Halo! Silakan pilih layanan:", activeBtns, false),
        buttons: activeBtns
      } : msg));
    }
  };

  // Load the comprehensive 8 hospital menu list preset with nested poliklinik sub-options
  const handleLoadHospital8MenuPreset = () => {
    const presetItems: BotButton[] = [
      {
        id: "opt_1",
        label: "1. Jadwal Praktik Dokter",
        description: "Pilihan jadwal spesialis anak, penyakit dalam, obgyn, dll.",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `*Jadwal Praktik Dokter RS Avisena:*\nSilakan pilih poliklinik spesialis yang ingin Anda tanyakan:`,
        includeBackToMenu: true,
        value: "1",
        hasSubMenu: true,
        subOptions: [
          {
            id: "sub_1",
            label: "Poli Anak & Tumbuh Kembang",
            description: "dr. Ahmad, Sp.A & dr. Dian, Sp.A",
            replyMessage: `*Jadwal Praktik Poli Anak RS Avisena:*\n\n• dr. Ahmad, Sp.A: Senin - Jumat (08.00 - 12.00 WIB)\n• dr. Dian, Sp.A: Selasa, Kamis, Sabtu (13.00 - 16.00 WIB)\n\nLokasi: Poliklinik Lantai 2, Gedung Rawat Jalan.`
          },
          {
            id: "sub_2",
            label: "Poli Penyakit Dalam (Internis)",
            description: "dr. Siti, Sp.PD & dr. Hendra, Sp.PD",
            replyMessage: `*Jadwal Praktik Poli Penyakit Dalam:*\n\n• dr. Siti, Sp.PD: Senin - Sabtu (09.00 - 14.00 WIB)\n• dr. Hendra, Sp.PD: Senin, Rabu, Jumat (16.00 - 19.00 WIB)\n\nLokasi: Poliklinik Lantai 1, Gedung Utama.`
          },
          {
            id: "sub_3",
            label: "Poli Kandungan & Kebidanan (Obgyn)",
            description: "dr. Maya, Sp.OG (USG 4D)",
            replyMessage: `*Jadwal Praktik Poli Kandungan (Obgyn):*\n\n• dr. Maya, Sp.OG: Senin - Kamis (10.00 - 15.00 WIB)\n• dr. Reza, Sp.OG: Jumat & Sabtu (09.00 - 13.00 WIB)\n\nLayanan: Pemeriksaan Kehamilan, USG 4D, & Konsultasi Fertilitas.`
          },
          {
            id: "sub_4",
            label: "Poli Gigi & Bedah Mulut",
            description: "drg. Budi & drg. Rina, Sp.BM",
            replyMessage: `*Jadwal Praktik Poli Gigi & Bedah Mulut:*\n\n• drg. Budi: Senin - Jumat (13.00 - 17.00 WIB)\n• drg. Rina, Sp.BM: Selasa & Kamis (17.00 - 20.00 WIB)\n\nLayanan: Tambal Gigi, Scaling, Cabut Gigi Bungsu, & Ortodonti.`
          }
        ]
      },
      {
        id: "opt_2",
        label: "2. Pendaftaran & Antrean Klinik",
        description: "Panduan ambil nomor antrean poli & cek kuota dokter",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `*Pendaftaran & Antrean Klinik Avisena:*\n\n1. Pendaftaran online dibuka H-1 pemeriksaan melalui portal website resmi kami.\n2. Siapkan nomor RM (Rekam Medis) atau NIK KTP Anda.\n3. Kuota poliklinik dibuka setiap hari pukul 06.00 WIB.\n4. Simpan nomor barcode antrean digital Anda untuk konfirmasi di mesin check-in RS.`,
        includeBackToMenu: true,
        value: "2"
      },
      {
        id: "opt_3",
        label: "3. Ketersediaan Kamar Rawat Inap",
        description: "Informasi Bed Monitoring, kapasitas kelas & tarif",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `*Monitoring Kamar Rawat Inap RS Avisena (Update Hari Ini):*\n\n• VVIP: 2 Bed Tersedia (Rp 1.200.000/hari)\n• VIP: 5 Bed Tersedia (Rp 850.000/hari)\n• Kelas 1: 8 Bed Tersedia (Rp 500.000/hari)\n• Kelas 2: 12 Bed Tersedia (Rp 350.000/hari)\n• Kelas 3: 15 Bed Tersedia (Tercover BPJS Kesehatan)\n• ICU / NICU: 3 Bed Siap Pakai`,
        includeBackToMenu: true,
        value: "3"
      },
      {
        id: "opt_4",
        label: "4. Jam Besuk Pasien",
        description: "Aturan, tata tertib & jadwal kunjungan rawat inap",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `*Jadwal & Tata Tertib Jam Besuk Pasien:*\n\n• Siang: 11.00 - 13.00 WIB\n• Sore: 17.00 - 19.00 WIB\n\n*Tata Tertib Kunjungan:*\n- Maksimal 2 orang pengunjung secara bergantian.\n- Anak di bawah usia 12 tahun tidak diperkenankan masuk ke area ruang perawatan demi keselamatan kesehatan.`,
        includeBackToMenu: true,
        value: "4"
      },
      {
        id: "opt_5",
        label: "5. Informasi BPJS & Asuransi",
        description: "Alur rujukan, syarat berkas BPJS & asuransi rekanan",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `*Informasi BPJS Kesehatan & Asuransi Rekanan:*\n\n*Syarat Berkas Pasien BPJS:*\n1. Surat Rujukan Faskes 1 (Puskesmas/Klinik) yang masih aktif.\n2. Kartu BPJS & KTP asli.\n3. Kartu Berobat RS Avisena.\n\n*Asuransi Rekanan AdMedika:* Prudential, Allianz, Manulife, Sinarmas, Astra Life, Mandiri Inhealth, dll.`,
        includeBackToMenu: true,
        value: "5"
      },
      {
        id: "opt_6",
        label: "6. Layanan & Fasilitas Medis",
        description: "Operasional IGD 24 Jam, Lab, Radiologi, Apotek, MCU",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `*Fasilitas & Layanan Medis RS Avisena:*\n\n• IGD 24 Jam & Ruang Tindakan Gawat Darurat\n• Laboratorium Patologi Klinik 24 Jam\n• Radiologi Digital (CT Scan, USG 4D, X-Ray)\n• Farmasi & Apotek Siaga 24 Jam\n• Medical Check Up (MCU) Personal & Korporat\n• Ruang Fisioterapi & Rehabilitasi Medik`,
        includeBackToMenu: true,
        value: "6"
      },
      {
        id: "opt_7",
        label: "7. Lokasi & Kontak Darurat",
        description: "Tautan Google Maps, nomor ambulans & kontak darurat",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `*Lokasi & Kontak Darurat Avisena:*\n\n• Alamat: Jl. Raya Avisena No. 100\n• IGD Call Center: 021-555-1199\n• Ambulans Siaga 24 Jam: 0811-999-118\n• Website: https://avisena.co.id\n• Google Maps: https://maps.google.com/?q=RS+Avisena`,
        includeBackToMenu: true,
        value: "7"
      },
      {
        id: "opt_8",
        label: "8. Hubungi Petugas (Operator)",
        description: "Sambungkan chat dengan staf Customer Care / Helpdesk",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `*Customer Care Avisena Healthcare:*\n\nPesan Anda telah diteruskan ke tim Customer Care kami. Mohon tunggu beberapa saat, petugas kami akan segera membalas chat Anda secara langsung. (Jam operasional operator: 08.00 - 20.00 WIB).`,
        includeBackToMenu: true,
        value: "8"
      }
    ];

    setMenuFormat("LIST");
    setButtonsList(presetItems);
    if (!name) setName("Menu Layanan Rumah Sakit");
    if (!response) setResponse("Halo! Selamat datang di Layanan Informasi Resmi *Avisena Healthcare Group* \n\nSilakan pilih layanan yang Anda butuhkan melalui daftar menu di bawah:");
    resetChatSimulation(
      "halo",
      "Halo! Selamat datang di Layanan Informasi Resmi *Avisena Healthcare Group* \n\nSilakan pilih layanan yang Anda butuhkan melalui daftar menu di bawah:",
      presetItems
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !response) return;
    if (triggerType !== "FALLBACK" && !keywords) return;

    setSubmitting(true);
    try {
      const validButtons = buttonsList
        .filter(b => b.label.trim())
        .map(b => ({
          id: b.id || Math.random().toString(36).substring(2, 9),
          label: b.label.trim(),
          description: b.description ? b.description.trim() : "",
          type: b.type,
          actionType: b.actionType,
          replyMessage: b.replyMessage ? b.replyMessage.trim() : "",
          includeBackToMenu: b.includeBackToMenu,
          value: b.value ? b.value.trim() : "",
          hasSubMenu: !!b.hasSubMenu,
          subOptions: b.hasSubMenu && Array.isArray(b.subOptions) 
            ? b.subOptions.filter(so => so.label.trim()) 
            : undefined
        }));

      const payload = {
        name,
        triggerType,
        keywords,
        response,
        buttons: validButtons.length > 0 ? JSON.stringify(validButtons) : null,
        isActive,
        sessionId: selectedSessionId === "ALL" ? null : selectedSessionId
      };

      if (editingId) {
        await api.put(`/bot/${editingId}`, payload);
      } else {
        await api.post('/bot', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Failed to save bot rule:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRuleActive = async (rule: BotRule) => {
    try {
      const newStatus = !rule.isActive;
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: newStatus } : r));
      await api.put(`/bot/${rule.id}`, { isActive: newStatus });
    } catch (err) {
      console.error("Failed to toggle rule:", err);
      fetchData();
    }
  };

  const handleDelete = async (id: string, ruleName: string) => {
    if (!confirm(`Hapus aturan bot "${ruleName}"?`)) return;
    try {
      await api.delete(`/bot/${id}`);
      fetchData();
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  // Handler when user clicks an interactive button or list item inside Phone Mockup
  const handlePreviewOptionClick = (btn: BotButton) => {
    setIsListSheetOpen(false);
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (btn.type === "URL") {
      const url = btn.value?.startsWith("http") ? btn.value : `https://${btn.value || 'avisena.co.id'}`;
      window.open(url, "_blank");
      return;
    }

    if (btn.type === "CALL") {
      alert(`[Simulasi Panggilan WhatsApp] Melakukan panggilan ke nomor: ${btn.value || '+628123456789'}`);
      return;
    }

    // 1. Add patient message with the clicked option label
    const patientMsg: ChatMessage = {
      id: `patient-${Date.now()}`,
      sender: "patient",
      text: btn.label,
      time: timeNow
    };

    // 2. Check if this is "Kembali ke Menu" or '0'
    if (btn.id === "menu" || btn.value === "0" || btn.value?.toLowerCase() === "menu" || btn.label.toLowerCase().includes("menu utama")) {
      const activeBtns = buttonsList.filter(b => b.label.trim());
      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: formatBotMessage(response || "Halo! Selamat datang di Menu Utama.", activeBtns, false),
        buttons: activeBtns,
        isListMenu: false,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 3. Check if this option has nested sub-options!
    if (btn.hasSubMenu && Array.isArray(btn.subOptions) && btn.subOptions.length > 0) {
      const subButtons: BotButton[] = [
        ...btn.subOptions.map((so, sIdx) => ({
          id: so.id || `sub_${sIdx + 1}`,
          label: so.label,
          description: so.description,
          type: "LIST_ITEM" as const,
          actionType: "DIRECT_REPLY" as const,
          replyMessage: so.replyMessage,
          value: `${sIdx + 1}`
        })),
        {
          id: "menu",
          label: "0. Kembali ke Menu Utama",
          type: "QUICK_REPLY" as const,
          actionType: "DIRECT_REPLY" as const,
          replyMessage: response,
          value: "0"
        }
      ];

      const subPrompt = btn.replyMessage || `Silakan pilih poliklinik / informasi untuk *${btn.label}*:`;
      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: formatBotMessage(subPrompt, btn.subOptions, true),
        buttons: subButtons,
        isListMenu: false,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 4. Regular reply message
    if (btn.replyMessage?.trim()) {
      let replyWithMenu = btn.replyMessage.trim();
      if (!replyWithMenu.includes('0') && !replyWithMenu.toLowerCase().includes('menu')) {
        replyWithMenu = `${replyWithMenu}\n\n*Ketik 0 atau MENU untuk kembali ke menu utama.*`;
      }
      const returnBtn: BotButton[] = [
        {
          id: "menu",
          label: "0. Kembali ke Menu Utama",
          type: "QUICK_REPLY",
          actionType: "DIRECT_REPLY",
          replyMessage: response,
          value: "0"
        }
      ];

      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: replyWithMenu,
        buttons: returnBtn,
        isListMenu: false,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 5. Match against other saved rules in database
    const searchTarget = (btn.value || btn.label).toLowerCase().trim();
    const otherMatch = rules.find(r => {
      if (!r.isActive) return false;
      const kws = r.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      if (r.triggerType === "EXACT") return kws.includes(searchTarget);
      if (r.triggerType === "CONTAINS") return kws.some(k => searchTarget.includes(k) || k.includes(searchTarget));
      return false;
    });

    if (otherMatch) {
      let otherBtns: BotButton[] = [];
      if (otherMatch.buttons) {
        try {
          otherBtns = typeof otherMatch.buttons === 'string' ? JSON.parse(otherMatch.buttons) : otherMatch.buttons;
        } catch {}
      }
      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: otherMatch.response,
        buttons: Array.isArray(otherBtns) ? otherBtns : [],
        isListMenu: false,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 6. Fallback
    const fallbackMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: "bot",
      text: `Respon untuk pilihan "${btn.label}" belum diatur. Anda dapat mengetik pesan balasan langsung di formulir sebelah kiri.`,
      buttons: [
        {
          id: "menu",
          label: "0. Kembali ke Menu Utama",
          type: "QUICK_REPLY",
          actionType: "DIRECT_REPLY",
          replyMessage: response,
          value: "0"
        }
      ],
      isListMenu: false,
      time: timeNow
    };
    setSimulatedChatHistory(prev => [...prev, patientMsg, fallbackMsg]);
  };

  const handleSendTestMessage = () => {
    if (!testInput.trim()) return;
    const text = testInput.trim();
    setTestInput("");
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const patientMsg: ChatMessage = {
      id: `patient-${Date.now()}`,
      sender: "patient",
      text: text,
      time: timeNow
    };

    // Check typing '0', 'menu', 'kembali'
    if (text === '0' || text.toLowerCase() === 'menu' || text.toLowerCase() === 'kembali') {
      const activeBtns = buttonsList.filter(b => b.label.trim());
      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: formatBotMessage(response || "Halo! Selamat datang di Menu Utama.", activeBtns, false),
        buttons: activeBtns,
        isListMenu: false,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 1. Check numeric option match against the latest displayed bot message!
    const lastBotMsg = [...simulatedChatHistory].reverse().find(m => m.sender === 'bot');
    const numInput = parseInt(text, 10);
    if (!isNaN(numInput) && lastBotMsg && lastBotMsg.buttons && lastBotMsg.buttons.length > 0) {
      if (numInput >= 1 && numInput <= lastBotMsg.buttons.length) {
        const selectedBtn = lastBotMsg.buttons[numInput - 1];
        if (selectedBtn) {
          handlePreviewOptionClick(selectedBtn);
          return;
        }
      }
    }

    // 2. Check keyword match with current edited rule
    const currentKws = keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const cleanTest = text.toLowerCase();
    const matchesCurrent = triggerType === "FALLBACK" || 
      (triggerType === "EXACT" && currentKws.includes(cleanTest)) ||
      (triggerType === "CONTAINS" && currentKws.some(k => cleanTest.includes(k)));

    if (matchesCurrent) {
      const activeBtns = buttonsList.filter(b => b.label.trim());
      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: formatBotMessage(response || "(Pesan bot kosong)", activeBtns),
        buttons: activeBtns,
        isListMenu: false,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 3. Match other saved rules
    const otherMatch = rules.find(r => {
      if (!r.isActive || r.id === editingId) return false;
      const kws = r.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      if (r.triggerType === "EXACT") return kws.includes(cleanTest);
      if (r.triggerType === "CONTAINS") return kws.some(k => cleanTest.includes(k));
      return false;
    });

    if (otherMatch) {
      let otherBtns: BotButton[] = [];
      if (otherMatch.buttons) {
        try {
          otherBtns = typeof otherMatch.buttons === 'string' ? JSON.parse(otherMatch.buttons) : otherMatch.buttons;
        } catch {}
      }
      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: otherMatch.response,
        buttons: Array.isArray(otherBtns) ? otherBtns : [],
        isListMenu: otherBtns.length > 3,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 4. Unmatched
    const unmatchedMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: "bot",
      text: "Maaf, pesan Anda belum kami kenali. Silakan ketik angka pilihan menu (1-8) atau klik tombol menu di bawah.",
      buttons: buttonsList.filter(b => b.label.trim()),
      isListMenu: menuFormat === "LIST" || buttonsList.length > 3,
      time: timeNow
    };
    setSimulatedChatHistory(prev => [...prev, patientMsg, unmatchedMsg]);
  };

  const createDefaultSampleRules = async () => {
    handleLoadHospital8MenuPreset();
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rule.keywords.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rule.response.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "ALL" || rule.triggerType === filterType;
    const matchesSession = filterSession === "ALL" || 
                           (filterSession === "GLOBAL" && !rule.sessionId) ||
                           rule.sessionId === filterSession;
    return matchesSearch && matchesType && matchesSession;
  });

  const insertQuickText = (textToInsert: string) => {
    setResponse(prev => prev + textToInsert);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-primary border border-border">
              <Bot className="w-3.5 h-3.5" />
              Interactive List & Buttons Engine
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            WhatsApp Auto-Reply Bot
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Kelola kata kunci pemicu dan menu pilihan interaktif (Daftar Menu WhatsApp List hingga 10 opsi atau Tombol Cepat) untuk merespons pesan pasien 24/7.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button 
            onClick={openCreateModal}
            className="bg-[#00A389] hover:bg-[#008771] text-white font-medium shadow-sm transition-all h-10 px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Aturan Bot
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchData}
            disabled={loading}
            className="border-border text-foreground h-10 w-10"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input 
            placeholder="Cari nama aturan, kata kunci, atau respon..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-card border-border text-sm rounded-lg"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Target Sesi */}
          {sessions.length > 0 && (
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="h-9 px-3 rounded-lg text-xs font-semibold border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Semua Target Sesi</option>
              <option value="GLOBAL">Global (Semua Sesi)</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.sessionName}>
                  Sesi: {s.sessionName} {s.phoneNumber ? `(${s.phoneNumber})` : ''}
                </option>
              ))}
            </select>
          )}

          {/* Filter Tipe Trigger */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["ALL", "EXACT", "CONTAINS", "FALLBACK"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0",
                  filterType === type 
                    ? "bg-[#00A389] text-white border-[#00A389] shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {type === "ALL" && "Semua Tipe"}
                {type === "EXACT" && "EXACT"}
                {type === "CONTAINS" && "CONTAINS"}
                {type === "FALLBACK" && "FALLBACK"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin text-[#00A389] mb-3" />
          <p className="text-sm">Memuat aturan bot WhatsApp...</p>
        </div>
      ) : rules.length === 0 ? (
        <Card className="border-dashed border-2 text-center py-16 bg-muted/20">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-secondary text-primary mx-auto flex items-center justify-center">
              <Bot className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Belum Ada Aturan Bot</h3>
              <p className="text-sm text-muted-foreground">
                Bot WhatsApp Anda saat ini belum memiliki aturan balasan otomatis.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button onClick={createDefaultSampleRules} variant="outline" className="text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#00A389]" />
                Pasang 8 Menu Layanan RS Avisena
              </Button>
              <Button onClick={openCreateModal} className="bg-[#00A389] hover:bg-[#008771] text-white text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Buat Manual
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Tidak ada aturan yang cocok dengan filter pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRules.map((rule) => {
            let ruleButtons: BotButton[] = [];
            if (rule.buttons) {
              try {
                ruleButtons = typeof rule.buttons === 'string' ? JSON.parse(rule.buttons) : rule.buttons;
              } catch {}
            }
            const isList = ruleButtons.length > 3 || ruleButtons.some(b => b.description || b.type === "LIST_ITEM");

            return (
              <Card key={rule.id} className={cn(
                "border flex flex-col justify-between transition-all hover:shadow-md",
                rule.isActive ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-75"
              )}>
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <span>{rule.name}</span>
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Target Session Badge */}
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border",
                          rule.sessionId 
                            ? "bg-teal-50 text-[#006D5B] border-teal-200 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-300"
                            : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        )}>
                          {rule.sessionId ? (
                            <>
                              <Smartphone className="w-3 h-3 text-[#00A389]" />
                              <span>{rule.sessionId}</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-3 h-3 text-[#10448E]" />
                              <span>Semua Sesi</span>
                            </>
                          )}
                        </span>

                        {/* Trigger Type Badge */}
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          rule.triggerType === "EXACT" && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                          rule.triggerType === "CONTAINS" && "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
                          rule.triggerType === "FALLBACK" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                        )}>
                          {rule.triggerType}
                        </span>

                        {/* Interactive Menu Badge */}
                        {Array.isArray(ruleButtons) && ruleButtons.length > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 bg-teal-100 text-[#006D5B] dark:bg-teal-950 dark:text-teal-300">
                            <List className="w-3 h-3" />
                            {ruleButtons.length} Menu Pilihan (Ketik 1-{ruleButtons.length})
                          </span>
                        )}

                        {/* Active Status Badge */}
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          rule.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}>
                          {rule.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => toggleRuleActive(rule)}
                      title={rule.isActive ? "Nonaktifkan Aturan" : "Aktifkan Aturan"}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-6 h-6 text-[#00A389]" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="py-4 space-y-3 flex-1 text-sm">
                  {rule.triggerType !== "FALLBACK" && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[#00A389]" /> Kata Kunci Pemicu:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rule.keywords.split(',').map((kw, idx) => (
                          <span key={idx} className="bg-secondary text-[#006D5B] text-xs px-2 py-0.5 rounded-md font-mono border border-border/50">
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-[#10448E]" /> Respon Balasan Bot:
                    </span>
                    <div className="bg-muted/40 p-3 rounded-lg text-xs font-sans text-foreground/90 whitespace-pre-wrap max-h-24 overflow-y-auto border border-border/40">
                      {rule.response}
                    </div>
                  </div>

                  {/* Interactive Options Preview */}
                  {Array.isArray(ruleButtons) && ruleButtons.length > 0 && (
                    <div className="pt-2 border-t border-border/50 space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <List className="w-3 h-3 text-[#00A389]" />
                        Daftar Pilihan Menu (Ketik angka 1-{ruleButtons.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {ruleButtons.map((btn, bIdx) => (
                          <div key={bIdx} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-secondary text-[#006D5B] border border-[#00A389]/20 font-medium">
                            <span className="font-bold">{bIdx + 1}.</span>
                            <span>{btn.label.replace(/^\d+[\.\s\-]+/, '')}</span>
                            {btn.replyMessage && (
                              <span className="text-[9px] text-teal-600 bg-white/70 dark:bg-black/30 px-1 rounded ml-0.5" title="Memiliki pesan balasan spesifik">
                                ✓
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-3 pb-3 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground bg-muted/10">
                  <span>{new Date(rule.createdAt).toLocaleDateString('id-ID')}</span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:text-primary"
                      onClick={() => openEditModal(rule)}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      onClick={() => handleDelete(rule.id, rule.name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Dialog: Luas & Proper (Max-W-5XL) dengan Target Sesi, Tombol & WhatsApp List Menu */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-[94vw] p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card max-h-[92vh] flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
            
            {/* Form Section (7 of 12 Cols - Spacious & Comfortable) */}
            <form onSubmit={handleSubmit} className="lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between overflow-y-auto max-h-[92vh]">
              <div className="space-y-4">
                <DialogHeader className="pb-2 border-b border-border/60">
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {editingId ? "Edit Aturan Bot" : "Tambah Aturan Bot Baru"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Konfigurasi kata kunci pemicu, pesan utama, serta menu pilihan interaktif (List atau Tombol) yang memunculkan balasan berikutnya.
                  </DialogDescription>
                </DialogHeader>

                {/* Target Sesi WhatsApp Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="targetSession" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#00A389]" />
                      Target Sesi WhatsApp
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Pilih nomor yang merespons</span>
                  </div>
                  <select
                    id="targetSession"
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-sans focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="ALL">Semua Sesi (Global - Berlaku untuk Semua Nomor WA)</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.sessionName}>
                        Sesi: {s.sessionName} {s.phoneNumber ? `(${s.phoneNumber})` : '(Belum tertaut nomor)'} • {s.status === 'CONNECTED' ? 'Terhubung' : 'Terputus'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nama Aturan */}
                <div className="space-y-1.5">
                  <Label htmlFor="ruleName" className="text-xs font-semibold text-foreground">
                    Nama Aturan
                  </Label>
                  <Input 
                    id="ruleName" 
                    placeholder="Contoh: Menu Utama Layanan RS Avisena"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-10 text-sm bg-background border-border"
                  />
                </div>

                {/* Tipe Pemicu (Trigger) */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Tipe Pemicu (Trigger Match)</Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTriggerType("EXACT")}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all relative overflow-hidden",
                        triggerType === "EXACT" 
                          ? "bg-teal-50/80 border-[#00A389] text-[#006D5B] dark:bg-teal-950/40 dark:border-[#00A389] dark:text-teal-300 shadow-sm" 
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/70"
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs uppercase tracking-wider">EXACT</span>
                        {triggerType === "EXACT" && <Check className="w-3.5 h-3.5 text-[#00A389]" />}
                      </div>
                      <p className="text-[11px] leading-tight">Kata sama persis (misal: "1" atau "MENU")</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTriggerType("CONTAINS")}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all relative overflow-hidden",
                        triggerType === "CONTAINS" 
                          ? "bg-teal-50/80 border-[#00A389] text-[#006D5B] dark:bg-teal-950/40 dark:border-[#00A389] dark:text-teal-300 shadow-sm" 
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/70"
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs uppercase tracking-wider">CONTAINS</span>
                        {triggerType === "CONTAINS" && <Check className="w-3.5 h-3.5 text-[#00A389]" />}
                      </div>
                      <p className="text-[11px] leading-tight">Kalimat mengandung kata (misal: "halo", "menu")</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTriggerType("FALLBACK")}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all relative overflow-hidden",
                        triggerType === "FALLBACK" 
                          ? "bg-teal-50/80 border-[#00A389] text-[#006D5B] dark:bg-teal-950/40 dark:border-[#00A389] dark:text-teal-300 shadow-sm" 
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/70"
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs uppercase tracking-wider">FALLBACK</span>
                        {triggerType === "FALLBACK" && <Check className="w-3.5 h-3.5 text-[#00A389]" />}
                      </div>
                      <p className="text-[11px] leading-tight">Balasan jika pasien mengetik di luar menu</p>
                    </button>
                  </div>
                </div>

                {/* Kata Kunci Input */}
                {triggerType !== "FALLBACK" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="keywords" className="text-xs font-semibold text-foreground">
                        Kata Kunci Pemicu
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Pisahkan dengan koma</span>
                    </div>
                    <Input 
                      id="keywords" 
                      placeholder="Contoh: halo, menu, info, layanan, bantuan"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      required
                      className="h-10 text-sm font-mono bg-background border-border"
                    />

                    {keywords.trim() && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-muted-foreground mr-1">Terdeteksi:</span>
                        {keywords.split(',').map((kw, i) => kw.trim() && (
                          <span key={i} className="inline-flex items-center text-[11px] font-mono bg-secondary text-[#006D5B] px-2 py-0.5 rounded-md border border-border">
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Respon Balasan Utama Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="responseMsg" className="text-xs font-semibold text-foreground">
                      Pesan Pembuka / Utama Bot
                    </Label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button 
                        type="button" 
                        onClick={() => insertQuickText("*Teks Tebal*")} 
                        className="px-1.5 py-0.5 bg-muted hover:bg-muted/80 rounded text-muted-foreground font-mono"
                      >
                        *B*
                      </button>
                      <button 
                        type="button" 
                        onClick={() => insertQuickText("_Teks Miring_")} 
                        className="px-1.5 py-0.5 bg-muted hover:bg-muted/80 rounded text-muted-foreground font-mono"
                      >
                        _I_
                      </button>
                    </div>
                  </div>
                  <textarea 
                    id="responseMsg" 
                    rows={3}
                    placeholder="Tulis pesan pengantar di sini. Contoh: Halo! Selamat datang di Layanan Informasi Avisena. Silakan pilih menu di bawah ini:"
                    value={response}
                    onChange={(e) => {
                      setResponse(e.target.value);
                      setSimulatedChatHistory(prev => prev.map((msg, idx) => idx === 1 ? { ...msg, text: e.target.value } : msg));
                    }}
                    required
                    className="w-full p-3 rounded-xl border border-border bg-background text-sm font-sans focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none leading-relaxed"
                  />
                </div>

                {/* Format Menu Interaktif Bernomor (100% WhatsApp Compliant) */}
                <div className="space-y-3 pt-3 pb-1 border-t border-border/70">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#00A389]" />
                        Daftar Menu Pilihan Pasien (Ketik Angka 1-10)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Diformat menjadi menu angka WhatsApp interaktif yang aman dan langsung terkirim
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold shrink-0 self-start sm:self-auto">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>100% Terkirim & Instan</span>
                    </div>
                  </div>

                  {/* Penjelasan Kompatibilitas WhatsApp */}
                  <div className="bg-sky-50/70 dark:bg-sky-950/30 p-2.5 rounded-xl border border-sky-200 dark:border-sky-800 text-[11px] text-sky-900 dark:text-sky-200 leading-relaxed flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>
                      <b>Standar WhatsApp Multi-Device:</b> Pilihan di bawah otomatis dirangkai menjadi menu berangka resmi (contoh: <code>1️⃣ Jadwal Dokter</code>). Pasien cukup membalas dengan mengetik angka <b>1</b> atau kata kuncinya untuk mendapatkan balasan informasi secara otomatis.
                    </span>
                  </div>

                  {/* Preset 1-Click Button for 8 Hospital Items */}
                  <div className="flex items-center justify-between bg-teal-50/70 dark:bg-teal-950/30 p-2.5 rounded-xl border border-teal-200 dark:border-teal-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#00A389] shrink-0" />
                      <span className="text-xs font-semibold text-teal-900 dark:text-teal-200">
                        Ingin menu layanan rumah sakit lengkap?
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleLoadHospital8MenuPreset}
                      className="bg-[#00A389] hover:bg-[#008771] text-white text-[11px] h-7 px-2.5 font-medium shadow-xs"
                    >
                      Muat 8 Menu RS
                    </Button>
                  </div>

                  {/* List Items Editor */}
                  {buttonsList.length > 0 && (
                    <div className="space-y-3 pt-1">
                      {buttonsList.map((btn, idx) => (
                        <div key={idx} className="p-3.5 bg-muted/30 rounded-xl border border-border/80 space-y-3 transition-all hover:border-[#00A389]/40">
                          
                          {/* Item Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-[#00A389] text-white text-[11px] flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              Opsi #{idx + 1}: {btn.label ? `"${btn.label}"` : "(Belum ada judul)"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveButton(idx)}
                              className="text-muted-foreground hover:text-rose-600 transition-colors p-1"
                              title="Hapus Opsi Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Grid Input: Title & Description */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                            <div className="sm:col-span-6">
                              <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                                Judul Pilihan Menu
                              </Label>
                              <Input
                                placeholder={`Contoh: ${idx + 1}. Jadwal Praktik Dokter`}
                                value={btn.label}
                                onChange={(e) => handleUpdateButton(idx, "label", e.target.value)}
                                className="h-9 text-xs bg-background border-border"
                              />
                            </div>

                            <div className="sm:col-span-6">
                              <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                                Deskripsi Singkat (Muncul di Bawah Judul)
                              </Label>
                              <Input
                                placeholder="Contoh: Info jadwal dokter spesialis & umum"
                                value={btn.description || ""}
                                onChange={(e) => handleUpdateButton(idx, "description", e.target.value)}
                                className="h-9 text-xs bg-background border-border"
                              />
                            </div>
                          </div>

                          {/* Mode Selector for Option: Direct Answer vs Nested Sub-Menu */}
                          <div className="pt-2 border-t border-border/40 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-muted/40 p-2 rounded-lg border border-border/60">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-foreground">
                                  Tipe Respon Opsi #{idx + 1}:
                                </span>
                                {btn.hasSubMenu && (
                                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 px-1.5 py-0.5 rounded">
                                    {btn.subOptions?.length || 0} Sub-Pilihan
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 bg-background p-0.5 rounded-md border border-border self-start sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateButton(idx, "hasSubMenu", false)}
                                  className={cn(
                                    "px-2.5 py-1 rounded text-[11px] font-medium transition-all",
                                    !btn.hasSubMenu ? "bg-[#00A389] text-white shadow-2xs" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  Jawaban Langsung
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateButton(idx, "hasSubMenu", true);
                                    if (!btn.subOptions || btn.subOptions.length === 0) {
                                      handleUpdateButton(idx, "subOptions", [
                                        { id: "sub_1", label: "Poli Anak", description: "dr. Ahmad, Sp.A", replyMessage: "Jadwal Poli Anak: Senin - Jumat (08.00 - 12.00 WIB)" },
                                        { id: "sub_2", label: "Poli Penyakit Dalam", description: "dr. Siti, Sp.PD", replyMessage: "Jadwal Poli Penyakit Dalam: Senin - Sabtu (09.00 - 14.00 WIB)" }
                                      ]);
                                    }
                                  }}
                                  className={cn(
                                    "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                                    btn.hasSubMenu ? "bg-[#00A389] text-white shadow-2xs" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  <Layers className="w-3 h-3" />
                                  Sub-Menu Bersarang
                                </button>
                              </div>
                            </div>

                            {btn.hasSubMenu ? (
                              /* Nested Sub-Menu Editor */
                              <div className="space-y-2.5 bg-teal-50/50 dark:bg-teal-950/30 p-3 rounded-xl border border-teal-200/80 dark:border-teal-800/80 mt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1">
                                    <Layers className="w-3.5 h-3.5 text-[#00A389]" />
                                    Daftar Sub-Pilihan (Muncul saat pasien memilih opsi #{idx + 1}):
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono">Auto 1, 2, ... + 0 Kembali</span>
                                </div>

                                <div>
                                  <Label className="text-[10px] font-medium text-muted-foreground block mb-1">
                                    Pesan Pengantar Sub-Menu:
                                  </Label>
                                  <Input
                                    placeholder={`Contoh: Silakan pilih informasi untuk ${btn.label || 'layanan ini'}:`}
                                    value={btn.replyMessage}
                                    onChange={(e) => handleUpdateButton(idx, "replyMessage", e.target.value)}
                                    className="h-8 text-xs bg-background border-border"
                                  />
                                </div>

                                {/* Sub-items list */}
                                <div className="space-y-2 pt-1">
                                  {(btn.subOptions || []).map((sub, sIdx) => (
                                    <div key={sIdx} className="p-2.5 bg-background rounded-lg border border-border space-y-2">
                                      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1">
                                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                          <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                                            {sIdx + 1}
                                          </span>
                                          Sub #{sIdx + 1}: {sub.label || "(Belum ada judul)"}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newSubs = (btn.subOptions || []).filter((_, i) => i !== sIdx);
                                            handleUpdateButton(idx, "subOptions", newSubs);
                                          }}
                                          className="text-muted-foreground hover:text-rose-600 p-0.5"
                                          title="Hapus Sub-Pilihan"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground block mb-0.5">Judul Sub-Pilihan</Label>
                                          <Input
                                            placeholder="Contoh: Poli Anak"
                                            value={sub.label}
                                            onChange={(e) => {
                                              const newSubs = [...(btn.subOptions || [])];
                                              newSubs[sIdx] = { ...newSubs[sIdx], label: e.target.value };
                                              handleUpdateButton(idx, "subOptions", newSubs);
                                            }}
                                            className="h-8 text-xs bg-background border-border"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground block mb-0.5">Deskripsi Singkat</Label>
                                          <Input
                                            placeholder="Contoh: dr. Ahmad, Sp.A"
                                            value={sub.description || ""}
                                            onChange={(e) => {
                                              const newSubs = [...(btn.subOptions || [])];
                                              newSubs[sIdx] = { ...newSubs[sIdx], description: e.target.value };
                                              handleUpdateButton(idx, "subOptions", newSubs);
                                            }}
                                            className="h-8 text-xs bg-background border-border"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <Label className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 block mb-0.5">
                                          Pesan Balasan yang Muncul Saat Sub-Pilihan Ini Dipilih:
                                        </Label>
                                        <textarea
                                          rows={2}
                                          placeholder="Contoh: Jadwal Poli Anak: dr. Ahmad, Sp.A (Senin - Jumat 08.00 - 12.00 WIB)"
                                          value={sub.replyMessage}
                                          onChange={(e) => {
                                            const newSubs = [...(btn.subOptions || [])];
                                            newSubs[sIdx] = { ...newSubs[sIdx], replyMessage: e.target.value };
                                            handleUpdateButton(idx, "subOptions", newSubs);
                                          }}
                                          className="w-full p-2 rounded-lg border border-border bg-background text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary/60 resize-none leading-relaxed"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {(btn.subOptions?.length || 0) < 6 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newSubs = [
                                        ...(btn.subOptions || []),
                                        {
                                          id: `sub_${(btn.subOptions?.length || 0) + 1}`,
                                          label: "",
                                          description: "",
                                          replyMessage: ""
                                        }
                                      ];
                                      handleUpdateButton(idx, "subOptions", newSubs);
                                    }}
                                    className="w-full h-8 text-[11px] border-dashed border-[#00A389]/60 text-[#00A389] hover:bg-[#EBF8F5] dark:hover:bg-[#1A332E]"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Tambah Sub-Pilihan ({ 6 - (btn.subOptions?.length || 0) } tersisa)
                                  </Button>
                                )}
                              </div>
                            ) : (
                              /* Direct reply message textarea */
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3 text-[#00A389]" />
                                    Pesan Balasan yang Muncul Saat Pasien Memilih Opsi Ini:
                                  </Label>
                                  <span className="text-[10px] text-muted-foreground italic">
                                    Dikirim langsung oleh bot
                                  </span>
                                </div>

                                <textarea
                                  rows={3}
                                  placeholder={`Tulis isi informasi detail untuk pilihan "${btn.label || 'ini'}"...\nContoh:\n*Jadwal Praktik Dokter Avisena:*\n• Poli Anak: 08.00 - 12.00 WIB\n• Poli Gigi: 13.00 - 17.00 WIB`}
                                  value={btn.replyMessage}
                                  onChange={(e) => handleUpdateButton(idx, "replyMessage", e.target.value)}
                                  className="w-full p-2.5 rounded-lg border border-border bg-background text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary/60 resize-none leading-relaxed"
                                />

                                <div className="flex items-center justify-between pt-0.5">
                                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={btn.includeBackToMenu !== false}
                                      onChange={(e) => handleUpdateButton(idx, "includeBackToMenu", e.target.checked)}
                                      className="w-3.5 h-3.5 rounded text-[#00A389] focus:ring-[#00A389]"
                                    />
                                    <span>Sertakan panduan <b>"Ketik 0 atau MENU untuk kembali ke menu utama"</b> di bawah pesan balasan ini</span>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Button Trigger */}
                  {buttonsList.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddButton}
                      className="w-full h-9 text-xs border-dashed border-[#00A389]/60 text-[#00A389] hover:bg-[#EBF8F5] dark:hover:bg-[#1A332E] font-medium"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Tambah Pilihan Menu Baru ({ 10 - buttonsList.length } tersisa)
                    </Button>
                  )}
                </div>

                {/* Toggle Aktif */}
                <div className="flex items-center space-x-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="statusActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                  />
                  <Label htmlFor="statusActive" className="text-xs font-medium cursor-pointer text-foreground">
                    Aktifkan aturan ini langsung setelah disimpan
                  </Label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-border flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-5 text-sm"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="bg-[#00A389] hover:bg-[#008771] text-white h-10 px-6 text-sm font-medium shadow-sm"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                  {editingId ? "Simpan Perubahan" : "Buat Aturan"}
                </Button>
              </div>
            </form>

            {/* Right Section: Realistis WhatsApp Multi-Turn Chat Simulation with Bottom Sheet (5 of 12 Cols) */}
            <div className="lg:col-span-5 bg-[#EFEAE2] dark:bg-[#0B141A] p-5 border-t lg:border-t-0 lg:border-l border-border flex flex-col justify-between max-h-[92vh] relative">
              <div>
                {/* Phone Header */}
                <div className="bg-[#008069] text-white p-3 rounded-t-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs leading-none">
                        {selectedSessionId !== 'ALL' ? selectedSessionId : 'Avisena Bot'}
                      </p>
                      <p className="text-[10px] text-teal-100 mt-0.5">
                        {selectedSessionId !== 'ALL' ? `Target: ${selectedSessionId}` : 'Semua Sesi &bull; Online'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => resetChatSimulation()}
                    className="text-white/80 hover:text-white flex items-center gap-1 text-[10px] bg-white/10 px-2 py-1 rounded-md transition-all hover:bg-white/20"
                    title="Ulangi simulasi dari awal"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                {/* Phone Screen Chat Body (Scrollable Chat Thread) */}
                <div className="bg-[#EFEAE2] dark:bg-[#0B141A] p-3.5 space-y-3 min-h-[360px] max-h-[480px] overflow-y-auto rounded-b-xl border border-t-0 border-[#008069]/20 shadow-inner relative">
                  
                  {/* Date Badge */}
                  <div className="text-center">
                    <span className="bg-white/80 dark:bg-slate-800/80 text-[10px] text-muted-foreground px-3 py-0.5 rounded-md shadow-xs">
                      HARI INI
                    </span>
                  </div>

                  {/* Render Chat History Message Bubbles */}
                  {simulatedChatHistory.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn("flex flex-col", msg.sender === "patient" ? "items-end" : "items-start")}
                    >
                      <div className={cn(
                        "text-xs p-3 rounded-xl shadow-xs max-w-[88%] space-y-1.5",
                        msg.sender === "patient" 
                          ? "bg-[#E7FFDB] dark:bg-[#005C4B] text-slate-800 dark:text-slate-100 rounded-tr-none" 
                          : "bg-white dark:bg-[#202C33] text-slate-800 dark:text-slate-100 rounded-tl-none"
                      )}>
                        <p className={cn(
                          "font-bold text-[10px]",
                          msg.sender === "patient" ? "text-emerald-800 dark:text-emerald-300" : "text-[#00A389]"
                        )}>
                          {msg.sender === "patient" ? "Pasien" : (selectedSessionId !== 'ALL' ? selectedSessionId : "Avisena Bot")}
                        </p>

                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {msg.text}
                        </p>

                        <span className="text-[9px] text-slate-400 block text-right">
                          {msg.time} {msg.sender === "patient" && <Check className="w-3 h-3 text-sky-500 inline ml-0.5" />}
                        </span>

                        {/* Interactive UI: Realistic WhatsApp Numbered Action Pills */}
                        {msg.sender === "bot" && msg.buttons && msg.buttons.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 space-y-1.5 mt-2">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                              <span>Uji Pilihan Pasien:</span>
                              <span className="text-[9px] text-[#00A389]">Klik opsi atau ketik angka</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.buttons.map((btn, bIdx) => (
                                <button
                                  key={bIdx}
                                  type="button"
                                  onClick={() => handlePreviewOptionClick(btn)}
                                  className="text-left py-1 px-2 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-[#006D5B] dark:text-teal-300 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-2xs active:scale-[0.98] border border-teal-200/80 dark:border-teal-800 cursor-pointer"
                                >
                                  {btn.value === 'menu' ? (
                                    <span>Ketik 'MENU'</span>
                                  ) : (
                                    <>
                                      <span className="w-4 h-4 rounded-full bg-[#00A389] text-white text-[10px] flex items-center justify-center font-bold">
                                        {bIdx + 1}
                                      </span>
                                      <span>{btn.label.replace(/^\d+[\.\s\-]+/, '') || `Pilihan ${bIdx + 1}`}</span>
                                    </>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <p className="text-[10px] text-center text-muted-foreground italic pt-1">
                    <b>Uji Coba:</b> Klik pilihan di atas atau ketik angka 1-{buttonsList.length || 8} di kolom bawah!
                  </p>

                </div>
              </div>

              {/* Patient Test Input Bar at bottom */}
              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Uji Ketik Pesan / Angka Pilihan:
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Ketik 1-{buttonsList.length || 8} atau kata kunci</span>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendTestMessage();
                      }
                    }}
                    placeholder={`Ketik angka (1-${buttonsList.length || 8}) atau kata kunci...`}
                    className="h-9 text-xs bg-white dark:bg-slate-900 border-border"
                  />
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={handleSendTestMessage}
                    className="bg-[#008069] hover:bg-[#006A57] text-white h-9 px-3 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Kirim
                  </Button>
                </div>
              </div>

            </div>

          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
