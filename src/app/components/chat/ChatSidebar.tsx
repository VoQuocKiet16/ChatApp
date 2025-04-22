'use client';
import { RoomMember } from 'matrix-js-sdk';

interface ChatSidebarProps {
    members: RoomMember[];
    inviteUserId: string;
    setInviteUserId: (value: string) => void;
    isRoomOwner: boolean;
    onInviteMember: () => void;
    onDeleteRoom: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    members,
    inviteUserId,
    setInviteUserId,
    isRoomOwner,
    onInviteMember,
    onDeleteRoom,
}) => {
    return (
        <aside className="w-72 bg-white shadow-lg p-6 flex flex-col transition-all">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thành viên</h2>
            <ul className="space-y-3 flex-1 overflow-y-auto">
                {members.map((member) => (
                    <li key={member.userId} className="bg-gray-100 p-3 rounded-lg shadow-sm text-sm text-gray-700">
                        {member.name || member.userId}
                    </li>
                ))}
            </ul>
            <div className="mt-6 space-y-3">
                <input
                    type="text"
                    value={inviteUserId}
                    onChange={(e) => setInviteUserId(e.target.value)}
                    placeholder="Nhập User ID"
                    className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                />
                <button onClick={onInviteMember} className="w-full bg-blue-500 text-white rounded-lg p-3 hover:bg-blue-600 transition">
                    Thêm thành viên
                </button>
                {isRoomOwner && (
                    <button onClick={onDeleteRoom} className="w-full bg-red-500 text-white rounded-lg p-3 hover:bg-red-600 transition">
                        Xóa phòng
                    </button>
                )}
            </div>
        </aside>
    );
};

export default ChatSidebar;