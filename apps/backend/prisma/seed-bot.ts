import { PrismaClient } from '@prisma/client';

export const botRulesSeedData = [
  {
    id: 'adb435f8-c84d-4cbf-b7d3-8fa4ca02cc7c',
    name: 'Menu Layanan Rumah Sakit',
    triggerType: 'EXACT',
    keywords: 'Test1, menu, halo, layanan, info',
    response: 'Halo, Sahabat Avisena!\nSelamat datang di layanan WhatsApp RSU AVISENA. Silakan pilih layanan yang Anda butuhkan melalui daftar menu di bawah.\n',
    buttons: JSON.stringify({
      menuType: 'TEXT_NUMBER',
      items: [
        {
          id: 'opt_1',
          label: 'Jadwal Dokter',
          description: '',
          type: 'LIST_ITEM',
          actionType: 'DIRECT_REPLY',
          replyMessage: '*Jadwal Praktik Dokter RS Avisena:*\nSilakan pilih poliklinik spesialis yang ingin Anda tanyakan:',
          includeBackToMenu: true,
          value: '1',
          hasSubMenu: true,
          subOptions: [
            {
              id: 'sub_1',
              label: 'Jadwal praktik dokter spesialis harian',
              description: '',
              type: 'QUICK_REPLY',
              actionType: 'DIRECT_REPLY',
              replyMessage: '',
              includeBackToMenu: true,
              value: '1',
              hasSubMenu: true,
              subOptions: [
                { id: 'wwutwsi', label: 'Poliklinik Penyakit Dalam', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '1', hasSubMenu: false },
                { id: 'rrioatu', label: 'Poliklinik Kandungan dan Kebidanan', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '2', hasSubMenu: false },
                { id: 'qrg0a3h', label: 'Poliklinik Jantung', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '3', hasSubMenu: false },
                { id: 'ln33055', label: 'Poliklinik Bedah Umum', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '4', hasSubMenu: false },
                { id: 'sc1etwr', label: 'Poliklinik Urologi', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '5', hasSubMenu: false },
                { id: 'abgs2t3', label: 'Poliklinik Orthopedi', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '6', hasSubMenu: false },
                { id: 'ink5a7m', label: 'Poliklinik Anak', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '7', hasSubMenu: false },
                { id: 'tewejzp', label: 'Poliklinik Bedah Mulut', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '8', hasSubMenu: false },
                { id: '1afcsal', label: 'Poliklinik Gigi', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '9', hasSubMenu: false },
                { id: 'xqds3vv', label: 'Poliklinik Psikiatri', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '10', hasSubMenu: false },
                { id: 'a9v13ud', label: 'Poliklinik Saraf', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '11', hasSubMenu: false },
                { id: '8r3kfsa', label: 'Poliklinik Mata', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '12', hasSubMenu: false }
              ]
            },
            {
              id: 'sub_7',
              label: 'Kuota dokter harian',
              description: '',
              type: 'QUICK_REPLY',
              actionType: 'DIRECT_REPLY',
              replyMessage: '',
              includeBackToMenu: true,
              value: '7',
              hasSubMenu: false
            }
          ]
        },
        {
          id: 'opt_2',
          label: 'Pendaftaran Pasien Poliklinik',
          description: '',
          type: 'LIST_ITEM',
          actionType: 'DIRECT_REPLY',
          replyMessage: '*Pendaftaran & Antrean Klinik Avisena:*\n\n1. Pendaftaran online dibuka H-1 pemeriksaan melalui portal website resmi kami.\n2. Siapkan nomor RM (Rekam Medis) atau NIK KTP Anda.\n3. Kuota poliklinik dibuka setiap hari pukul 06.00 WIB.\n4. Simpan nomor barcode antrean digital Anda untuk konfirmasi di mesin check-in RS.',
          includeBackToMenu: true,
          value: '2',
          hasSubMenu: true,
          subOptions: [
            { id: 'm0gke82', label: 'Daftar Pasien Umum', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '1', hasSubMenu: false },
            { id: '4ey3f8g', label: 'Daftar Pasien BPJS Kesehatan', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '2', hasSubMenu: false },
            { id: 'loolrru', label: 'Daftar Pasien BPJS Ketenagakerjaan', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '3', hasSubMenu: false },
            { id: '179b5le', label: 'Daftar Pasien Asuransi', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: 'List Rekanan Asuransi yg tersedia', includeBackToMenu: true, value: '4', hasSubMenu: true }
          ]
        },
        {
          id: 'opt_3',
          label: 'Perubahan Jadwal Kontrol',
          description: '',
          type: 'LIST_ITEM',
          actionType: 'DIRECT_REPLY',
          replyMessage: '*Monitoring Kamar Rawat Inap RS Avisena (Update Hari Ini):*\n\n• VVIP: 2 Bed Tersedia (Rp 1.200.000/hari)\n• VIP: 5 Bed Tersedia (Rp 850.000/hari)\n• Kelas 1: 8 Bed Tersedia (Rp 500.000/hari)\n• Kelas 2: 12 Bed Tersedia (Rp 350.000/hari)\n• Kelas 3: 15 Bed Tersedia (Tercover BPJS Kesehatan)\n• ICU / NICU: 3 Bed Siap Pakai',
          includeBackToMenu: true,
          value: '3',
          hasSubMenu: true,
          subOptions: [
            { id: 'af47mim', label: 'Jadwal Kontrol Terlewat', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '1', hasSubMenu: false },
            { id: 'ac19k61', label: 'Perubahan Jadwal Kontrol', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '2', hasSubMenu: false }
          ]
        },
        {
          id: 'opt_4',
          label: 'Layanan Penunjang Medis',
          description: '',
          type: 'LIST_ITEM',
          actionType: 'DIRECT_REPLY',
          replyMessage: 'Berikut adalah layanan penunjang medis kami :',
          includeBackToMenu: true,
          value: '4',
          hasSubMenu: true,
          subOptions: [
            { id: 'vlut90p', label: 'Laboratorium 24 Jam', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '1', hasSubMenu: false },
            { id: 'h55zpru', label: 'Radiologi 24 Jam', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '2', hasSubMenu: false },
            { id: 'h8idn7b', label: 'Farmasi 24 Jam', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '3', hasSubMenu: false }
          ]
        },
        {
          id: 'opt_5',
          label: 'Tarif Pemeriksaan',
          description: '',
          type: 'LIST_ITEM',
          actionType: 'DIRECT_REPLY',
          replyMessage: '',
          includeBackToMenu: true,
          value: '5',
          hasSubMenu: true,
          subOptions: [
            { id: 'oa602ga', label: 'Biaya konsultasi dokter spesialis', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '1', hasSubMenu: false },
            { id: '8kei8r7', label: 'Biaya pemeriksaan laboratorium', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '2', hasSubMenu: false },
            { id: '74qw1nd', label: 'Biaya pemeriksaan radiologi umum', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '3', hasSubMenu: false }
          ]
        },
        {
          id: 'opt_6',
          label: 'Layanan Medical Check-Up',
          description: '',
          type: 'LIST_ITEM',
          actionType: 'DIRECT_REPLY',
          replyMessage: '',
          includeBackToMenu: true,
          value: '6',
          hasSubMenu: true,
          subOptions: [
            { id: 'dov2a4t', label: 'Paket MCU Personal', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '1', hasSubMenu: false },
            { id: 'xvwzvq7', label: 'Paket MCU Perusahaan', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '2', hasSubMenu: false },
            { id: 't80lcxy', label: 'Surat Keterangan Sehat (Dokter Umum/Dokter Spesialis)', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '3', hasSubMenu: false },
            { id: 'ec49h96', label: 'Surat Keterangan Buta Warna', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '4', hasSubMenu: false }
          ]
        },
        {
          id: 'opt_7',
          label: 'Rawat Inap',
          description: '',
          type: 'LIST_ITEM',
          actionType: 'DIRECT_REPLY',
          replyMessage: '',
          includeBackToMenu: true,
          value: '7',
          hasSubMenu: true,
          subOptions: [
            { id: 'lmg6gsv', label: 'Ketersediaan kamar rawat inap', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '1', hasSubMenu: false },
            { id: 'h6sg26t', label: 'Fasilitas kamar rawat inap', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '2', hasSubMenu: false },
            { id: 'su17osz', label: 'Tarif rawat inap', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '3', hasSubMenu: false },
            { id: '55gpxn0', label: 'Jam besuk rawat inap', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '4', hasSubMenu: false }
          ]
        },
        {
          id: 'opt_8',
          label: 'Paket Pemeriksaan',
          description: '',
          type: 'LIST_ITEM',
          actionType: 'DIRECT_REPLY',
          replyMessage: '*Customer Care Avisena Healthcare:*\n\nPesan Anda telah diteruskan ke tim Customer Care kami. Mohon tunggu beberapa saat, petugas kami akan segera membalas chat Anda secara langsung. (Jam operasional operator: 08.00 - 20.00 WIB).',
          includeBackToMenu: true,
          value: '8',
          hasSubMenu: true,
          subOptions: [
            { id: 'iyhfd2d', label: 'Paket Persalinan Umum (Normal)', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '1', hasSubMenu: false },
            { id: 'xqxfgc8', label: 'Paket Persalinan Umum (SC)', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '2', hasSubMenu: false }
          ]
        },
        {
          id: '0ybc8du',
          label: 'Kontak Kami',
          description: '',
          type: 'LIST_ITEM',
          actionType: 'DIRECT_REPLY',
          replyMessage: '',
          includeBackToMenu: true,
          value: '9',
          hasSubMenu: true,
          subOptions: [
            { id: '4lrka0f', label: 'Nomor IGD', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '1', hasSubMenu: false },
            { id: 'n0km11g', label: 'Alamat', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '2', hasSubMenu: false },
            { id: 'vyus5xn', label: 'Link Google Maps', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '3', hasSubMenu: false }
          ]
        },
        {
          id: 'd967xxw',
          label: 'Layanan Customer Service Avisena',
          description: '',
          type: 'LIST_ITEM',
          actionType: 'DIRECT_REPLY',
          replyMessage: '',
          includeBackToMenu: true,
          value: '10',
          hasSubMenu: true,
          subOptions: [
            { id: 'l95h14v', label: 'Pertanyaan lain', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '1', hasSubMenu: false },
            { id: 'dme0kyu', label: 'Kritik, saran dan keluhan pelayanan', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '2', hasSubMenu: false },
            { id: 'lf4cai8', label: 'Keluhan pelayanan', description: '', type: 'LIST_ITEM', actionType: 'DIRECT_REPLY', replyMessage: '', includeBackToMenu: true, value: '3', hasSubMenu: false }
          ]
        }
      ]
    }),
    isActive: true,
    sessionId: null // null = Global / Berlaku untuk Semua Sesi WhatsApp
  }
];

export async function seedBotRules(prisma: PrismaClient) {
  console.log('Seeding Bot Rules...');
  for (const rule of botRulesSeedData) {
    await prisma.botRule.upsert({
      where: { id: rule.id },
      update: {
        name: rule.name,
        triggerType: rule.triggerType,
        keywords: rule.keywords,
        response: rule.response,
        buttons: rule.buttons,
        isActive: rule.isActive,
        sessionId: rule.sessionId
      },
      create: {
        id: rule.id,
        name: rule.name,
        triggerType: rule.triggerType,
        keywords: rule.keywords,
        response: rule.response,
        buttons: rule.buttons,
        isActive: rule.isActive,
        sessionId: rule.sessionId
      }
    });
    console.log(`- Bot Rule seeded: "${rule.name}" (${rule.keywords})`);
  }
  console.log('Bot Rules seeding completed.');
}

// Standalone execution support
if (require.main === module) {
  const prisma = new PrismaClient();
  seedBotRules(prisma)
    .catch((e) => {
      console.error('Error seeding bot rules:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
