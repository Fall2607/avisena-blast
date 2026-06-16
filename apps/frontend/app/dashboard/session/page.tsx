"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, RefreshCw, Trash2, CheckCircle2, AlertCircle, Key } from "lucide-react";
import api from "@/lib/axios";

import Cookies from 'js-cookie';

export default function SessionPage() {
  const [sessionName, setSessionName] = useState("");
  const [status, setStatus] = useState<string>("DISCONNECTED");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usePairingCode, setUsePairingCode] = useState(false);
  const [inputPhoneNumber, setInputPhoneNumber] = useState("");

  const startQrStream = (name: string) => {
    const token = Cookies.get('token');
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/wa/session/${name}/qr?token=${token}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.qr) {
        setQrCode(data.qr);
        setStatus("CONNECTING");
      }
      if (data.connected) {
        setStatus("CONNECTED");
        checkStatus(name);
        eventSource.close();
      }
      if (data.error) {
        setStatus("DISCONNECTED");
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
  };

  const checkStatus = async (name: string) => {
    try {
      const res = await api.get(`/wa/session/${name}/status`);
      setStatus(res.data.status);
      setPhoneNumber(res.data.phoneNumber);

      if (res.data.status === "CONNECTING") {
        startQrStream(name);
      }
    } catch (e) {
      setStatus("DISCONNECTED");
    }
  };

  const connectSession = async () => {
    if (!sessionName) return;
    setLoading(true);
    setQrCode(null);
    try {
      await api.post("/wa/session", { 
        sessionName,
        phoneNumber: usePairingCode ? inputPhoneNumber : undefined
      });
      startQrStream(sessionName);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const disconnectSession = async () => {
    if (!sessionName) return;
    setLoading(true);
    try {
      await api.delete(`/wa/session/${sessionName}`);
      setStatus("DISCONNECTED");
      setQrCode(null);
      setPhoneNumber(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-gradient">WhatsApp Session</h1>
        <p className="text-muted-foreground text-lg">
          Hubungkan nomor WhatsApp yang akan digunakan untuk mengirim blast.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Device Connection
          </CardTitle>
          <CardDescription>
            Masukkan nama sesi (bebas) untuk mengidentifikasi device ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionName">Session Name</Label>
            <div className="flex gap-2">
              <Input 
                id="sessionName" 
                placeholder="misal: CS-Utama" 
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                disabled={status === "CONNECTED" || status === "CONNECTING"}
              />
              <Button 
                variant="outline" 
                onClick={() => checkStatus(sessionName)}
                disabled={!sessionName}
              >
                Cek Status
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="usePairingCode" 
                checked={usePairingCode}
                onChange={(e) => setUsePairingCode(e.target.checked)}
                disabled={status === "CONNECTED" || status === "CONNECTING"}
                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
              />
              <Label htmlFor="usePairingCode">Gunakan Nomor Telepon (Tanpa Scan QR)</Label>
            </div>
          </div>

          {usePairingCode && (
            <div className="space-y-2">
              <Label htmlFor="inputPhoneNumber">Nomor Telepon WhatsApp Target</Label>
              <Input 
                id="inputPhoneNumber" 
                placeholder="misal: 6281234567890" 
                value={inputPhoneNumber}
                onChange={(e) => setInputPhoneNumber(e.target.value)}
                disabled={status === "CONNECTED" || status === "CONNECTING"}
              />
              <p className="text-xs text-muted-foreground">Gunakan kode negara (62) tanpa simbol + atau spasi.</p>
            </div>
          )}

          <div className="mt-6 border rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px] bg-slate-50 dark:bg-slate-900">
            {status === "CONNECTED" ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-600">Terhubung</h3>
                  <p className="text-muted-foreground mt-1">
                    WhatsApp terhubung ke nomor: <span className="font-semibold">{phoneNumber}</span>
                  </p>
                </div>
              </div>
            ) : status === "CONNECTING" && qrCode ? (
              <div className="text-center space-y-4">
                {qrCode.startsWith('PAIRING_CODE:') ? (
                  <>
                    <h3 className="text-lg font-medium text-primary flex items-center justify-center gap-2">
                      <Key className="w-5 h-5" />
                      Masukkan Kode Ini di HP Anda
                    </h3>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border-2 border-primary/20 inline-block transform transition-transform hover:scale-105">
                      <span className="text-5xl font-extrabold tracking-widest text-gradient">
                        {qrCode.split(':')[1]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Buka WhatsApp {'>'} Linked Devices {'>'} Link with phone number
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium">Scan QR Code ini dengan WhatsApp Anda</h3>
                    <div className="bg-white p-4 rounded-lg shadow-sm inline-block">
                      <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Buka WhatsApp {'>'} Linked Devices {'>'} Link a Device
                    </p>
                  </>
                )}
              </div>
            ) : status === "CONNECTING" && !qrCode ? (
              <div className="text-center space-y-4 text-muted-foreground">
                <RefreshCw className="w-10 h-10 animate-spin mx-auto text-primary" />
                <p>Membuat sesi dan mengambil QR Code...</p>
              </div>
            ) : (
              <div className="text-center space-y-4 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto opacity-20" />
                <p>Silakan klik Connect untuk menghubungkan WhatsApp.</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-6">
          {status === "CONNECTED" ? (
            <Button variant="destructive" onClick={disconnectSession} disabled={loading}>
              <Trash2 className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button onClick={connectSession} disabled={!sessionName || loading}>
              <Smartphone className="w-4 h-4 mr-2" />
              Connect Device
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
