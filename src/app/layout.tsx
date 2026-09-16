import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/context/WalletContext';
import { CashFlipWeb3Provider } from '@/context/CashFlipWeb3Context';
import { SocketProvider } from '@/context/SocketContext';
import { SoundProvider } from '@/context/SoundContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { StakeLayoutWrapper } from '@/components/layout/StakeLayoutWrapper';

export const metadata: Metadata = {
  title: 'FORTIS — Leading Provably Fair Crypto Casino',
  description: 'FORTIS Casino on Robinhood Chain. Non-custodial, high-stakes Jackpot, 50/50 Coinflip, Mines, and Cups with instant on-chain settlements.',
  icons: {
    icon: '/favicon.ico?v=ico_fortis_now',
    shortcut: '/favicon.ico?v=ico_fortis_now',
    apple: '/favicon.ico?v=ico_fortis_now',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className="bg-[#071824] text-white min-h-screen font-sans antialiased selection:bg-[#00E701] selection:text-[#071824]">
        <ThemeProvider>
          <WalletProvider>
            <CashFlipWeb3Provider>
              <SocketProvider>
                <SoundProvider>
                  <SidebarProvider>
                    <StakeLayoutWrapper>
                      {children}
                    </StakeLayoutWrapper>
                  </SidebarProvider>
                </SoundProvider>
              </SocketProvider>
            </CashFlipWeb3Provider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
