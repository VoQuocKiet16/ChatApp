'use client';
import { useRef, useState, useEffect } from 'react';
import { MatrixCall, CallEvent } from 'matrix-js-sdk';
import { CallService } from '@/app/utils/callService';

interface VoiceCallProps {
    callService: CallService;
    roomId: string;
    onEndCall?: () => void;
    activeCall?: MatrixCall | null;
    callerName?: string; // Thêm prop để hiển thị tên người nhận
}

const VoiceCall: React.FC<VoiceCallProps> = ({ callService, roomId, onEndCall, activeCall, callerName = 'Người dùng không xác định' }) => {
    const [call, setCall] = useState<MatrixCall | null>(activeCall || null);
    const [isCalling, setIsCalling] = useState(!!activeCall);
    const [error, setError] = useState<string | null>(null);
    const [callDuration, setCallDuration] = useState<number>(0); // Thời gian cuộc gọi (tính bằng giây)
    const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false); // Trạng thái loa
    const [isMicOn, setIsMicOn] = useState<boolean>(true); // Trạng thái mic
    const localAudioRef = useRef<HTMLAudioElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    // Tính thời gian cuộc gọi
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (isCalling) {
            timer = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isCalling]);

    useEffect(() => {
        if (activeCall) {
            setCall(activeCall);
            setIsCalling(true);
            setupCallListeners(activeCall);
        }
    }, [activeCall]);

    // Định dạng thời gian cuộc gọi (MM:SS)
    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const setupCallListeners = (call: MatrixCall) => {
        call.on(CallEvent.FeedsChanged, () => {
            const localStream = call.getLocalFeeds()[0]?.stream;
            const remoteStream = call.getRemoteFeeds()[0]?.stream;
            if (localAudioRef.current && localStream) localAudioRef.current.srcObject = localStream;
            if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
        });
        call.on(CallEvent.Hangup, () => {
            setIsCalling(false);
            setCall(null);
            setCallDuration(0);
            onEndCall?.();
        });
        call.on(CallEvent.Error, (err) => {
            setError(err.message);
            setIsCalling(false);
            setCall(null);
            setCallDuration(0);
            onEndCall?.();
        });
    };

    const startVoiceCall = async () => {
        try {
            const newCall = await callService.startVoiceCall(roomId);
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
        setCallDuration(0);
        onEndCall?.();
    };

    const toggleSpeaker = () => {
        setIsSpeakerOn((prev) => !prev);
        // Logic để bật/tắt loa (nếu cần)
    };

    const toggleMic = () => {
        setIsMicOn((prev) => !prev);
        // Logic để bật/tắt mic (nếu cần)
    };

    return (
        <div className="h-screen bg-blue-600 flex flex-col items-center justify-between p-4">
            {/* Header */}
            <div className="flex items-center justify-between w-full">
                <button className="text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-white text-lg font-semibold">Zalo</h1>
                <button className="text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l5-5m0 10l-5-5" />
                    </svg>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-gray-300 mb-4 overflow-hidden">
                    {/* Placeholder cho ảnh đại diện */}
                    {/* <img src="/placeholder-avatar.jpg" alt="Avatar" className="w-full h-full object-cover" /> */}
                </div>
                <h2 className="text-white text-2xl font-semibold">{callerName}</h2>
                <p className="text-white text-sm mt-2">
                    {isCalling ? formatDuration(callDuration) : 'Đang nối máy đến nguồn nhận'}
                </p>
            </div>

            {/* Controls */}
            <div className="flex justify-around w-full mb-8">
                <button
                    onClick={toggleSpeaker}
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${isSpeakerOn ? 'bg-blue-800' : 'bg-blue-500'}`}
                >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z" />
                    </svg>
                    <span className="text-white text-xs mt-1">Loa</span>
                </button>

                <button
                    onClick={isCalling ? hangupCall : startVoiceCall}
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${isCalling ? 'bg-red-500' : 'bg-green-500'}`}
                >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isCalling ? "M6 18L18 6M6 6l12 12" : "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"} />
                    </svg>
                    <span className="text-white text-xs mt-1">{isCalling ? 'Kết thúc' : 'Gọi'}</span>
                </button>

                <button
                    onClick={toggleMic}
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${isMicOn ? 'bg-blue-500' : 'bg-blue-800'}`}
                >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMicOn ? "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-5-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM5 5l14 14"} />
                    </svg>
                    <span className="text-white text-xs mt-1">Mic</span>
                </button>
            </div>

            <audio ref={localAudioRef} autoPlay muted className="hidden" />
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
        </div>
    );
};

export default VoiceCall;