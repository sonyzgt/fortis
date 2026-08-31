'use client';

import React from 'react';
import { WalletProvider, useWallet, useAuthUser, AppUser } from '@/context/WalletContext';

export { useWallet, useAuthUser };
export type { AppUser };

export const PrivyProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <WalletProvider>{children}</WalletProvider>;
};
