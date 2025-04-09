// page.tsx (RoomList)
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/app/utils/authService';
import roomService from '@/app/utils/roomService';
import chatService from '@/app/utils/chatService';
import { withErrorHandling } from '@/app/utils/withErrorHandling';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ChatItem from '@/app/components/ChatItem';
import CreateRoomModal from '@/app/components/CreateRoomModal';
import { MatrixEvent } from 'matrix-js-sdk';

interface Room {
  roomId: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  ts?: number;
  sender?: string;
  isGroup?: boolean;
}

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Kiểm tra trạng thái đăng nhập khi component mount
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        await authService.getAuthenticatedClient();
      } catch (err) {
        console.log("Chưa đăng nhập hoặc token hết hạn, chuyển hướng về trang đăng nhập.", err);
        router.push("/login");
      }
    };

    checkLoginStatus();
  }, [router]);

  // Load rooms and messages initially
  const loadRooms = useCallback(async () => {
    setLoading(true);
    await withErrorHandling(
      async () => {
        console.log("Bắt đầu đồng bộ Matrix client...");
        await chatService.waitForSync(120000);
        console.log("Đồng bộ hoàn tất, bắt đầu lấy danh sách phòng...");
        const joinedRooms = await roomService.fetchJoinedRooms();
        console.log("Danh sách phòng:", joinedRooms);
        setRooms(joinedRooms);
      },
      'Không thể tải danh sách phòng.',
      setError
    ).finally(() => setLoading(false));
  }, []);

  const handleCreateRoom = useCallback(async (roomName: string) => {
    await withErrorHandling(
      async () => {
        await roomService.createRoom(roomName);
        alert('Phòng đã được tạo!');
        await loadRooms();
      },
      'Không thể tạo phòng.',
      setError
    );
  }, [loadRooms]);

  useEffect(() => {
    loadRooms();

    const setupListeners = async () => {
      const client = await authService.getAuthenticatedClient();

      const handleNewMessage = async (event: MatrixEvent, room?: Room) => {
        if (!room || event.getType() !== 'm.room.message') return;

        const roomId = event.getRoomId();
        const content = event.getContent();
        const eventDate = new Date(event.getTs());
        const today = new Date();
        const isToday = eventDate.toDateString() === today.toDateString();
        const timestamp = isToday
          ? eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : eventDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
        const senderId = event.getSender();
        const senderName = senderId ? client.getUser(senderId)?.displayName || senderId : "Unknown";

        // Cập nhật danh sách phòng
        setRooms((prevRooms) => {
          const updatedRooms = prevRooms.map((r) =>
            r.roomId === roomId
              ? {
                  ...r,
                  lastMessage: content.body || "Tin nhắn không có nội dung",
                  timestamp,
                  ts: event.getTs(),
                  sender: senderName,
                }
              : r
          );
          // Sắp xếp lại theo thời gian tin nhắn mới nhất
          return updatedRooms.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        });
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
  }, [loadRooms]);

  return (
    <div className="flex h-screen bg-white text-black">
      <div className="w-1/4 flex flex-col h-full">
        {/* Header */}
        <Header onCreateRoomClick={() => setIsModalOpen(true)} />

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 animate-pulse px-4">Đang tải danh sách phòng...</p>}
          {error && <p className="text-red-500 px-4">❌ {error}</p>}
          {!loading && rooms.length === 0 && <p className="text-gray-500 px-4">Không có phòng nào.</p>}

          {!loading &&
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
      <CreateRoomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateRoom} />
    </div>
  );
};

export default RoomList;