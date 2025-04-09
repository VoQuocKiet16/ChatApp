'use client';
import { useRef, useState, useEffect } from 'react';
import { MatrixCall } from 'matrix-js-sdk';
import { CallService } from '@/app/utils/callService';

interface VideoCallProps {
    callService: CallService;
    roomId: string;
    onEndCall?: () => void;
    activeCall?: MatrixCall | null;
}

const VideoCall: React.FC<VideoCallProps> = ({ callService, roomId, onEndCall, activeCall }) => {
    const [call, setCall] = useState<MatrixCall | null>(activeCall || null);
    const [isCalling, setIsCalling] = useState(!!activeCall);
    const [error, setError] = useState<string | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (activeCall) {
            setCall(activeCall);
            setIsCalling(true);
            setupCallListeners(activeCall);
        }
    }, [activeCall]);

    const setupCallListeners = (call: MatrixCall) => {
        call.on('feed_changed', () => {
            const localStream = call.getLocalFeeds()[0]?.stream;
            const remoteStream = call.getRemoteFeeds()[0]?.stream;
            if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
            if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
        });
        call.on('hangup', () => {
            setIsCalling(false);
            setCall(null);
            onEndCall?.();
        });
        call.on('error', (err) => {
            setError(err.message);
            setIsCalling(false);
            setCall(null);
            onEndCall?.();
        });
    };

    const startVideoCall = async () => {
        try {
            const newCall = await callService.startVideoCall(roomId);
            setCall(newCall);
            setIsCalling(true);
            setupCallListeners(newCall);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi không xác định');
        }
    };

    const hangupCall = () => {
        callService.hangupCall();
        setIsCalling(false);
        setCall(null);
        onEndCall?.();
    };

    return (
        <div className="p-4 bg-gray-100 rounded-lg shadow-md flex-1 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold mb-4">Cuộc gọi video</h3>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {!isCalling ? (
                <button
                    onClick={startVideoCall}
                    className="bg-green-500 text-white rounded-lg p-3 hover:bg-green-600 transition"
                >
                    Bắt đầu cuộc gọi video
                </button>
            ) : (
                <button
                    onClick={hangupCall}
                    className="bg-red-500 text-white rounded-lg p-3 hover:bg-red-600 transition"
                >
                    Kết thúc cuộc gọi
                </button>
            )}
            <div className="mt-6 flex space-x-4 w-full max-w-4xl">
                <video ref={localVideoRef} autoPlay muted className="w-1/2 rounded-lg shadow-sm border" />
                <video ref={remoteVideoRef} autoPlay className="w-1/2 rounded-lg shadow-sm border" />
            </div>
        </div>
    );
};

export default VideoCall;