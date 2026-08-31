'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  ArrowLeft,
  EyeOff,
  Database,
  Key,
  Cookie,
  Mail,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ponspot_theme');
    if (saved === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('ponspot_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('ponspot_theme', 'light');
      }
      return next;
    });
  };

  return (
    <div className={`min-h-screen overflow-y-auto cyber-grid-bg font-sans transition-colors duration-300 ${isDarkMode ? 'dark text-[#F5F8F3]' : 'text-[#243329]'}`}>
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-40 h-20 border-b border-white/60 dark:border-[#718D76]/30 bg-[#A4BAA2]/80 dark:bg-[#0c1611]/90 backdrop-blur-2xl px-4 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/60 hover:bg-white/90 dark:bg-[#14241d]/70 dark:hover:bg-[#1c3328] border border-white/80 dark:border-[#718D76]/35 rounded-xl text-xs font-mono font-bold transition-all shadow-sm text-[#243329] dark:text-emerald-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Game</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-wider text-[#243329] dark:text-white font-mono">PONSPOT</span>
            <span className="px-2 py-0.5 rounded-md bg-[#718D76]/20 dark:bg-emerald-500/20 text-[#718D76] dark:text-emerald-300 text-[10px] font-mono font-bold">
              PRIVACY POLICY
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white/50 hover:bg-white/80 border border-white/80 text-[#526256] hover:text-[#243329] dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 dark:text-amber-400 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#718D76]" />}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Banner Hero */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0c1611]/90 backdrop-blur-2xl border border-white/90 dark:border-[#718D76]/35 shadow-xl space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#718D76]/20 dark:bg-emerald-500/20 flex items-center justify-center text-[#718D76] dark:text-emerald-400 shadow-sm flex-shrink-0">
              <EyeOff className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#243329] dark:text-white tracking-tight">
                Privacy Policy & Data Transparency
              </h1>
              <p className="text-xs text-[#526256] dark:text-[#8fa596] font-mono mt-0.5">
                Prinsip Desentralisasi Penuh • Tanpa KYC • Zero Personal Data Tracking
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#3a4d3f] dark:text-slate-300 leading-relaxed pt-2">
            Di <strong className="text-[#243329] dark:text-white font-bold">Ponspot</strong>, kami memegang teguh filosofi desentralisasi Web3: privasi dan kedaulatan data pengguna adalah hak mutlak. Platform ini dirancang agar dapat digunakan tanpa perlu registrasi email, identitas pribadi (KTP/Paspor), atau data perbankan.
          </p>
        </motion.div>

        {/* Policy Sections */}
        <div className="space-y-6 text-xs sm:text-sm leading-relaxed font-sans text-[#3a4d3f] dark:text-slate-300">
          {/* 1. Zero Personal Data */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <ShieldCheck className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">1. Data Pribadi yang TIDAK Kami Kumpulkan</h2>
            </div>
            <p>
              Ponspot <strong>tidak pernah meminta atau mengumpulkan</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Nama lengkap asli, tanggal lahir, atau alamat domisili.</li>
              <li>Nomor telepon, email wajib, atau dokumen identitas (KTP, SIM, Paspor).</li>
              <li>Nomor rekening bank, kartu kredit, atau informasi fiat finansial.</li>
              <li><strong>Private Key atau Seed Phrase:</strong> Private key wallet Anda tidak pernah menyentuh server kami dan selalu aman di dalam ekstensi wallet Web3 Anda.</li>
            </ul>
          </section>

          {/* 2. Blockchain Public Data */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <Database className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">2. Data Publik Blockchain Robinhood Chain</h2>
            </div>
            <p>
              Ketika Anda melakukan interaksi on-chain (seperti persetujuan token, taruhan jackpot, atau klaim hadiah), transaksi Anda dicatat di buku besar publik <strong>Robinhood Chain (L2)</strong>. Data yang bersifat publik meliputi:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Alamat wallet publik (Public Key Address e.g. <code className="text-xs">0x...</code>).</li>
              <li>Hash transaksi (*TxHash*), jumlah token yang dipertaruhkan, dan riwayat kemenangan.</li>
            </ul>
            <p className="text-xs text-[#526256] dark:text-slate-400">
              Data ini dapat diverifikasi oleh siapa saja secara independen melalui block explorer publik seperti Robinhood Chain Blockscout.
            </p>
          </section>

          {/* 3. Local Storage & Client Cookies */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <Cookie className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">3. Penyimpanan Lokal Browser (*Local Storage*)</h2>
            </div>
            <p>
              Untuk memberikan pengalaman pengguna yang mulus dan personal, aplikasi menyimpan beberapa preferensi non-sensitif di memori lokal (*Local Storage*) browser Anda:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Profil Kustom:</strong> Nama tampilan (*Display Nickname*) dan avatar pilihan Anda.</li>
              <li><strong>Pengaturan Tampilan:</strong> Preferensi mode gelap/terang (*Dark/Light theme*) dan efek suara.</li>
              <li><strong>Persetujuan Syarat:</strong> Status konfirmasi Terms of Use & batas usia 18+.</li>
            </ul>
            <p className="text-xs text-[#526256] dark:text-slate-400">
              Data ini hanya tersimpan di perangkat Anda dan dapat dihapus kapan saja melalui menu pengaturan browser (*Clear Cache / Cookies*).
            </p>
          </section>

          {/* 4. Security & Inquiries */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <Mail className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">4. Keamanan & Layanan Dukungan</h2>
            </div>
            <p>
              Seluruh komunikasi jaringan antara antarmuka web dan server diamankan menggunakan enkripsi SSL/TLS tingkat tinggi. Jika Anda memiliki pertanyaan atau masukan terkait privasi dan desentralisasi, hubungi tim kami melalui:
            </p>
            <div className="pt-2">
              <a
                href="mailto:support@ponspot.com"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 text-xs font-mono font-bold text-[#718D76] dark:text-emerald-400 hover:underline"
              >
                <Mail className="w-4 h-4" />
                <span>support@ponspot.com</span>
              </a>
            </div>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="pt-6 border-t border-black/10 dark:border-white/10 flex items-center justify-between flex-wrap gap-4 text-xs font-mono">
          <Link
            href="/terms"
            className="flex items-center gap-1.5 text-[#718D76] dark:text-emerald-400 hover:underline font-bold"
          >
            <span>Baca Syarat & Ketentuan (Terms of Use)</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <span className="text-[#526256] dark:text-slate-400">© 2026 Ponspot. All rights reserved.</span>
        </div>
      </main>
    </div>
  );
}
