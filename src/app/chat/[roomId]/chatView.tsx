'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MatrixClient, MatrixCall, RoomMember, MatrixEvent, Room, CallEvent } from 'matrix-js-sdk';
import chatService, { ChatMessage } from '@/app/utils/chatService';
import roomService from '@/app/utils/roomService';
import { VoiceCallService } from '@/app/utils/voiceCallService';
import { VideoCallService } from '@/app/utils/videoCallService';
import { withErrorHandling } from '@/app/utils/withErrorHandling';
import VoiceCall from '@/app/components/VoiceCall';
import VideoCall from '@/app/components/VideoCall';
import MessageList from '@/app/components/MessageList';
import ChatSidebar from '@/app/components/ChatSidebar';
import CallModal from '@/app/components/CallModal';

interface ChatViewProps {
    matrixClient: MatrixClient;
    roomId: string;
}

const ChatView: React.FC<ChatViewProps> = ({ matrixClient, roomId }) => {
    const router = useRouter();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageText, setMessageText] = useState('');
    const [roomName, setRoomName] = useState<string>('');
    const [members, setMembers] = useState<RoomMember[]>([]);
    const [inviteUserId, setInviteUserId] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isRoomOwner, setIsRoomOwner] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showVoiceCall, setShowVoiceCall] = useState(false);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [activeCall, setActiveCall] = useState<MatrixCall | null>(null);
    const [incomingCall, setIncomingCall] = useState<MatrixCall | null>(null);
    const [callerName, setCallerName] = useState<string>('Người dùng không xác định');
    const [receiverName, setReceiverName] = useState<string>('Người dùng không xác định');
    const [isCaller, setIsCaller] = useState<boolean>(false);

    const voiceCallService = useMemo(() => new VoiceCallService(matrixClient), [matrixClient]);
    const videoCallService = useMemo(() => new VideoCallService(matrixClient), [matrixClient]);

    const fetchRoomData = async () => {
        try {
            const roomName = await chatService.getRoomName(roomId);
            const members = await chatService.getRoomMembers(roomId);
            const isOwner = await chatService.isRoomOwner(roomId);
            const fetchedMessages = await chatService.getRoomMessages(roomId);

            console.log("Dữ liệu phòng:", { roomName, members, isOwner, messages: fetchedMessages });

            setRoomName(roomName);
            setMembers(members);
            setIsRoomOwner(isOwner);
            setMessages(fetchedMessages);
            setError(null);
        } catch (err) {
            console.error("Lỗi trong fetchRoomData:", err);
            setError('Không thể tải dữ liệu phòng chat.');
        }
    };

    useEffect(() => {
        setLoading(true);
        chatService.waitForSync(120000)
            .then(() => {
                fetchRoomData();
            })
            .catch((err) => {
                setError(err.message || 'Không thể đồng bộ với server. Vui lòng thử lại.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [roomId, matrixClient]);

    useEffect(() => {
        const setupListeners = async () => {
            const handleNewMessage = async (event: MatrixEvent, room?: Room) => {
                if (!room || room.roomId !== roomId) return;
                const senderId = event.getSender();
                let avatarUrl: string | null | undefined;
                if (senderId) {
                    try {
                        const profile = await matrixClient.getProfileInfo(senderId);
                        avatarUrl = profile.avatar_url && typeof profile.avatar_url === 'string'
                            ? matrixClient.mxcUrlToHttp(profile.avatar_url)
                            : undefined;
                    } catch (err) {
                        console.error(`Lỗi khi lấy avatar cho ${senderId}:`, err);
                    }
                }
                const timestamp = event.getTs();
                if (typeof timestamp !== 'number' || isNaN(timestamp)) {
                    console.warn(`Timestamp không hợp lệ cho sự kiện ${event.getId()}:`, timestamp);
                }

                const newMessage: ChatMessage = {
                    sender: senderId || 'Không rõ',
                    body: event.getContent()?.body || '',
                    eventId: event.getId() || `msg-${Date.now()}`,
                    avatarUrl: avatarUrl,
                    timestamp: typeof timestamp === 'number' && !isNaN(timestamp) ? timestamp : Date.now(),
                };
                const currentUserId = matrixClient.getUserId();
                // Only skip if sender is current user and userId is not null
                if (currentUserId && newMessage.sender === currentUserId) return;
                setMessages((prev) => {
                    if (prev.some((msg) => msg.eventId === newMessage.eventId)) return prev;
                    return [...prev, newMessage];
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
    }, [roomId, matrixClient]);

    useEffect(() => {
        const handleIncomingCall = async (call: MatrixCall) => {
            if (call.roomId !== roomId) return;

            let callerDisplayName = 'Người dùng không xác định';
            let receiverDisplayName = 'Người dùng không xác định';
            const currentUserId = matrixClient.getUserId();
            if (currentUserId) {
                receiverDisplayName = matrixClient.getUser(currentUserId)?.displayName || currentUserId || 'Bạn';
            }
            const opponentMember = call.getOpponentMember();

            if (opponentMember) {
                callerDisplayName = opponentMember.name || opponentMember.userId;
            } else {
                const room = matrixClient.getRoom(roomId);
                if (room) {
                    const members = room.getJoinedMembers();
                    const otherMembers = currentUserId
                        ? members.filter(member => member.userId !== currentUserId)
                        : members;
                    if (otherMembers.length === 1) {
                        callerDisplayName = otherMembers[0].name || otherMembers[0].userId;
                    } else if (otherMembers.length > 1) {
                        console.warn('Không thể xác định người gọi vì phòng có nhiều thành viên.');
                        callerDisplayName = room.name || 'Cuộc gọi nhóm';
                    }
                }
            }

            console.log('Incoming call:', { callId: call.callId, callerDisplayName, receiverDisplayName, callType: call.type });
            setCallerName(callerDisplayName);
            setReceiverName(receiverDisplayName);
            setIsCaller(false);
            setIncomingCall(call);

            call.on(CallEvent.Hangup, () => {
                console.log('Incoming call hung up:', call.callId);
                setIncomingCall(null);
                setActiveCall(null);
                setShowVoiceCall(false);
                setShowVideoCall(false);
                setIsCaller(false);
            });
            call.on(CallEvent.Error, () => {
                console.error('Incoming call error:', call.callId);
                setIncomingCall(null);
                setActiveCall(null);
                setShowVoiceCall(false);
                setShowVideoCall(false);
                setIsCaller(false);
            });
        };

        // Register listeners for both voice and video calls
        const removeVoiceCallListener = voiceCallService.onIncomingCall(handleIncomingCall);
        const removeVideoCallListener = videoCallService.onIncomingCall(handleIncomingCall);

        return () => {
            removeVoiceCallListener();
            removeVideoCallListener();
            if (!voiceCallService.getActiveCall()) {
                voiceCallService.hangupCall();
            }
            if (!videoCallService.getActiveCall()) {
                videoCallService.hangupCall();
            }
        };
    }, [voiceCallService, videoCallService, matrixClient, roomId]);

    const handleSendMessage = async () => {
        if (!messageText.trim()) return;

        const currentUserId = matrixClient.getUserId();
        const tempEventId = `temp-${Date.now()}`;
        const newMessage: ChatMessage = {
            sender: currentUserId || 'Bạn',
            body: messageText,
            eventId: tempEventId,
            avatarUrl: undefined,
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, newMessage]);
        setMessageText('');

        await withErrorHandling(
            () => chatService.sendMessage(roomId, messageText),
            'Không thể gửi tin nhắn.',
            setError
        ).then((eventId) => {
            setMessages((prev) =>
                prev.map((msg) => (msg.eventId === tempEventId ? { ...msg, eventId } : msg))
            );
        }).catch(() => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.eventId === tempEventId ? { ...msg, body: `Lỗi gửi: ${messageText}` } : msg
                )
            );
        });
    };

    const handleInviteMember = async () => {
        if (!inviteUserId.trim()) return;
        await withErrorHandling(
            () => chatService.inviteMember(roomId, inviteUserId),
            'Không thể mời thành viên.',
            setError
        ).then(() => {
            setInviteUserId('');
        });
    };

    const handleDeleteRoom = async () => {
        if (!confirm('Bạn có chắc chắn muốn xóa phòng này?')) return;
        await withErrorHandling(
            () => roomService.deleteRoom(roomId),
            'Không thể xóa phòng.',
            setError
        ).then(() => {
            router.push('/roomlist');
        });
    };

    const handleAcceptCall = async (call: MatrixCall) => {
        if (!call) return;
        try {
            if (call.type === 'voice') {
                await voiceCallService.answerCall(call);
                console.log('Accepted voice call:', call.callId);
                setActiveCall(call);
                setShowVoiceCall(true);
                setShowVideoCall(false);
            } else if (call.type === 'video') {
                await videoCallService.answerCall(call);
                console.log('Accepted video call:', call.callId);
                setActiveCall(call);
                setShowVideoCall(true);
                setShowVoiceCall(false);
            }
            setIncomingCall(null);
            setIsCaller(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể chấp nhận cuộc gọi.');
            if (call.type === 'voice') {
                voiceCallService.rejectCall(call);
            } else {
                videoCallService.rejectCall(call);
            }
            setIncomingCall(null);
        }
    };

    const handleRejectCall = (call: MatrixCall) => {
        if (!call) return;
        console.log('Rejected call:', call.callId, 'type:', call.type);
        if (call.type === 'voice') {
            voiceCallService.rejectCall(call);
        } else {
            videoCallService.rejectCall(call);
        }
        setIncomingCall(null);
    };

    const handleRetry = () => {
        setError(null);
        setLoading(true);
        fetchRoomData().finally(() => setLoading(false));
    };

    const handleStartVoiceCall = async () => {
        try {
            await chatService.waitForSync(120000);
            const call = await voiceCallService.startVoiceCall(roomId);
            console.log('Started voice call:', call.callId);
            setActiveCall(call);
            setShowVoiceCall(true);
            setIsCaller(true);

            const room = matrixClient.getRoom(roomId);
            let receiverDisplayName = 'Người dùng không xác định';
            let callerDisplayName = 'Người dùng không xác định';
            const currentUserId = matrixClient.getUserId();
            if (currentUserId) {
                callerDisplayName = matrixClient.getUser(currentUserId)?.displayName || currentUserId || 'Bạn';
            }
            if (room) {
                const members = room.getJoinedMembers();
                const otherMembers = currentUserId
                    ? members.filter(member => member.userId !== currentUserId)
                    : members;
                if (otherMembers.length === 1) {
                    receiverDisplayName = otherMembers[0].name || otherMembers[0].userId;
                } else {
                    receiverDisplayName = room.name || 'Cuộc gọi nhóm';
                }
            }
            console.log('Voice call initiated:', { callerDisplayName, receiverDisplayName, isCaller: true });
            setCallerName(callerDisplayName);
            setReceiverName(receiverDisplayName);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể bắt đầu cuộc gọi.');
        }
    };

    const handleStartVideoCall = async () => {
        try {
            await chatService.waitForSync(120000);
            const call = await videoCallService.startVideoCall(roomId);
            console.log('Started video call:', call.callId);
            setActiveCall(call);
            setShowVideoCall(true);
            setIsCaller(true);

            const room = matrixClient.getRoom(roomId);
            let receiverDisplayName = 'Người dùng không xác định';
            let callerDisplayName = 'Người dùng không xác định';
            const currentUserId = matrixClient.getUserId();
            if (currentUserId) {
                callerDisplayName = matrixClient.getUser(currentUserId)?.displayName || currentUserId || 'Bạn';
            }
            if (room) {
                const members = room.getJoinedMembers();
                const otherMembers = currentUserId
                    ? members.filter(member => member.userId !== currentUserId)
                    : members;
                if (otherMembers.length === 1) {
                    receiverDisplayName = otherMembers[0].name || otherMembers[0].userId;
                } else {
                    receiverDisplayName = room.name || 'Cuộc gọi nhóm';
                }
            }
            console.log('Video call initiated:', { callerDisplayName, receiverDisplayName, isCaller: true });
            setCallerName(callerDisplayName);
            setReceiverName(receiverDisplayName);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể bắt đầu cuộc gọi video.');
        }
    };

    const currentUserId = matrixClient.getUserId();
    if (!currentUserId) {
        // Handle unauthenticated state
        console.warn('No user logged in, redirecting to login');
        router.push('/login');
        return null;
    }

    return (
        <div className="flex h-screen bg-gray-50 text-gray-800">
            <div className="flex-1 flex flex-col">
                <header className="bg-white shadow-md p-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 mr-3">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold text-gray-900 truncate">{roomName}</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleStartVoiceCall}
                            className="text-gray-600 hover:text-gray-800"
                            title="Cuộc gọi thoại"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                            </svg>
                        </button>
                        <button
                            onClick={handleStartVideoCall}
                            className="text-gray-600 hover:text-gray-800"
                            title="Cuộc gọi video"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l5-5m0 10l-5-5" />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                            </svg>
                        </button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 hover:text-gray-800">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : showVoiceCall ? (
                    <VoiceCall
                        VoiceCallService={voiceCallService}
                        roomId={roomId}
                        onEndCall={() => {
                            setShowVoiceCall(false);
                            setActiveCall(null);
                            voiceCallService.hangupCall();
                            setIsCaller(false);
                        }}
                        activeCall={activeCall}
                        callerName={callerName}
                        receiverName={receiverName}
                        isCaller={isCaller}
                    />
                ) : showVideoCall ? (
                    <VideoCall
                        videoCallService={videoCallService}
                        roomId={roomId}
                        onEndCall={() => {
                            setShowVideoCall(false);
                            setActiveCall(null);
                            videoCallService.hangupCall();
                            setIsCaller(false);
                        }}
                        activeCall={activeCall}
                        callerName={callerName}
                        receiverName={receiverName}
                        isCaller={isCaller}
                    />
                ) : (
                    <>
                        {error && (
                            <div className="text-red-500 text-center">
                                <p>{error}</p>
                                <button
                                    onClick={handleRetry}
                                    className="mt-2 bg-blue-500 text-white rounded-lg p-2 hover:bg-blue-600 transition"
                                >
                                    Thử lại
                                </button>
                            </div>
                        )}
                        <MessageList messages={messages} currentUserId={currentUserId} />
                    </>
                )}

                {!showVoiceCall && !showVideoCall && (
                    <footer className="bg-white p-4 shadow-inner">
                        <div className="flex items-center space-x-3">
                            <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Nhập tin nhắn..."
                                className="flex-1 rounded-full border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                            />
                            <button onClick={handleSendMessage} className="bg-blue-500 text-white rounded-full p-3 hover:bg-blue-600 transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </footer>
                )}
            </div>

            {isSidebarOpen && (
                <ChatSidebar
                    members={members}
                    inviteUserId={inviteUserId}
                    setInviteUserId={setInviteUserId}
                    isRoomOwner={isRoomOwner}
                    onInviteMember={handleInviteMember}
                    onDeleteRoom={handleDeleteRoom}
                />
            )}

            <CallModal
                incomingCall={incomingCall}
                callerName={callerName}
                voiceCallService={voiceCallService}
                videoCallService={videoCallService}
                onAcceptCall={handleAcceptCall}
                onRejectCall={handleRejectCall}
            />
        </div>
    );
};

export default ChatView;