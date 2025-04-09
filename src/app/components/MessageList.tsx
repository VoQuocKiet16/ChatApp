import React from 'react';
import Image from 'next/image';

interface MessageListProps {
    messages: Array<{
        sender: string;
        body: string;
        eventId: string;
        avatarUrl?: string | null | undefined;
        timestamp: number;
    }>;
    currentUserId: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId }) => {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => {
                const isCurrentUser = message.sender === currentUserId;
                const formattedTime =
                    typeof message.timestamp === 'number' && !isNaN(message.timestamp)
                        ? new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })
                        : 'N/A';

                return (
                    <div
                        key={message.eventId}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                                {message.avatarUrl && message.avatarUrl !== null ? (
                                    <Image
                                        src={message.avatarUrl}
                                        alt={message.sender}
                                        width={32}
                                        height={32}
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    message.sender.charAt(0).toUpperCase()
                                )}
                            </div>
                            {/* Message Content */}
                            <div
                                className={`max-w-xs p-3 rounded-lg ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                                    }`}
                            >
                                <p>{message.body}</p>
                                <p className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-200' : 'text-gray-500'}`}>
                                    {formattedTime}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MessageList;