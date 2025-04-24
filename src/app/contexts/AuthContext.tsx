// src/contexts/AuthContext.tsx
'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import authService from '@/app/services/auth/authService';

interface AuthContextType {
  matrixClient: MatrixClient | null;
  initializeClient: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [matrixClient, setMatrixClient] = useState<MatrixClient | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);

  const initializeClient = useCallback(async () => {
    if (matrixClient) return; // Skip if client is already initialized
    try {
      const client = await authService.getAuthenticatedClient();
      setMatrixClient(client);
      setError(null);
    } catch (err) {
      console.error('Failed to initialize MatrixClient:', err);
      setError('Không thể khởi tạo MatrixClient. Vui lòng thử lại.');
    }
  }, [matrixClient]);

  return (
    <AuthContext.Provider value={{ matrixClient, initializeClient }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};