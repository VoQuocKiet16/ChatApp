// src/contexts/AuthContext.tsx
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import authService from '@/app/service/auth/authService';

interface AuthContextType {
  matrixClient: MatrixClient | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [matrixClient, setMatrixClient] = useState<MatrixClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        const client = await authService.getAuthenticatedClient();
        setMatrixClient(client);
      } catch (err) {
        console.error('Failed to initialize MatrixClient:', err);
        setError('Không thể khởi tạo MatrixClient. Vui lòng thử lại.');
      }
    };
    initClient();
  }, []);

  if (error) {
    return <div>Lỗi: {error}</div>;
  }

  if (!matrixClient) {
    return <div>Đang tải...</div>;
  }

  return (
    <AuthContext.Provider value={{ matrixClient }}>
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