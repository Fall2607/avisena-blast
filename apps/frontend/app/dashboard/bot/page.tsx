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
  ChevronRight,
  ChevronsUpDown,
  FolderPlus,
  X,
  Layers
} from "lucide-react";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";

interface BotButton {
  id: string;
  label: string;
  description?: string;
  type?: "QUICK_REPLY" | "URL" | "CALL" | "LIST_ITEM";
  actionType?: "DIRECT_REPLY" | "LINK_RULE";
  replyMessage: string;
  includeBackToMenu?: boolean;
  value?: string;
  hasSubMenu?: boolean;
  subOptions?: BotButton[]; // Recursive N-level nested sub-options!
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
  const [isActive, setIsActive] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);

  // Accordion Expand State: map of pathKey (e.g. "0", "0-1", "0-1-2") to boolean
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({ "0": true });

  // Multi-Turn Interactive WhatsApp Simulation Thread inside Modal
  const [simulatedChatHistory, setSimulatedChatHistory] = useState<ChatMessage[]>([]);
  const [simulatedNavPath, setSimulatedNavPath] = useState<number[]>([]);
  const [simulatedAtLeaf, setSimulatedAtLeaf] = useState<boolean>(false);
  const [testInput, setTestInput] = useState("");

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
  const formatBotMessage = (text: string, btns: any[], isSubMenu: boolean = false, level: number = 0) => {
    if (!btns || btns.length === 0) {
      if (!text.includes('0') && !text.toLowerCase().includes('menu')) {
        return `${text}\n\n👉 *Ketik 0 untuk kembali ke menu sebelumnya, atau ketik MENU untuk ke Menu Utama.*`;
      }
      return text;
    }
    
    if (btns.length === 1 && (btns[0].value === 'menu' || btns[0].value === '0' || btns[0].label.toLowerCase().includes('menu'))) {
      if (!text.toLowerCase().includes('0') && !text.toLowerCase().includes('menu')) {
        return `${text}\n\n👉 *Ketik 0 untuk kembali ke menu sebelumnya, atau ketik MENU untuk ke Menu Utama.*`;
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

      let backGuide = "";
      if (level <= 1 && isSubMenu) {
        backGuide = `0. *Kembali ke Menu Utama*\n\n👉 *Balas dengan angka (1-${btns.length}) atau ketik 0 untuk kembali ke menu utama.*`;
      } else if (level > 1 && isSubMenu) {
        backGuide = `0. *Kembali ke Menu Sebelumnya*\n\n👉 *Balas dengan angka (1-${btns.length}) atau ketik 0 untuk ke menu sebelumnya, atau ketik MENU untuk ke menu utama.*`;
      } else {
        backGuide = `👉 *Balas dengan angka (1-${btns.length}) untuk memilih menu.*`;
      }

      return `${text}\n\n${formattedItems}\n\n${backGuide}`;
    }
    return text;
  };

  // Resolve simulated location at current nav path
  const resolveSimulatedState = (rootButtons: BotButton[], path: number[]) => {
    let activeList = rootButtons.filter(b => b.label.trim());
    let currentNode: BotButton | null = null;
    const breadcrumbTitles: string[] = ["Menu Utama"];

    for (const idx of path) {
      if (activeList[idx]) {
        currentNode = activeList[idx];
        breadcrumbTitles.push(currentNode.label);
        activeList = (currentNode.subOptions || []).filter(b => b.label.trim());
      } else {
        break;
      }
    }

    return {
      currentNode,
      activeList,
      level: path.length,
      breadcrumbTitles
    };
  };

  // Reset or initialize the phone mockup chat simulation
  const resetChatSimulation = (
    initPatientText?: string, 
    initResponseText?: string, 
    initButtons?: BotButton[]
  ) => {
    setSimulatedNavPath([]);
    setSimulatedAtLeaf(false);
    const patientText = initPatientText !== undefined ? initPatientText : (keywords.split(',')[0]?.trim() || "halo");
    const botText = initResponseText !== undefined ? initResponseText : (response || "Halo! Ada yang bisa kami bantu?");
    const activeButtons = initButtons !== undefined ? initButtons : buttonsList.filter(b => b.label.trim());
    const formattedBotText = formatBotMessage(botText, activeButtons, false, 0);

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
        time: "10:45"
      }
    ]);
  };

  // Recursive Normalizer for N-Level Nested Buttons
  const normalizeButtonsRecursively = (items: any[]): BotButton[] => {
    if (!Array.isArray(items)) return [];
    return items.map((b, idx) => ({
      id: b.id || Math.random().toString(36).substring(2, 9),
      label: b.label || "",
      description: b.description || "",
      type: b.type || (b.description ? "LIST_ITEM" : "QUICK_REPLY"),
      actionType: b.actionType || "DIRECT_REPLY",
      replyMessage: b.replyMessage || "",
      includeBackToMenu: b.includeBackToMenu !== undefined ? b.includeBackToMenu : true,
      value: b.value || `${idx + 1}`,
      hasSubMenu: !!b.hasSubMenu || (Array.isArray(b.subOptions) && b.subOptions.length > 0),
      subOptions: Array.isArray(b.subOptions) && b.subOptions.length > 0
        ? normalizeButtonsRecursively(b.subOptions)
        : []
    }));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setTriggerType("EXACT");
    setKeywords("");
    setResponse("");
    setButtonsList([]);
    setExpandedPaths({ "0": true });
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
        const parsed = typeof rule.buttons === 'string' ? JSON.parse(rule.buttons) : rule.buttons;
        if (Array.isArray(parsed)) {
          parsedBtns = parsed;
        } else if (parsed && typeof parsed === 'object') {
          parsedBtns = Array.isArray(parsed.items) ? parsed.items : [];
        }
      } catch {
        parsedBtns = [];
      }
    }

    const normalizedBtns = normalizeButtonsRecursively(parsedBtns);
    setButtonsList(normalizedBtns);
    setExpandedPaths({ "0": true });
    setTestInput("");
    const firstKeyword = rule.keywords.split(',')[0]?.trim() || "halo";
    resetChatSimulation(firstKeyword, rule.response, normalizedBtns);
    setIsModalOpen(true);
  };

  // Accordion Toggle and Batch Expand/Collapse Handlers
  const toggleAccordion = (pathKey: string) => {
    setExpandedPaths(prev => ({
      ...prev,
      [pathKey]: !prev[pathKey]
    }));
  };

  const expandAllAccordions = () => {
    const allKeys: Record<string, boolean> = {};
    const collect = (list: BotButton[], prefix: string) => {
      list.forEach((item, idx) => {
        const k = prefix ? `${prefix}-${idx}` : `${idx}`;
        allKeys[k] = true;
        if (item.subOptions && item.subOptions.length > 0) {
          collect(item.subOptions, k);
        }
      });
    };
    collect(buttonsList, "");
    setExpandedPaths(allKeys);
  };

  const collapseAllAccordions = () => {
    setExpandedPaths({});
  };

  // Recursive Tree Modification Helpers
  const updateItemAtPath = (items: BotButton[], path: number[], field: keyof BotButton, val: any): BotButton[] => {
    if (path.length === 0) return items;
    const [head, ...tail] = path;
    return items.map((item, idx) => {
      if (idx !== head) return item;
      if (tail.length === 0) {
        return { ...item, [field]: val };
      }
      return {
        ...item,
        subOptions: updateItemAtPath(item.subOptions || [], tail, field, val)
      };
    });
  };

  const addSubItemAtPath = (items: BotButton[], parentPath: number[]) => {
    let createdPathKey = "";

    const helper = (currentItems: BotButton[], path: number[], currentPathKey: string): BotButton[] => {
      if (path.length === 0) {
        const newChildIndex = currentItems.length;
        createdPathKey = currentPathKey ? `${currentPathKey}-${newChildIndex}` : `${newChildIndex}`;
        const newItem: BotButton = {
          id: Math.random().toString(36).substring(2, 9),
          label: "",
          description: "",
          type: "LIST_ITEM",
          actionType: "DIRECT_REPLY",
          replyMessage: "",
          includeBackToMenu: true,
          value: `${newChildIndex + 1}`,
          hasSubMenu: false,
          subOptions: []
        };
        return [...currentItems, newItem];
      }

      const [head, ...tail] = path;
      return currentItems.map((item, idx) => {
        if (idx !== head) return item;
        const nextKey = currentPathKey ? `${currentPathKey}-${idx}` : `${idx}`;
        return {
          ...item,
          hasSubMenu: true,
          subOptions: helper(item.subOptions || [], tail, nextKey)
        };
      });
    };

    const newItems = helper(items, parentPath, "");
    return { newItems, createdPathKey };
  };

  const removeItemAtPath = (items: BotButton[], path: number[]): BotButton[] => {
    if (path.length === 0) return items;
    const [head, ...tail] = path;
    if (tail.length === 0) {
      return items.filter((_, idx) => idx !== head);
    }
    return items.map((item, idx) => {
      if (idx !== head) return item;
      return {
        ...item,
        subOptions: removeItemAtPath(item.subOptions || [], tail)
      };
    });
  };

  const handleAddRootOption = () => {
    if (buttonsList.length >= 50) return;
    const newIndex = buttonsList.length;
    const newBtn: BotButton = {
      id: Math.random().toString(36).substring(2, 9),
      label: "",
      description: "",
      type: "LIST_ITEM",
      actionType: "DIRECT_REPLY",
      replyMessage: "",
      includeBackToMenu: true,
      value: `${newIndex + 1}`,
      hasSubMenu: false,
      subOptions: []
    };
    const updated = [...buttonsList, newBtn];
    setButtonsList(updated);
    setExpandedPaths(prev => ({
      ...prev,
      [`${newIndex}`]: true
    }));
  };

  // Load the comprehensive 8 hospital menu list preset with nested poliklinik sub-options (Up to 3 levels)
  const handleLoadHospital8MenuPreset = () => {
    const presetItems: BotButton[] = [
      {
        id: "opt_1",
        label: "👨‍⚕️ Info RS dan Dokter",
        description: "informasi RS dan Jadwal Dokter Spesialis",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `📋 *Jadwal Praktik Dokter RS Avisena:*\nSilakan pilih poliklinik spesialis yang ingin Anda tanyakan:`,
        includeBackToMenu: true,
        value: "1",
        hasSubMenu: true,
        subOptions: [
          {
            id: "sub_1",
            label: "Poli Anak & Tumbuh Kembang",
            description: "dr. Ahmad, Sp.A & dr. Dian, Sp.A",
            type: "LIST_ITEM",
            actionType: "DIRECT_REPLY",
            replyMessage: `👶 *Pilih Dokter Spesialis Anak RS Avisena:*`,
            includeBackToMenu: true,
            hasSubMenu: true,
            subOptions: [
              {
                id: "sub_1_1",
                label: "dr. Ahmad, Sp.A (Spesialis Anak)",
                description: "Senin - Jumat (08.00 - 12.00 WIB)",
                type: "LIST_ITEM",
                actionType: "DIRECT_REPLY",
                replyMessage: `👶 *Jadwal Praktik dr. Ahmad, Sp.A:*\n• Hari: Senin - Jumat\n• Jam: 08.00 - 12.00 WIB\n• Lokasi: Poliklinik Lantai 2, Ruang 201.\n\nUntuk pendaftaran dapat dilakukan online H-1.`
              },
              {
                id: "sub_1_2",
                label: "dr. Dian, Sp.A (Konsultan Tumbuh Kembang)",
                description: "Selasa, Kamis, Sabtu (13.00 - 16.00 WIB)",
                type: "LIST_ITEM",
                actionType: "DIRECT_REPLY",
                replyMessage: `👶 *Jadwal Praktik dr. Dian, Sp.A:*\n• Hari: Selasa, Kamis, Sabtu\n• Jam: 13.00 - 16.00 WIB\n• Lokasi: Poliklinik Lantai 2, Ruang 203.\n\nMelayani skrining nutrisi & tumbuh kembang anak.`
              }
            ]
          },
          {
            id: "sub_2",
            label: "Poli Penyakit Dalam (Internis)",
            description: "dr. Siti, Sp.PD & dr. Hendra, Sp.PD",
            type: "LIST_ITEM",
            actionType: "DIRECT_REPLY",
            replyMessage: `🩺 *Pilih Dokter Spesialis Penyakit Dalam:*`,
            includeBackToMenu: true,
            hasSubMenu: true,
            subOptions: [
              {
                id: "sub_2_1",
                label: "dr. Siti, Sp.PD (Spesialis Internis)",
                description: "Senin - Sabtu (09.00 - 14.00 WIB)",
                type: "LIST_ITEM",
                actionType: "DIRECT_REPLY",
                replyMessage: `🩺 *Jadwal Praktik dr. Siti, Sp.PD:*\n• Hari: Senin - Sabtu\n• Jam: 09.00 - 14.00 WIB\n• Lokasi: Poliklinik Lantai 1, Gedung Utama.`
              },
              {
                id: "sub_2_2",
                label: "dr. Hendra, Sp.PD (Konsultan Gastro)",
                description: "Senin, Rabu, Jumat (16.00 - 19.00 WIB)",
                type: "LIST_ITEM",
                actionType: "DIRECT_REPLY",
                replyMessage: `🩺 *Jadwal Praktik dr. Hendra, Sp.PD:*\n• Hari: Senin, Rabu, Jumat\n• Jam: 16.00 - 19.00 WIB\n• Lokasi: Poliklinik Lantai 1, Gedung Utama.`
              }
            ]
          },
          {
            id: "sub_3",
            label: "Poli Kandungan & Kebidanan (Obgyn)",
            description: "dr. Maya, Sp.OG (USG 4D)",
            type: "LIST_ITEM",
            actionType: "DIRECT_REPLY",
            replyMessage: `🤰 *Jadwal Praktik Poli Kandungan (Obgyn):*\n\n• dr. Maya, Sp.OG: Senin - Kamis (10.00 - 15.00 WIB)\n• dr. Reza, Sp.OG: Jumat & Sabtu (09.00 - 13.00 WIB)\n\nLayanan: Pemeriksaan Kehamilan, USG 4D, & Konsultasi Fertilitas.`
          },
          {
            id: "sub_4",
            label: "Poli Gigi & Bedah Mulut",
            description: "drg. Budi & drg. Rina, Sp.BM",
            type: "LIST_ITEM",
            actionType: "DIRECT_REPLY",
            replyMessage: `🦷 *Jadwal Praktik Poli Gigi & Bedah Mulut:*\n\n• drg. Budi: Senin - Jumat (13.00 - 17.00 WIB)\n• drg. Rina, Sp.BM: Selasa & Kamis (17.00 - 20.00 WIB)\n\nLayanan: Tambal Gigi, Scaling, Cabut Gigi Bungsu, & Ortodonti.`
          }
        ]
      },
      {
        id: "opt_2",
        label: "📝 Pendaftaran RS",
        description: "Pendaftaran RS online & antrean poli",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `📝 *Pendaftaran & Antrean Klinik Avisena:*\n\n1. Pendaftaran online dibuka H-1 pemeriksaan melalui portal website resmi kami.\n2. Siapkan nomor RM (Rekam Medis) atau NIK KTP Anda.\n3. Kuota poliklinik dibuka setiap hari pukul 06.00 WIB.\n4. Simpan nomor barcode antrean digital Anda untuk konfirmasi di mesin check-in RS.`,
        includeBackToMenu: true,
        value: "2"
      },
      {
        id: "opt_3",
        label: "🩻 Info Hasil Check Up",
        description: "Informasi hasil tes lab dan/atau radiologi",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `🩻 *Info Hasil Laboratorium & Radiologi:*\n\n• Hasil laboratorium rutin (darah, urine) selesai dalam 2-3 jam.\n• Hasil rontgen, USG, dan CT Scan dapat diambil H+1 pemeriksaan.\n• Anda dapat mengunduh hasil digital via portal pasien Avisena dengan nomor RM dan tanggal lahir.`,
        includeBackToMenu: true,
        value: "3"
      },
      {
        id: "opt_4",
        label: "💊 Informasi Pesanan Obat",
        description: "Informasi pesanan obat di instalasi farmasi",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `💊 *Informasi Instalasi Farmasi RS Avisena:*\n\n• Obat non-racikan siap dalam 15-30 menit setelah verifikasi resep dokter.\n• Obat racikan puyer/salep memerlukan waktu 30-60 menit.\n• Layanan antar obat (Avisena Med-Delivery) siap melayani pengantaran sampai ke rumah Anda.`,
        includeBackToMenu: true,
        value: "4"
      },
      {
        id: "opt_5",
        label: "🛏️ Ketersediaan Kamar Rawat Inap",
        description: "Monitoring Bed, kapasitas kelas & tarif",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `🛏️ *Monitoring Kamar Rawat Inap RS Avisena (Update Hari Ini):*\n\n• VVIP: 2 Bed Tersedia (Rp 1.200.000/hari)\n• VIP: 5 Bed Tersedia (Rp 850.000/hari)\n• Kelas 1: 8 Bed Tersedia (Rp 500.000/hari)\n• Kelas 2: 12 Bed Tersedia (Rp 350.000/hari)\n• Kelas 3: 15 Bed Tersedia (Tercover BPJS Kesehatan)\n• ICU / NICU: 3 Bed Siap Pakai`,
        includeBackToMenu: true,
        value: "5"
      },
      {
        id: "opt_6",
        label: "⏰ Jam Besuk Pasien",
        description: "Aturan, tata tertib & jadwal kunjungan",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `⏰ *Jadwal & Tata Tertib Jam Besuk Pasien:*\n\n• Siang: 11.00 - 13.00 WIB\n• Sore: 17.00 - 19.00 WIB\n\n*Tata Tertib Kunjungan:*\n- Maksimal 2 orang pengunjung secara bergantian.\n- Anak di bawah usia 12 tahun tidak diperkenankan masuk ke area ruang perawatan demi keselamatan kesehatan.`,
        includeBackToMenu: true,
        value: "6"
      },
      {
        id: "opt_7",
        label: "💳 Informasi BPJS & Asuransi",
        description: "Alur rujukan, syarat berkas & asuransi rekanan",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `💳 *Informasi BPJS Kesehatan & Asuransi Rekanan:*\n\n*Syarat Berkas Pasien BPJS:*\n1. Surat Rujukan Faskes 1 (Puskesmas/Klinik) yang masih aktif.\n2. Kartu BPJS & KTP asli.\n3. Kartu Berobat RS Avisena.\n\n*Asuransi Rekanan AdMedika:* Prudential, Allianz, Manulife, Sinarmas, Astra Life, Mandiri Inhealth, dll.`,
        includeBackToMenu: true,
        value: "7"
      },
      {
        id: "opt_8",
        label: "📞 Nomor Pelayanan RS",
        description: "Nomor kontak Pelayanan Rumah Sakit & Customer Care",
        type: "LIST_ITEM",
        actionType: "DIRECT_REPLY",
        replyMessage: `📞 *Nomor Pelayanan & Kontak Resmi RS Avisena:*\n\n• Customer Care Call Center: (021) 555-1199\n• IGD & Ambulans Siaga 24 Jam: 0811-999-118\n• Helpdesk Pendaftaran: 0812-3456-7890\n• Alamat: Jl. Raya Avisena No. 100\n\nPesan Anda telah diteruskan ke petugas kami. Mohon tunggu beberapa saat.`,
        includeBackToMenu: true,
        value: "8"
      }
    ];

    setButtonsList(presetItems);
    setExpandedPaths({ "0": true, "0-0": true });
    if (!name) setName("Menu Layanan Resmi Rumah Sakit");
    if (!keywords) setKeywords("halo, menu, bantuan, dokter, rsu avisena");
    const introMsg = "Halo Sahabat Avisena 👋\nSelamat datang di WhatsApp Official RSU Avisena.\nAda yang bisa kami bantu hari ini?\n\nKami siap mendampingi kesehatan Anda melalui pilihan layanan di bawah.\n\nBersama RSU Avisena, kesehatan Anda adalah prioritas kami 💙";
    setResponse(introMsg);
    resetChatSimulation("halo", introMsg, presetItems);
  };

  // Clean and sanitize button list recursively for database payload
  const cleanButtonsRecursively = (items: BotButton[]): any[] => {
    if (!Array.isArray(items)) return [];
    return items
      .filter(b => b.label.trim())
      .map(b => {
        const item: any = {
          id: b.id || Math.random().toString(36).substring(2, 9),
          label: b.label.trim(),
          description: b.description ? b.description.trim() : "",
          type: b.type || "LIST_ITEM",
          actionType: b.actionType || "DIRECT_REPLY",
          replyMessage: b.replyMessage ? b.replyMessage.trim() : "",
          includeBackToMenu: b.includeBackToMenu !== false,
          value: b.value ? b.value.trim() : "",
          hasSubMenu: !!b.hasSubMenu
        };
        if (b.hasSubMenu && Array.isArray(b.subOptions) && b.subOptions.length > 0) {
          const cleanedSubs = cleanButtonsRecursively(b.subOptions);
          if (cleanedSubs.length > 0) {
            item.subOptions = cleanedSubs;
          }
        }
        return item;
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !response) return;
    if (triggerType !== "FALLBACK" && !keywords) return;

    setSubmitting(true);
    try {
      const validButtons = cleanButtonsRecursively(buttonsList);

      const buttonPayload = validButtons.length > 0 ? {
        menuType: "TEXT_NUMBER",
        items: validButtons
      } : null;

      const payload = {
        name,
        triggerType,
        keywords,
        response,
        buttons: buttonPayload ? JSON.stringify(buttonPayload) : null,
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
  const handlePreviewOptionClick = (btn: BotButton, clickedIndex?: number) => {
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

    // 2. Check if clicked 'MENU' / jump to root
    if (btn.id === "menu-root" || btn.value?.toLowerCase() === "menu") {
      setSimulatedNavPath([]);
      setSimulatedAtLeaf(false);
      const rootActive = buttonsList.filter(b => b.label.trim());
      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: formatBotMessage(response || "Halo! Selamat datang di Menu Utama Avisena.", rootActive, false, 0),
        buttons: rootActive,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 3. Check if clicked '0' (Kembali ke menu sebelumnya)
    if (btn.id === "back" || btn.value === "0" || btn.label.toLowerCase().includes("kembali")) {
      let nextNavPath = [...simulatedNavPath];
      if (simulatedAtLeaf) {
        // Return from leaf reply to the current menu where the leaf was picked
        setSimulatedAtLeaf(false);
      } else if (nextNavPath.length > 0) {
        // Pop 1 level up in hierarchy
        nextNavPath.pop();
        setSimulatedNavPath(nextNavPath);
        setSimulatedAtLeaf(false);
      }

      const { currentNode, activeList, level } = resolveSimulatedState(buttonsList, nextNavPath);
      let botText = "";
      let isSub = false;
      if (nextNavPath.length === 0) {
        botText = response || "Halo! Selamat datang di Menu Utama Avisena.";
        isSub = false;
      } else {
        botText = currentNode?.replyMessage || `Silakan pilih informasi untuk *${currentNode?.label}*:`;
        isSub = true;
      }

      const backButtonList: BotButton[] = [
        ...activeList,
        ...(nextNavPath.length > 0 ? [{
          id: "back",
          label: nextNavPath.length <= 1 ? "0. Kembali ke Menu Utama" : "0. Kembali ke Menu Sebelumnya",
          type: "QUICK_REPLY" as const,
          actionType: "DIRECT_REPLY" as const,
          replyMessage: "",
          value: "0"
        }] : [])
      ];

      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: formatBotMessage(botText, activeList, isSub, level),
        buttons: backButtonList,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 4. Check if clicked option has sub-options (Branch / Nested Sub-Menu)
    if (btn.hasSubMenu && Array.isArray(btn.subOptions) && btn.subOptions.length > 0) {
      const { activeList: currentLevelList } = resolveSimulatedState(buttonsList, simulatedNavPath);
      const idx = clickedIndex !== undefined ? clickedIndex : currentLevelList.findIndex(b => b.id === btn.id);
      const newPath = [...simulatedNavPath, idx >= 0 ? idx : 0];
      setSimulatedNavPath(newPath);
      setSimulatedAtLeaf(false);

      const subActive = (btn.subOptions || []).filter(b => b.label.trim());
      const subPrompt = btn.replyMessage?.trim() || `Silakan pilih informasi untuk *${btn.label}*:`;

      const subButtons: BotButton[] = [
        ...subActive,
        {
          id: "back",
          label: newPath.length <= 1 ? "0. Kembali ke Menu Utama" : "0. Kembali ke Menu Sebelumnya",
          type: "QUICK_REPLY" as const,
          actionType: "DIRECT_REPLY" as const,
          replyMessage: "",
          value: "0"
        }
      ];

      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: formatBotMessage(subPrompt, subActive, true, newPath.length),
        buttons: subButtons,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 5. Leaf option with direct reply message
    if (btn.replyMessage?.trim()) {
      setSimulatedAtLeaf(true);
      let replyWithGuide = btn.replyMessage.trim();
      if (!replyWithGuide.includes('0') && !replyWithGuide.toLowerCase().includes('menu')) {
        replyWithGuide = `${replyWithGuide}\n\n👉 *Ketik 0 untuk kembali ke menu sebelumnya, atau ketik MENU untuk ke Menu Utama.*`;
      }

      const returnBtn: BotButton[] = [
        {
          id: "back",
          label: simulatedNavPath.length === 0 ? "0. Kembali ke Menu Utama" : "0. Kembali ke Menu Sebelumnya",
          type: "QUICK_REPLY" as const,
          actionType: "DIRECT_REPLY" as const,
          replyMessage: "",
          value: "0"
        },
        {
          id: "menu-root",
          label: "Menu Utama",
          type: "QUICK_REPLY" as const,
          actionType: "DIRECT_REPLY" as const,
          replyMessage: "",
          value: "menu"
        }
      ];

      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: replyWithGuide,
        buttons: returnBtn,
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 6. Match against other saved rules in database
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
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    // 7. Fallback
    const fallbackMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: "bot",
      text: `Respon untuk pilihan "${btn.label}" belum diatur. Anda dapat mengetik pesan balasan langsung di formulir sebelah kiri.`,
      buttons: [
        {
          id: "back",
          label: "0. Kembali ke Menu",
          type: "QUICK_REPLY" as const,
          actionType: "DIRECT_REPLY" as const,
          replyMessage: response,
          value: "0"
        }
      ],
      time: timeNow
    };
    setSimulatedChatHistory(prev => [...prev, patientMsg, fallbackMsg]);
  };

  const handleSendTestMessage = () => {
    if (!testInput.trim()) return;
    const text = testInput.trim();
    setTestInput("");
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Check typing '0', 'kembali', 'back'
    if (text === '0' || text.toLowerCase() === 'kembali' || text.toLowerCase() === 'back') {
      handlePreviewOptionClick({
        id: "back",
        label: "0. Kembali",
        type: "QUICK_REPLY",
        actionType: "DIRECT_REPLY",
        replyMessage: "",
        value: "0"
      });
      return;
    }

    // Check typing 'menu', 'utama', 'awal'
    if (text.toLowerCase() === 'menu' || text.toLowerCase() === 'utama' || text.toLowerCase() === 'awal') {
      handlePreviewOptionClick({
        id: "menu-root",
        label: "Menu Utama",
        type: "QUICK_REPLY",
        actionType: "DIRECT_REPLY",
        replyMessage: "",
        value: "menu"
      });
      return;
    }

    // 1. Check numeric option match against the current active level!
    const { activeList } = resolveSimulatedState(buttonsList, simulatedNavPath);
    const numInput = parseInt(text, 10);
    if (!isNaN(numInput) && numInput >= 1 && numInput <= activeList.length) {
      const selectedBtn = activeList[numInput - 1];
      if (selectedBtn) {
        handlePreviewOptionClick(selectedBtn, numInput - 1);
        return;
      }
    }

    const patientMsg: ChatMessage = {
      id: `patient-${Date.now()}`,
      sender: "patient",
      text: text,
      time: timeNow
    };

    // 2. Check keyword match with current edited rule
    const currentKws = keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const cleanTest = text.toLowerCase();
    const matchesCurrent = triggerType === "FALLBACK" || 
      (triggerType === "EXACT" && currentKws.includes(cleanTest)) ||
      (triggerType === "CONTAINS" && currentKws.some(k => cleanTest.includes(k)));

    if (matchesCurrent) {
      setSimulatedNavPath([]);
      setSimulatedAtLeaf(false);
      const activeBtns = buttonsList.filter(b => b.label.trim());
      const botMsg: ChatMessage = {
        id: `bot-${Date.now() + 1}`,
        sender: "bot",
        text: formatBotMessage(response || "(Pesan bot kosong)", activeBtns, false, 0),
        buttons: activeBtns,
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
        time: timeNow
      };
      setSimulatedChatHistory(prev => [...prev, patientMsg, botMsg]);
      return;
    }

    const unmatchedMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: "bot",
      text: `Maaf, pesan Anda belum kami kenali. Silakan ketik angka pilihan menu (1-${activeList.length || buttonsList.length || 8}) atau ketik 0 untuk kembali.`,
      buttons: activeList.length > 0 ? activeList : buttonsList.filter(b => b.label.trim()),
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

  // Recursive Accordion Menu Tree Renderer for N-Level Nesting
  const renderMenuTree = (
    items: BotButton[], 
    parentPath: number[] = [], 
    level: number = 1
  ): React.ReactNode => {
    if (!items || items.length === 0) {
      return (
        <div className="p-3 text-center border border-dashed rounded-lg text-muted-foreground text-[11px] bg-muted/20">
          Belum ada sub-pilihan di Level {level}. Klik tombol "+ Tambah Sub-Pilihan" untuk menambahkan.
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        {items.map((btn, idx) => {
          const currentPath = [...parentPath, idx];
          const pathKey = currentPath.join("-");
          const isOpen = !!expandedPaths[pathKey];
          const displayNum = currentPath.map(p => p + 1).join(".");

          // Visual styles differentiated per nesting depth
          const levelColors: Record<number, { border: string; bgHeader: string; badge: string; levelBadge: string }> = {
            1: {
              border: "border-border/80 hover:border-[#00A389]/60",
              bgHeader: isOpen ? "bg-teal-50/70 dark:bg-teal-950/40" : "bg-muted/30 hover:bg-muted/50",
              badge: "bg-[#00A389] text-white",
              levelBadge: "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800"
            },
            2: {
              border: "border-teal-200/90 dark:border-teal-800/80 hover:border-teal-400",
              bgHeader: isOpen ? "bg-teal-50/50 dark:bg-teal-950/30" : "bg-background hover:bg-muted/40",
              badge: "bg-teal-700 text-white",
              levelBadge: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
            },
            3: {
              border: "border-emerald-200/90 dark:border-emerald-800/80 hover:border-emerald-400",
              bgHeader: isOpen ? "bg-emerald-50/40 dark:bg-emerald-950/30" : "bg-background hover:bg-muted/30",
              badge: "bg-emerald-700 text-white",
              levelBadge: "bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800"
            }
          };

          const currentStyle = levelColors[level] || {
            border: "border-cyan-200/90 dark:border-cyan-800/80 hover:border-cyan-400",
            bgHeader: isOpen ? "bg-cyan-50/30 dark:bg-cyan-950/20" : "bg-background hover:bg-muted/30",
            badge: "bg-cyan-700 text-white",
            levelBadge: "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800"
          };

          return (
            <div 
              key={btn.id || pathKey} 
              className={cn(
                "rounded-xl border transition-all duration-200 shadow-2xs overflow-hidden",
                currentStyle.border,
                isOpen ? "ring-1 ring-[#00A389]/30 shadow-xs" : ""
              )}
            >
              {/* Accordion Header (Click anywhere to expand/collapse) */}
              <div 
                onClick={() => toggleAccordion(pathKey)}
                className={cn(
                  "p-3 flex items-center justify-between gap-2.5 cursor-pointer transition-colors select-none",
                  currentStyle.bgHeader
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Number Badge */}
                  <span className={cn(
                    "h-6 px-1.5 min-w-[24px] rounded-md text-[11px] flex items-center justify-center font-mono font-bold shrink-0 shadow-2xs",
                    currentStyle.badge
                  )}>
                    {displayNum}
                  </span>

                  {/* Title & Level Badge & Snippet */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground truncate max-w-[220px] sm:max-w-[340px]">
                        {btn.label ? btn.label : <span className="text-muted-foreground italic font-normal">(Belum ada judul pilihan)</span>}
                      </span>

                      {/* Level Indicator Pill */}
                      <span className={cn(
                        "text-[9px] font-semibold px-1.5 py-0.2 rounded border font-mono",
                        currentStyle.levelBadge
                      )}>
                        Lvl {level}
                      </span>

                      {/* Branch vs Leaf Type Badge */}
                      {btn.hasSubMenu ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                          <Layers className="w-3 h-3 text-[#00A389]" />
                          Sub-Menu ({(btn.subOptions || []).length} pilihan)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                          <MessageSquare className="w-3 h-3 text-[#00A389]" />
                          Jawaban Langsung
                        </span>
                      )}
                    </div>

                    {/* Preview description snippet when collapsed */}
                    {!isOpen && btn.description && (
                      <p className="text-[11px] text-muted-foreground truncate max-w-[380px] mt-0.5">
                        {btn.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side controls */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Quick Add Sub-Item Button if hasSubMenu */}
                  {btn.hasSubMenu && (
                    <button
                      type="button"
                      onClick={() => {
                        const { newItems, createdPathKey } = addSubItemAtPath(buttonsList, currentPath);
                        setButtonsList(newItems);
                        setExpandedPaths(prev => ({
                          ...prev,
                          [pathKey]: true,
                          [createdPathKey]: true
                        }));
                      }}
                      className="h-6 px-2 text-[10px] font-medium bg-[#00A389]/10 hover:bg-[#00A389]/20 text-[#007A67] dark:text-teal-300 rounded flex items-center gap-1 transition-colors cursor-pointer"
                      title={`Tambah sub-pilihan ke dalam pilihan ${displayNum}`}
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden sm:inline">Sub-Pilihan</span>
                    </button>
                  )}

                  {/* Delete Option Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = removeItemAtPath(buttonsList, currentPath);
                      setButtonsList(newItems);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                    title="Hapus Pilihan Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Chevron Toggle Icon */}
                  <button
                    type="button"
                    onClick={() => toggleAccordion(pathKey)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded transition-transform cursor-pointer"
                  >
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      isOpen ? "rotate-180 text-[#00A389]" : ""
                    )} />
                  </button>
                </div>
              </div>

              {/* Accordion Body Content */}
              {isOpen && (
                <div className="p-3.5 pt-2 bg-background/90 space-y-3 border-t border-border/60">
                  
                  {/* Inputs: Title & Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-6">
                      <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                        Judul Pilihan Menu <span className="text-[#00A389] font-mono">({displayNum})</span>
                      </Label>
                      <Input
                        placeholder={`Contoh: Jadwal Praktik Dokter`}
                        value={btn.label}
                        onChange={(e) => {
                          const updated = updateItemAtPath(buttonsList, currentPath, "label", e.target.value);
                          setButtonsList(updated);
                        }}
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
                        onChange={(e) => {
                          const updated = updateItemAtPath(buttonsList, currentPath, "description", e.target.value);
                          setButtonsList(updated);
                        }}
                        className="h-9 text-xs bg-background border-border"
                      />
                    </div>
                  </div>

                  {/* Option Mode Selector: Direct Reply vs Nested Sub-Menu */}
                  <div className="pt-2 border-t border-border/40 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/30 p-2 rounded-lg border border-border/60">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-foreground">
                          Tipe Respon Pilihan #{displayNum}:
                        </span>
                        {btn.hasSubMenu && (
                          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded-full">
                            {(btn.subOptions || []).length} Sub-Pilihan di Level {level + 1}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 bg-background p-0.5 rounded-md border border-border self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = updateItemAtPath(buttonsList, currentPath, "hasSubMenu", false);
                            setButtonsList(updated);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer",
                            !btn.hasSubMenu ? "bg-[#00A389] text-white shadow-2xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <MessageSquare className="w-3 h-3" />
                          Jawaban Langsung
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            let updated = updateItemAtPath(buttonsList, currentPath, "hasSubMenu", true);
                            if (!btn.subOptions || btn.subOptions.length === 0) {
                              const initialChild: BotButton = {
                                id: Math.random().toString(36).substring(2, 9),
                                label: "",
                                description: "",
                                type: "LIST_ITEM",
                                actionType: "DIRECT_REPLY",
                                replyMessage: "",
                                includeBackToMenu: true,
                                value: "1",
                                hasSubMenu: false,
                                subOptions: []
                              };
                              updated = updateItemAtPath(updated, currentPath, "subOptions", [initialChild]);
                              setExpandedPaths(prev => ({
                                ...prev,
                                [`${pathKey}-0`]: true
                              }));
                            }
                            setButtonsList(updated);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer",
                            btn.hasSubMenu ? "bg-[#00A389] text-white shadow-2xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Layers className="w-3 h-3" />
                          Sub-Menu Bersarang (Level {level + 1})
                        </button>
                      </div>
                    </div>

                    {/* Sub-Menu Bersarang Editor (Recursive N-Level) */}
                    {btn.hasSubMenu ? (
                      <div className="space-y-3 bg-teal-50/40 dark:bg-teal-950/20 p-3 rounded-xl border border-teal-200/70 dark:border-teal-800/60 mt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-teal-200/60 dark:border-teal-800/40 pb-2">
                          <span className="text-[11px] font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#00A389]" />
                            Daftar Sub-Pilihan (Level {level + 1}) di Bawah "{btn.label || `Opsi ${displayNum}`}":
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono bg-background px-1.5 py-0.5 rounded border">
                            Auto '0' = Kembali ke Level {level}
                          </span>
                        </div>

                        {/* Sub-menu Intro prompt text */}
                        <div>
                          <Label className="text-[11px] font-medium text-muted-foreground block mb-1">
                            Pesan Pengantar Sub-Menu Level {level + 1}:
                          </Label>
                          <Input
                            placeholder={`Contoh: Silakan pilih informasi untuk ${btn.label || 'layanan ini'}:`}
                            value={btn.replyMessage}
                            onChange={(e) => {
                              const updated = updateItemAtPath(buttonsList, currentPath, "replyMessage", e.target.value);
                              setButtonsList(updated);
                            }}
                            className="h-8.5 text-xs bg-background border-border"
                          />
                        </div>

                        {/* RECURSIVE CALL: Render Children Items at next level! */}
                        <div className="pt-1">
                          {renderMenuTree(btn.subOptions || [], currentPath, level + 1)}
                        </div>

                        {/* Button to add child item */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const { newItems, createdPathKey } = addSubItemAtPath(buttonsList, currentPath);
                            setButtonsList(newItems);
                            setExpandedPaths(prev => ({
                              ...prev,
                              [createdPathKey]: true
                            }));
                          }}
                          className="w-full h-8 text-[11px] border-dashed border-[#00A389]/60 text-[#00A389] hover:bg-[#EBF8F5] dark:hover:bg-[#1A332E] cursor-pointer"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Tambah Sub-Pilihan di Level {level + 1} ({(btn.subOptions || []).length} aktif)
                        </Button>
                      </div>
                    ) : (
                      /* Direct reply message editor */
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-[#00A389]" />
                            Pesan Balasan yang Muncul Saat Pasien Memilih Opsi #{displayNum}:
                          </Label>
                          <span className="text-[10px] text-muted-foreground italic">
                            Ketik isi balasan detail di bawah
                          </span>
                        </div>

                        <textarea
                          rows={3}
                          placeholder={`Tulis isi informasi detail untuk pilihan "${btn.label || displayNum}"...\nContoh:\n*Jadwal Praktik Dokter RS Avisena:*\n• Poli Anak: 08.00 - 12.00 WIB\n• Poli Gigi: 13.00 - 17.00 WIB`}
                          value={btn.replyMessage}
                          onChange={(e) => {
                            const updated = updateItemAtPath(buttonsList, currentPath, "replyMessage", e.target.value);
                            setButtonsList(updated);
                          }}
                          className="w-full p-2.5 rounded-lg border border-border bg-background text-xs font-sans focus:outline-none focus:ring-1 focus:ring-primary/60 resize-none leading-relaxed"
                        />

                        <div className="flex items-center justify-between pt-0.5">
                          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={btn.includeBackToMenu !== false}
                              onChange={(e) => {
                                const updated = updateItemAtPath(buttonsList, currentPath, "includeBackToMenu", e.target.checked);
                                setButtonsList(updated);
                              }}
                              className="w-3.5 h-3.5 rounded text-[#00A389] focus:ring-[#00A389]"
                            />
                            <span>Sertakan panduan otomatis: <b>"Ketik 0 untuk kembali ke menu sebelumnya, atau MENU untuk ke Menu Utama"</b></span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    );
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
                const parsed = typeof rule.buttons === 'string' ? JSON.parse(rule.buttons) : rule.buttons;
                if (Array.isArray(parsed)) {
                  ruleButtons = parsed;
                } else if (parsed && typeof parsed === 'object') {
                  ruleButtons = Array.isArray(parsed.items) ? parsed.items : [];
                }
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
                            {ruleButtons.length} Menu Angka (1-{ruleButtons.length})
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

                {/* Format Menu Pilihan Pasien (Accordion Bersarang N-Level) */}
                <div className="space-y-3 pt-3 pb-1 border-t border-border/70">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <List className="w-3.5 h-3.5 text-[#00A389]" />
                        Daftar Pilihan Menu Pasien (Accordion Bersarang)
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Klik pilihan untuk membuka/mengubah isi accordion. Mendukung sub-menu bersarang tak terbatas (Level 1, 2, 3...) dan ketik 0 untuk kembali ke menu sebelumnya.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={expandAllAccordions}
                        className="text-[10px] h-7 px-2 font-medium border-border hover:bg-muted/70 cursor-pointer"
                        title="Buka seluruh accordion pilihan"
                      >
                        <ChevronsUpDown className="w-3 h-3 mr-1" />
                        Buka Semua
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={collapseAllAccordions}
                        className="text-[10px] h-7 px-2 font-medium border-border hover:bg-muted/70 cursor-pointer"
                        title="Tutup seluruh accordion pilihan"
                      >
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Tutup Semua
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={handleLoadHospital8MenuPreset}
                        className="bg-[#00A389] hover:bg-[#008771] text-white text-[10px] h-7 px-2.5 font-medium shadow-xs shrink-0 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Muat 8 Menu Standar RS
                      </Button>
                    </div>
                  </div>

                  {/* Render Recursive Accordion Tree */}
                  {buttonsList.length > 0 ? (
                    <div className="pt-1">
                      {renderMenuTree(buttonsList, [], 1)}
                    </div>
                  ) : (
                    <div className="p-4 text-center border border-dashed rounded-xl text-muted-foreground text-xs bg-muted/20 space-y-1.5">
                      <p className="font-semibold text-foreground">Belum ada pilihan menu yang ditambahkan</p>
                      <p className="text-[11px]">Tambahkan pilihan menu utama baru atau klik "Muat 8 Menu Standar RS" untuk template siap pakai.</p>
                    </div>
                  )}

                  {/* Add Root Menu Button */}
                  {buttonsList.length < 50 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddRootOption}
                      className="w-full h-9 text-xs border-dashed border-[#00A389]/60 text-[#00A389] hover:bg-[#EBF8F5] dark:hover:bg-[#1A332E] font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Tambah Pilihan Menu Utama Baru ({buttonsList.length} menu aktif)
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

            {/* Right Section: Realistis WhatsApp Multi-Turn Chat Simulation with N-Level Navigation (5 of 12 Cols) */}
            <div className="lg:col-span-5 bg-[#EFEAE2] dark:bg-[#0B141A] p-5 border-t lg:border-t-0 lg:border-l border-border flex flex-col justify-between max-h-[92vh] relative">
              <div>
                {/* Phone Header with Level Breadcrumbs and 0 Back Button */}
                <div className="bg-[#008069] text-white p-3 rounded-t-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs leading-none truncate">
                        {selectedSessionId !== 'ALL' ? selectedSessionId : 'Avisena Bot'}
                      </p>
                      <p className="text-[10px] text-teal-100 mt-0.5 truncate flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
                        {simulatedNavPath.length === 0 ? "Menu Utama (Level 1)" : `Level ${simulatedNavPath.length + 1} Sub-Menu`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {simulatedNavPath.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handlePreviewOptionClick({ id: 'back', label: '0. Kembali', replyMessage: '', value: '0' })}
                        className="text-white/95 hover:text-white flex items-center gap-1 text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md transition-all font-medium cursor-pointer"
                        title="Kembali ke level sebelumnya (Ketik 0)"
                      >
                        <RotateCcw className="w-3 h-3" />
                        0 Kembali
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => resetChatSimulation()}
                      className="text-white/80 hover:text-white flex items-center gap-1 text-[10px] bg-white/10 px-2 py-1 rounded-md transition-all hover:bg-white/20 cursor-pointer"
                      title="Ulangi simulasi dari awal"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Phone Screen Chat Body (Scrollable Chat Thread) */}
                <div className="bg-[#EFEAE2] dark:bg-[#0B141A] p-3.5 space-y-3 min-h-[360px] max-h-[480px] overflow-y-auto rounded-b-xl border border-t-0 border-[#008069]/20 shadow-inner relative">
                  
                  {/* Navigation Breadcrumb inside WhatsApp chat if nested */}
                  {simulatedNavPath.length > 0 && (
                    <div className="bg-white/90 dark:bg-slate-800/90 py-1.5 px-2.5 rounded-lg text-[10px] text-muted-foreground flex items-center gap-1.5 shadow-2xs border border-border/50 overflow-x-auto">
                      <span className="font-bold text-[#00A389] shrink-0">Posisi Menu:</span>
                      {resolveSimulatedState(buttonsList, simulatedNavPath).breadcrumbTitles.map((crumb, cIdx, arr) => (
                        <div key={cIdx} className="flex items-center gap-1 shrink-0">
                          {cIdx > 0 && <span className="text-slate-400 font-bold">›</span>}
                          <span className={cn(
                            cIdx === arr.length - 1 ? "font-bold text-foreground bg-teal-50 dark:bg-teal-950/60 text-[#006D5B] dark:text-teal-300 px-1 rounded" : "text-muted-foreground"
                          )}>
                            {crumb}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

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

                        {/* Interactive Action Pills */}
                        {msg.sender === "bot" && msg.buttons && msg.buttons.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 space-y-1.5 mt-2">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                              <span>Pilihan Interaktif:</span>
                              <span className="text-[9px] text-[#00A389]">Klik opsi atau ketik angka</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.buttons.map((btn, bIdx) => (
                                <button
                                  key={bIdx}
                                  type="button"
                                  onClick={() => handlePreviewOptionClick(btn, bIdx)}
                                  className={cn(
                                    "text-left py-1 px-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-2xs active:scale-[0.98] border cursor-pointer",
                                    btn.value === '0' || btn.id === 'back'
                                      ? "bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800"
                                      : btn.value === 'menu' || btn.id === 'menu-root'
                                      ? "bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800"
                                      : "bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-[#006D5B] dark:text-teal-300 border-teal-200/80 dark:border-teal-800"
                                  )}
                                >
                                  {btn.value === 'menu' || btn.id === 'menu-root' ? (
                                    <span>🏠 Ketik 'MENU'</span>
                                  ) : btn.value === '0' || btn.id === 'back' ? (
                                    <span className="flex items-center gap-1">
                                      <RotateCcw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      <span>0. {btn.label.replace(/^0[\.\s\-]+/, '') || "Kembali"}</span>
                                    </span>
                                  ) : (
                                    <>
                                      <span className="w-4 h-4 rounded-full bg-[#00A389] text-white text-[10px] flex items-center justify-center font-bold">
                                        {bIdx + 1}
                                      </span>
                                      <span>{btn.label.replace(/^\d+[\.\s\-]+/, '') || `Pilihan ${bIdx + 1}`}</span>
                                      {btn.hasSubMenu && <Layers className="w-2.5 h-2.5 ml-0.5 text-teal-600 dark:text-teal-400" />}
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
                    <span><b>Uji Coba:</b> Klik pilihan di atas atau ketik angka/kata kunci di kolom bawah!</span>
                  </p>

                </div>
              </div>

              {/* Patient Test Input Bar at bottom */}
              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Uji Ketik Pesan / Angka Pilihan:
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Ketik 1, 2... atau 0 untuk kembali</span>
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
                    placeholder={`Ketik angka pilihan atau 0 untuk kembali...`}
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
