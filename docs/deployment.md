# Deployment Guide: WhatsApp Blast Enterprise

Sistem ini dirancang dengan arsitektur Monorepo dan micro-services (Backend API, Baileys Worker, PostgreSQL, Redis, dan Frontend Next.js).

## 1. Persiapan Server (Ubuntu Server 22.04 LTS)

### Instalasi Dependensi Dasar
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

### Instalasi Node.js (v20) & Npm
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-install -y nodejs
```

### Instalasi Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

---

## 2. Setup Proyek

Clone repository ke server:
```bash
git clone <url-repo-anda> blast-avisena
cd blast-avisena
```

### Konfigurasi `.env`
Buat file `.env` di `apps/backend/.env` dan sesuaikan nilainya:
```env
DATABASE_URL="postgresql://admin:password@localhost:5434/whatsapp_blast?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6381
JWT_SECRET="ganti_dengan_secret_key_yang_sangat_panjang"
PORT=5000
```
Buat file `.env` di `apps/frontend/.env`:
```env
NEXT_PUBLIC_API_URL="https://api.domain-anda.com/api"
```

---

## 3. Menjalankan Infrastruktur (PostgreSQL & Redis)

Sistem menggunakan Docker Compose untuk database dan queue caching.
```bash
docker compose up -d
```

---

## 4. Build & Run Backend

1. Install dependensi dari root monorepo:
   ```bash
   npm install
   ```
2. Jalankan sinkronisasi database (Prisma):
   ```bash
   npm run db:push --workspace=backend
   ```
3. Build TypeScript ke JavaScript:
   ```bash
   npm run build --workspace=backend
   ```
4. Jalankan menggunakan **PM2** (Process Manager) agar selalu hidup:
   ```bash
   sudo npm install -g pm2
   pm2 start apps/backend/dist/server.js --name "blast-backend"
   pm2 save
   ```

---

## 5. Build & Run Frontend

1. Build Next.js 15 App:
   ```bash
   npm run build --workspace=frontend
   ```
2. Jalankan dengan PM2:
   ```bash
   pm2 start npm --name "blast-frontend" -- run start --workspace=frontend
   pm2 save
   ```

---

## 6. Setup Reverse Proxy (Nginx)

Untuk keamanan dan domain, gunakan Nginx:
```bash
sudo apt install nginx -y
```

Buat konfigurasi di `/etc/nginx/sites-available/blast`:
```nginx
server {
    listen 80;
    server_name dash.domain-anda.com;

    location / {
        proxy_pass http://localhost:3000; # Frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name api.domain-anda.com;

    location / {
        proxy_pass http://localhost:5000; # Backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Penting untuk SSE (Server-Sent Events) QR Code
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

Aktifkan konfigurasi dan install SSL/TLS via Let's Encrypt (Certbot):
```bash
sudo ln -s /etc/nginx/sites-available/blast /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo snap install --classic certbot
sudo certbot --nginx -d dash.domain-anda.com -d api.domain-anda.com
```

---

## Best Practice Skalabilitas 100.000 Kontak

1. **Connection Pooling**: Jika jumlah request backend sangat tinggi (misal > 500 req/s), instal **PgBouncer** di depan PostgreSQL agar koneksi database tidak kehabisan *slot*.
2. **Worker Terpisah**: Pada `apps/backend/src/server.ts`, kita meng-import `./jobs/worker.ts`. Untuk skala raksasa, jalankan API Server (REST) dan Worker (BullMQ) pada container/server yang **berbeda** agar konsumsi CPU pemrosesan antrean pesan WhatsApp tidak mengganggu REST API frontend.
3. **Multi-Session WhatsApp**: Jangan gunakan 1 nomor WhatsApp untuk 100.000 pesan berturut-turut walau ada delay, karena tetap berisiko *banned*. Gunakan arsitektur *Round Robin* pada `worker.ts` untuk merotasi `sessionId` dari 5-10 nomor pengirim secara dinamis.
