// src/app/ClientLayout.tsx
'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { CallProvider } from '@/app/contexts/CallContext';

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { matrixClient } = useAuth();

  if (!matrixClient) {
    return <div>Đang tải...</div>;
  }

  return <CallProvider matrixClient={matrixClient}>{children}</CallProvider>;
}