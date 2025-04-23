// src/app/ClientLayout.tsx
'use client';
import { CallProvider } from '@/app/contexts/CallContext';
import { useAuth } from '@/app/contexts/AuthContext';

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { matrixClient } = useAuth();

  return <CallProvider matrixClient={matrixClient}>{children}</CallProvider>;
}