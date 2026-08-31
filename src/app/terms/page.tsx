'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  FileText,
  ArrowLeft,
  Flame,
  Lock,
  Scale,
  AlertTriangle,
  Coins,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { ROBINHOOD_CHAIN_CONFIG, PONS_TOKEN_ADDRESS } from '@/lib/web3/contracts';

export default function TermsOfUsePage() {
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
              TERMS OF USE
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
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#243329] dark:text-white tracking-tight">
                Terms of Use & General Conditions
              </h1>
              <p className="text-xs text-[#526256] dark:text-[#8fa596] font-mono mt-0.5">
                Terakhir Diperbarui: 31 Agustus 2026 • Berlaku Efektif untuk Seluruh Pengguna
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#3a4d3f] dark:text-slate-300 leading-relaxed pt-2">
            Harap baca syarat dan ketentuan ini secara cermat sebelum menghubungkan wallet Web3 Anda ke platform <strong className="text-[#243329] dark:text-white font-bold">Ponspot</strong>. Dengan mengakses, menghubungkan wallet, atau memasang taruhan token di platform ini, Anda secara hukum menyatakan bahwa Anda menyetujui seluruh ketentuan yang tercantum di bawah ini.
          </p>
        </motion.div>

        {/* Section Cards */}
        <div className="space-y-6 text-xs sm:text-sm leading-relaxed font-sans text-[#3a4d3f] dark:text-slate-300">
          {/* 1. Eligibility */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <ShieldCheck className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">1. Persyaratan Usia & Kepatuhan Hukum (18+)</h2>
            </div>
            <p>
              Partisipasi dalam permainan terdesentralisasi di Ponspot hanya diizinkan untuk individu yang berusia sekurang-kurangnya <strong>18 (delapan belas) tahun</strong> atau usia legal mayoritas yang berlaku di yurisdiksi tempat tinggal Anda.
            </p>
            <p>
              Pengguna bertanggung jawab penuh untuk memastikan bahwa interaksi dengan smart contract game blockchain tidak melanggar peraturan atau undang-undang yang berlaku di wilayah hukum tempat pengguna berada.
            </p>
          </section>

          {/* 2. Non-Custodial Smart Contract */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <Lock className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">2. Sifat Game Terdesentralisasi (*Non-Custodial Escrow*)</h2>
            </div>
            <p>
              Ponspot beroperasi secara penuh di atas jaringan <strong>Robinhood Chain (L2)</strong> melalui smart contract otonom:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 font-mono text-xs text-[#243329] dark:text-emerald-300">
              <li>Token Taruhan: <code className="bg-black/5 dark:bg-black/40 px-2 py-0.5 rounded">0x5cc01710b1c710d94703fb0e81f3c21ccb047e22</code></li>
              <li>Platform Vault: <code className="bg-black/5 dark:bg-black/40 px-2 py-0.5 rounded">Smart Contract Terverifikasi On-Chain</code></li>
            </ul>
            <p>
              Dana taruhan pemain dipegang langsung oleh smart contract escrow di blockchain dan tidak disimpan oleh pihak ketiga terpusat. Klaim kemenangan dicairkan secara otonom oleh pemenang langsung ke wallet pribadinya tanpa memerlukan izin manual dari admin.
            </p>
          </section>

          {/* 3. Provably Fair Verification */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <CheckCircle2 className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">3. Protokol Keadilan Terbukti (*Provably Fair*)</h2>
            </div>
            <p>
              Setiap putaran game Jackpot di Ponspot dijamin adil 100% menggunakan algoritma kriptografi <strong>HMAC-SHA256</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Server Seed Pre-Commitment:</strong> Hash rahasia dibuat dan dipublikasikan sebelum taruhan pertama dibuka.</li>
              <li><strong>Public Block Seed:</strong> Dikombinasikan dengan data putaran unik secara transparan.</li>
              <li><strong>Verifikasi Bebas:</strong> Setiap pemain dapat memverifikasi keabsahan matematis dari setiap tiket pemenang melalui modal verifikasi atau kode verifikasi independen.</li>
            </ul>
          </section>

          {/* 4. Tokenomics & 5% Burn */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <Flame className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-black uppercase tracking-wide">4. Pembagian Hadiah & 5% Deflationary Burn</h2>
            </div>
            <p>
              Total pot taruhan dalam setiap ronde jackpot didistribusikan sebagai berikut:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30">
                <span className="text-xs font-black text-[#243329] dark:text-emerald-400 block font-mono">🏆 95% HADIAH PEMENANG</span>
                <span className="text-xs text-[#526256] dark:text-slate-400">Ditransfer langsung ke wallet pemenang saat klaim.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30">
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 block font-mono">🔥 5% TOKEN BURN</span>
                <span className="text-xs text-[#526256] dark:text-slate-400">Ditransfer permanen ke Dead Address (<code className="text-[10px]">0x0000...dEaD</code>).</span>
              </div>
            </div>
          </section>

          {/* 5. Risk Disclaimer */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-rose-200 dark:border-rose-900/40 shadow-md space-y-3 bg-rose-50/20">
            <div className="flex items-center gap-2.5 pb-2 border-b border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h2 className="text-base font-black uppercase tracking-wide">5. Penafian Risiko & Tanggung Jawab Pengguna</h2>
            </div>
            <p className="text-xs leading-relaxed">
              Permainan bertaruh token crypto melibatkan risiko finansial. Hasil taruhan didasarkan pada probabilitas acak yang adil secara kriptografis. Anda bertanggung jawab penuh atas segala keputusan taruhan Anda. Ponspot tidak bertanggung jawab atas kerugian finansial yang diakibatkan oleh volatilitas harga token, biaya gas jaringan, atau kegagalan koneksi internet pihak pengguna.
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="pt-6 border-t border-black/10 dark:border-white/10 flex items-center justify-between flex-wrap gap-4 text-xs font-mono">
          <Link
            href="/privacy"
            className="flex items-center gap-1.5 text-[#718D76] dark:text-emerald-400 hover:underline font-bold"
          >
            <span>Baca Kebijakan Privasi (Privacy Policy)</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <span className="text-[#526256] dark:text-slate-400">© 2026 Ponspot. All rights reserved.</span>
        </div>
      </main>
    </div>
  );
}
