import React from 'react';
// Removed unused import for 'useCall' as it is not used in this component

interface CallControlsProps {
    isMicOn: boolean;
    isCameraOn?: boolean;
    onToggleMic: () => void;
    onToggleCamera?: () => void;
    onHangup: () => void;
}

const CallControls: React.FC<CallControlsProps> = ({ isMicOn, isCameraOn, onToggleMic, onToggleCamera, onHangup }) => {
    return (
        <div className="flex flex-col items-center w-full mb-10">
            <div className="flex justify-around w-full max-w-xs mb-8">
                <button
                    onClick={onToggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${isMicOn ? 'bg-gray-600' : 'bg-gray-500'}`}
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d={
                                isMicOn
                                    ? 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
                                    : 'M19 11a7 7 0 01-7-7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-5-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM5 5l14 14'
                            }
                        />
                    </svg>
                </button>
                {onToggleCamera && (
                    <button
                        onClick={onToggleCamera}
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${isCameraOn ? 'bg-gray-600' : 'bg-gray-500'}`}
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d={
                                    isCameraOn
                                        ? 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                                        : 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18'
                                }
                            />
                        </svg>
                    </button>
                )}
            </div>
            <button
                onClick={onHangup}
                className="w-20 h-20 rounded-full flex items-center justify-center bg-red-500"
            >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default CallControls;