// src/app/chat/[roomId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatView from './chatView';
import { useAuth } from '@/app/contexts/AuthContext';

const ChatRoomPage = () => {
  const { matrixClient, initializeClient } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const init = async () => {
      // If matrixClient is null, initialize it
      if (!matrixClient) {
        setIsInitializing(true);
        try {
          await initializeClient();
        } catch (err) {
          console.error('Failed to initialize MatrixClient:', err);
          setError('Không thể tải phòng chat. Vui lòng đăng nhập lại.');
          router.push('/auth/login');
          return;
        } finally {
          setIsInitializing(false);
        }
      }

      // Double-check matrixClient after initialization
      if (!matrixClient) {
        setError('Không thể tải phòng chat. Vui lòng đăng nhập lại.');
        router.push('/auth/login');
        return;
      }

      if (typeof params?.roomId === 'string') {
        setRoomId(decodeURIComponent(params.roomId));
      } else {
        setError('Invalid Room ID');
      }
    };

    init();
  }, [params?.roomId, matrixClient, initializeClient, router]);

  if (error) return <p>Lỗi: {error}</p>;
  if (isInitializing || !matrixClient || !roomId) return <p>Đang tải...</p>;

  return <ChatView matrixClient={matrixClient} roomId={roomId} />;
};

export default ChatRoomPage;