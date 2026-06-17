import { NextRequest, NextResponse } from 'next/server';

async function proxyRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path ? params.path.join('/') : '';
  // Selalu evaluasi variabel secara realtime (runtime)
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const targetUrl = `${backendUrl}/api/${path}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  // Hapus host agar tidak ditolak oleh server backend
  headers.delete('host');
  headers.delete('connection');

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? await req.blob() : undefined,
      // Penting: Abaikan error sertifikat jika sewaktu-waktu backend HTTPS
      cache: 'no-store',
    });

    // Gunakan streaming (response.body) langsung, JANGAN di-buffer pakai .blob()!
    // Ini sangat krusial untuk Server-Sent Events (SSE) / QR Code scanner
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding'); // Biarkan Next.js yang mengatur kompresi
    
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Proxy Error:', error.message);
    return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 502 });
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, { params: await props.params });
}

export async function POST(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, { params: await props.params });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, { params: await props.params });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, { params: await props.params });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, { params: await props.params });
}
