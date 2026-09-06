import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/context/WalletContext';
import { CashFlipWeb3Provider } from '@/context/CashFlipWeb3Context';
import { SocketProvider } from '@/context/SocketContext';
import { SoundProvider } from '@/context/SoundContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: 'KOFUKU — Provably Fair Coinflip Duels & Autonomous Jackpot',
  description: 'Antique astronomical ledger, high-stakes 50/50 Coinflip duels, and non-custodial on-chain games using USDG token on Robinhood Chain.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/favicon.png?v=3', type: 'image/png' },
      { url: '/image/logo.png?v=3', sizes: 'any' },
    ],
    shortcut: '/favicon.ico?v=3',
    apple: '/image/logo.png?v=3',
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
                  var saved = localStorage.getItem('kofuku-theme') || localStorage.getItem('cashflip-theme');
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
      <body className="bg-[#030508] text-[#E8DFCF] min-h-screen font-sans antialiased selection:bg-[#CDB486] selection:text-[#030508]">
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
