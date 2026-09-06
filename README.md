# ♠️ Texas Hold'em Poker Online dengan Login Privy

Aplikasi game poker online multiplayer real-time Texas Hold'em lengkap dengan autentikasi Web3 & Social Login menggunakan **Privy** (`@privy-io/react-auth`), Next.js (App Router), Tailwind CSS, Socket.io, Express, dan Poker Engine lengkap.

---

## 🌟 Fitur Utama

- **Autentikasi Privy**:
  - Login dengan Web3 Wallets (MetaMask, Phantom, Coinbase, Embedded Wallets).
  - Login dengan Akun Sosial & Email (Google, Twitter/X, Discord, Email OTP, SMS).
  - Mode Demo otomatis bawaan (bisa langsung dimainkan tanpa API Key Privy untuk pengujian lokal).
- **Engine Texas Hold'em Poker**:
  - Standar 52 kartu dengan Fisher-Yates fair shuffle.
  - Tahapan ronde lengkap: *Pre-flop*, *Flop*, *Turn*, *River*, *Showdown*.
  - Evaluator kombinasi 7-kartu akurat (Royal Flush hingga High Card dengan kicker tiebreaker).
  - Kalkulasi *Main Pot*, *Multi-player Side Pots*, dan *Split Pot*.
  - Timer giliran dinamis dengan visual ring countdown & auto-fold/auto-check saat timeout.
  - AI Bot terintegrasi untuk meja latihan atau mengisi kursi kosong.
- **Tampilan Kasino Premium**:
  - Desain meja felt hijau oval dengan rail kulit dan aksen emas.
  - Kartu 4-warna beranimasi (*Framer Motion*).
  - Audio Sound Effects menggunakan Web Audio API (*Chips, Deal, Fold, Check, Win fanfare*).
  - Slider taruhan dinamis & tombol preset (*2.5x BB, 1/2 Pot, Pot, All-in*).
  - Live In-Game Chat, emoji interaktif, dan notifikasi dealer.
  - Faucet Chip gratis untuk isi ulang saldo instan.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Menjalankan Server & Frontend Sekaligus (Dev Mode)

Jalankan perintah berikut di terminal:

```bash
npm run dev
```

Ini akan menjalankan:
- **Game Server (Socket.io & Express)** pada `http://localhost:4000`
- **Frontend (Next.js)** pada `http://localhost:3001`

Buka browser Anda di `http://localhost:3001` untuk mulai bermain!

---

## 🔑 Konfigurasi Privy App ID (Opsional)

Jika Anda ingin menghubungkan akun Privy resmi dari dashboard Anda:

1. Buka [https://dashboard.privy.io](https://dashboard.privy.io) dan buat App baru.
2. Salin **App ID** Anda.
3. Buka file `.env.local` dan masukkan:
   ```env
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
   NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
   PORT=4000
   ```
4. Restart server (`npm run dev`).

*(Catatan: Jika `NEXT_PUBLIC_PRIVY_APP_ID` dikosongkan, game otomatis menggunakan mode Demo Privy bawaan sehingga dapat langsung dimainkan tanpa konfigurasi tambahan).*

---

## 🧪 Menjalankan Unit Test

Untuk menguji algoritma Evaluator kombinasi kartu dan kalkulasi Side Pots:

```bash
npm test
```

---

## 📁 Struktur Proyek

```
poker/
├── server/
│   ├── index.ts                # Entry point server Socket.io & REST API
│   ├── engine/
│   │   ├── Deck.ts             # Deck 52 kartu & algoritma shuffle
│   │   ├── Evaluator.ts        # Hand evaluator 7-kartu & scoring kicker
│   │   ├── PotManager.ts       # Manajemen Main Pot, Side Pots & Split Pot
│   │   ├── Table.ts            # State machine meja permainan & ronde poker
│   │   └── BotPlayer.ts        # Kecerdasan Buatan (AI) bot poker
│   ├── types/
│   │   └── poker.ts            # Tipe data bersama backend & client
│   └── test/
│       └── evaluator.test.ts   # Unit test evaluator & side pot
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout & context providers
│   │   ├── page.tsx            # Halaman Lobby & daftar meja
│   │   ├── table/[id]/page.tsx # Halaman Meja Poker interaktif live
│   │   └── globals.css         # Styling tema meja kasino
│   ├── components/
│   │   ├── auth/
│   │   │   ├── PrivyProviderWrapper.tsx # Bridge Privy Auth & fallback Demo
│   │   │   ├── PrivyAuthButton.tsx      # Tombol login Privy & profil
│   │   │   └── UserProfileModal.tsx     # Modal profil & faucet chip
│   │   ├── poker/
│   │   │   ├── PokerTable.tsx        # Meja felt oval utama
│   │   │   ├── PlayerSeat.tsx        # Kursi pemain, avatar, timer ring & chip
│   │   │   ├── CommunityCards.tsx    # Kartu komunitas & pot
│   │   │   ├── ActionControls.tsx    # Tombol Fold, Check, Call, Raise slider
│   │   │   ├── HandStrengthBadge.tsx # Indikator kekuatan kombinasi kartu live
│   │   │   ├── TableChat.tsx         # Live chat & emoji reaksi
│   │   │   └── WinnerOverlay.tsx     # Tampilan kemenangan & konfeti
│   │   └── ui/
│   │       ├── CardComponent.tsx     # Komponen kartu 3D & 4-warna
│   │       └── ChipStack.tsx         # Tumpukan chip kasino 3D
│   ├── context/
│   │   ├── SocketContext.tsx         # Manajemen koneksi Socket.io
│   │   └── SoundContext.tsx          # Manajemen efek suara Web Audio API
│   └── lib/
│       ├── soundEffects.ts           # Synthesizer audio Web Audio API
│       └── handStrength.ts           # Client-side hand rank helper
└── package.json
```
