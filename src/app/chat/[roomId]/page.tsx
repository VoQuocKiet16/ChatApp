// src/app/chat/[roomId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatView from './chatView';
import { useAuth } from '@/app/contexts/AuthContext';

const ChatRoomPage = () => {
  const { matrixClient } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matrixClient) {
      setError('Không thể tải phòng chat. Vui lòng đăng nhập lại.');
      router.push('/login');
      return;
    }

    if (typeof params?.roomId === 'string') {
      setRoomId(decodeURIComponent(params.roomId));
    } else {
      setError('Invalid Room ID');
    }
  }, [params?.roomId, matrixClient, router]);

  if (error) return <p>Lỗi: {error}</p>;
  if (!matrixClient || !roomId) return <p>Đang tải...</p>;

  return <ChatView matrixClient={matrixClient} roomId={roomId} />;
};

export default ChatRoomPage;