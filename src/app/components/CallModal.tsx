// CallModal.tsx
'use client';
import { MatrixCall } from 'matrix-js-sdk';
import { VideoCallService } from '@/app/utils/videoCallService';
import { VoiceCallService } from '@/app/utils/voiceCallService';

interface CallModalProps {
    incomingCall: MatrixCall | null;
    callerName: string;
    voiceCallService: VoiceCallService; // Add voiceCallService prop
    videoCallService: VideoCallService; // Add videoCallService prop
    onAcceptCall: (call: MatrixCall) => void; // Update to pass call
    onRejectCall: (call: MatrixCall) => void; // Update to pass call
}

const CallModal: React.FC<CallModalProps> = ({
    incomingCall,
    callerName,
    onAcceptCall,
    onRejectCall,
}) => {
    if (!incomingCall) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4">
                    {incomingCall.type === 'video'
                        ? `Cuộc gọi video đến từ ${callerName}`
                        : `Cuộc gọi thoại đến từ ${callerName}`}
                </h3>
                <div className="flex space-x-4">
                    <button
                        onClick={() => onAcceptCall(incomingCall)}
                        className="bg-green-500 text-white rounded-lg p-3 hover:bg-green-600 transition"
                    >
                        Chấp nhận
                    </button>
                    <button
                        onClick={() => onRejectCall(incomingCall)}
                        className="bg-red-500 text-white rounded-lg p-3 hover:bg-red-600 transition"
                    >
                        Từ chối
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallModal;