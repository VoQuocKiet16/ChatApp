// CallMessage.tsx
import React from 'react';

interface CallMessageProps {
  message: string;
  timestamp: number;
  isMissed?: boolean; // Để hiển thị cuộc gọi nhỡ (bị từ chối)
}

const CallMessage: React.FC<CallMessageProps> = ({ message, timestamp, isMissed = false }) => {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex justify-center my-2">
      <div className="bg-gray-200 rounded-lg px-4 py-2 flex items-center space-x-2">
        <svg
          className={`w-5 h-5 ${isMissed ? 'text-red-500' : 'text-green-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
        <span className={`text-sm ${isMissed ? 'text-red-500' : 'text-gray-700'}`}>
          {message}
        </span>
        <span className="text-xs text-gray-500">{formattedTime}</span>
      </div>
    </div>
  );
};

export default CallMessage;