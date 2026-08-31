import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/context/WalletContext';
import { PonspotWeb3Provider } from '@/context/PonspotWeb3Context';
import { SocketProvider } from '@/context/SocketContext';
import { SoundProvider } from '@/context/SoundContext';

export const metadata: Metadata = {
  title: 'PONSPOT — On-Chain PONSPOT Bidding Game System (Robinhood Chain)',
  description: 'Non-custodial on-chain bidding game using PONSPOT token. Provably fair with SHA256 & HMAC-SHA256 on Robinhood Chain.',
  icons: {
    icon: [
      { url: '/image/logo.png', sizes: 'any' },
      { url: '/logo.png', sizes: 'any' },
    ],
    shortcut: '/image/logo.png',
    apple: '/image/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className="bg-[#050b08] text-[#F5F8F3] dark min-h-screen">
        <WalletProvider>
          <PonspotWeb3Provider>
            <SocketProvider>
              <SoundProvider>
                {children}
              </SoundProvider>
            </SocketProvider>
          </PonspotWeb3Provider>
        </WalletProvider>
      </body>
    </html>
  );
}
