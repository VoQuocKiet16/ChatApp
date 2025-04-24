// page.tsx (RoomList)
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/app/services/auth/authService';
import roomService from '@/app/services/matrix/roomService';
import chatService from '@/app/services/matrix/chatService';
import { withErrorHandling } from '@/app/services/utils/withErrorHandling';
import { ERROR_MESSAGES } from '@/app/services/utils/matrix';
import { sortRoomsByTimestamp } from '@/app/services/utils/roomUtils';
import Header from '@/app/components/common/Header';
import Footer from '@/app/components/common/Footer';
import ChatItem from '@/app/components/chat/ChatItem';
import CreateRoomModal from '@/app/components/room/CreateRoomModal';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { RoomData } from '@/app/services/matrix/roomService';

/**
 * RoomList component displays a list of chat rooms and handles room creation and new message updates.
 */
const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const router = useRouter();

  // Check login status and client sync state
  useEffect(() => {
    const checkLoginAndSync = async () => {
      try {
        await authService.getAuthenticatedClient();
        setIsClientReady(true);
      } catch (err) {
        console.error('Lỗi khi kiểm tra đăng nhập hoặc đồng bộ client:', err);
        router.push('/auth/login');
      }
    };

    checkLoginAndSync();
  }, [router]);

  // Load rooms and messages
  const loadRooms = useCallback(async () => {
    if (!isClientReady) return;
    setLoading(true);
    await withErrorHandling(
      async () => {
        console.log('Bắt đầu lấy danh sách phòng...');
        const joinedRooms = await roomService.fetchJoinedRooms();
        console.log('Danh sách phòng:', joinedRooms);
        setRooms(joinedRooms);
      },
      ERROR_MESSAGES.FETCH_ROOMS_FAILED,
      setError
    ).finally(() => setLoading(false));
  }, [isClientReady]);

  // Update room list with new message data
  const updateRoomList = useCallback((updatedRoom: Partial<RoomData>) => {
    setRooms((prevRooms) => {
      const updatedRooms = prevRooms.map((r) =>
        r.roomId === updatedRoom.roomId ? { ...r, ...updatedRoom } : r
      );
      return sortRoomsByTimestamp(updatedRooms);
    });
  }, []);

  // Handle room creation
  const handleCreateRoom = useCallback(
    async (roomName: string) => {
      await withErrorHandling(
        async () => {
          await roomService.createRoom(roomName);
          alert('Phòng đã được tạo!');
          await loadRooms();
        },
        ERROR_MESSAGES.CREATE_ROOM_FAILED,
        setError
      );
    },
    [loadRooms]
  );

  // Setup listeners for new messages
  useEffect(() => {
    if (!isClientReady) return;
    loadRooms();

    const setupListeners = async () => {
      const client = await authService.getAuthenticatedClient();

      const handleNewMessage = async (event: MatrixEvent, room?: Room) => {
        if (!room) return;
        const updatedRoom = await chatService.processNewMessage(event, room, client);
        if (updatedRoom) {
          updateRoomList(updatedRoom);
        }
      };

      const removeMessageListener = await chatService.onNewMessage(handleNewMessage);
      return removeMessageListener;
    };

    let cleanup: (() => void) | undefined;
    setupListeners().then((removeListener) => {
      cleanup = removeListener;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [isClientReady, loadRooms, updateRoomList]);

  return (
    <div className="flex h-screen bg-white text-black">
      <div className="w-1/4 flex flex-col h-full">
        {/* Header */}
        <Header onCreateRoomClick={() => setIsModalOpen(true)} />

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 animate-pulse px-4">Đang tải danh sách phòng...</p>}
          {error && <p className="text-red-500 px-4">❌ {error}</p>}
          {!loading && rooms.length === 0 && (
            <p className="text-gray-500 px-4">Không có phòng nào.</p>
          )}

          {!loading && isClientReady &&
            rooms.map((room) => (
              <ChatItem
                key={room.roomId}
                name={room.isGroup ? `Nhóm: ${room.name}` : room.name}
                lastMessage={room.lastMessage || 'No messages yet'}
                timestamp={room.timestamp || 'N/A'}
                sender={room.sender || 'N/A'}
                isGroup={room.isGroup || false}
                onClick={() => router.push(`/chat/${room.roomId}`)}
              />
            ))}
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Main Section */}
      <main className="flex-1 flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">️ Chọn một phòng để bắt đầu trò chuyện</p>
      </main>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateRoom}
      />
    </div>
  );
};

export default RoomList;