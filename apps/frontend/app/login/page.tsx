"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Mail, 
  Lock, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data.user, response.data.token);
      
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-teal-50/25 to-blue-50/30 dark:from-[#090E17] dark:via-[#0F172A] dark:to-[#0B1528] p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden min-h-[520px]">
        
        {/* Left Column: Premium Healthcare SaaS Showcase with Crisp White Logo */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[#0B428C] via-[#0E5198] to-[#00A389] text-white relative overflow-hidden">
          {/* Subtle ambient lighting */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-black/20 blur-3xl pointer-events-none" />

          {/* Pure White Vector Logo - Seamless & Box-Free */}
          <div className="relative z-10">
            <div className="relative h-14 w-52">
              <Image 
                src="/avisena-logo-white.png" 
                alt="Avisena Healthcare Group" 
                fill 
                className="object-contain object-left"
                priority
              />
            </div>
          </div>

          {/* Core Content: Clean, Structured & Informative */}
          <div className="relative z-10 my-auto py-8 space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                Enterprise WhatsApp Broadcast Console
              </h2>
              <p className="text-white/85 text-sm leading-relaxed">
                Empower patient outreach, clinical schedules, and official hospital broadcasts with intelligent rate-limiting and reliable automated queue dispatch.
              </p>
            </div>

            {/* Structured Value Points */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-white/90 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Multi-Session Baileys Engine with QR & Pairing Link</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white/90 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>BullMQ Redis Queue with Dynamic Anti-Ban Delays</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white/90 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Audience Grouping, Variable Tags & Delivery Logs</span>
              </div>
            </div>
          </div>

          {/* Creator Branding: Fallen~ */}
          <div className="pt-6 relative z-10 border-t border-white/15 flex items-center justify-between text-xs text-white/80">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              Engineered with precision by <strong className="font-bold text-white tracking-wide">Fallen~</strong>
            </span>
            <span className="text-[11px] text-white/60 font-mono">v1.0.0</span>
          </div>
        </div>

        {/* Right Column: Clean, Polished Sign In Form */}
        <div className="flex flex-col justify-between p-8 sm:p-12 bg-card">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div className="relative h-12 w-48 mb-2">
              <Image 
                src="/avisena-logo.png" 
                alt="Avisena Healthcare Group" 
                fill 
                className="object-contain"
                priority
              />
            </div>
            <p className="text-xs text-muted-foreground font-medium">WhatsApp Broadcast Portal</p>
          </div>

          <div className="my-auto space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Sign In
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your administrative credentials to continue.
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3.5 rounded-lg flex items-center gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="admin@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-background border-border focus:ring-primary focus:border-primary text-sm rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-background border-border focus:ring-primary focus:border-primary text-sm rounded-lg"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-[#00A389] hover:bg-[#008771] text-white font-medium shadow-sm transition-all text-sm rounded-lg mt-2 flex items-center justify-center gap-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Mobile Footer Credit */}
          <div className="pt-6 border-t border-border/50 text-center lg:hidden mt-6">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-[#00A389]" />
              Engineered by <strong className="text-foreground font-semibold">Fallen~</strong>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-[#00A389]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
