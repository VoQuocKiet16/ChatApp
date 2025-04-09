// page.tsx (ChatRoomPage)
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatView from './chatView';
import authService from '@/app/utils/authService';
import { MatrixClient } from 'matrix-js-sdk';

const ChatRoomPage = () => {
  const params = useParams();
  const router = useRouter();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const matrixClient = await authService.getAuthenticatedClient();
        setClient(matrixClient);

        if (typeof params?.roomId === 'string') {
          setRoomId(decodeURIComponent(params.roomId));
        } else {
          setError("Invalid Room ID");
        }
      } catch (err) {
        console.error("Error loading room:", err);
        setError("Không thể tải phòng chat. Vui lòng đăng nhập lại.");
        router.push('/login');
      }
    };

    loadRoom();
  }, [params?.roomId, router]);

  if (error) return <p>Lỗi: {error}</p>;
  if (!client || !roomId) return <p>Đang tải...</p>;

  return (
    <div>
      <ChatView matrixClient={client} roomId={roomId} />
    </div>
  );
};

export default ChatRoomPage;