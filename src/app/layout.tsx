import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/context/WalletContext';
import { CashFlipWeb3Provider } from '@/context/CashFlipWeb3Context';
import { SocketProvider } from '@/context/SocketContext';
import { SoundProvider } from '@/context/SoundContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: 'CASHFLIP — Provably Fair Coinflip Duels & Autonomous Jackpot',
  description: 'Antique astronomical ledger, high-stakes 50/50 Coinflip duels, and non-custodial on-chain games using USDG token on Robinhood Chain.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/favicon.png?v=2', type: 'image/png' },
      { url: '/image/logo.png', sizes: 'any' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: '/image/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('cashflip-theme') || localStorage.getItem('cashflip-theme');
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[#E8DFD1] text-[#171513] dark:bg-[#141311] dark:text-[#E8DFD1] min-h-screen font-serif antialiased selection:bg-[#171513] selection:text-[#E8DFD1] dark:selection:bg-[#BCA172] dark:selection:text-[#141311]">
        <ThemeProvider>
          <WalletProvider>
            <CashFlipWeb3Provider>
              <SocketProvider>
                <SoundProvider>
                  {children}
                </SoundProvider>
              </SocketProvider>
            </CashFlipWeb3Provider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
