'use client';
import { useRef, useState, useEffect } from 'react';
import { MatrixCall, CallEvent } from 'matrix-js-sdk';
import { CallService } from '@/app/utils/callService';

interface VoiceCallProps {
    callService: CallService;
    roomId: string;
    onEndCall?: () => void;
    activeCall?: MatrixCall | null;
    callerName?: string;
}

const VoiceCall: React.FC<VoiceCallProps> = ({ callService, roomId, onEndCall, activeCall, callerName = 'Unknown User' }) => {
    const [call, setCall] = useState<MatrixCall | null>(null);
    const [isCalling, setIsCalling] = useState(false);
    const [callState, setCallState] = useState<string>(''); 
    const [error, setError] = useState<string | null>(null);
    const [callDuration, setCallDuration] = useState<number>(0);
    const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);
    const [isMicOn, setIsMicOn] = useState<boolean>(true);
    const localAudioRef = useRef<HTMLAudioElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        console.log('VoiceCall useEffect for listeners triggered');

        const handleDurationUpdate = (duration: number) => {
            console.log('Call duration updated in VoiceCall:', duration);
            setCallDuration(duration); // Cập nhật thời gian trực tiếp
        };

        const handleStateUpdate = (state: string) => {
            console.log('Call state in VoiceCall:', state);
            setCallState(state);
            if (state === 'connected') {
                setIsCalling(true);
            } else {
                setIsCalling(false);
                setCallDuration(0);
            }
        };

        const removeDurationListener = callService.onCallDuration(handleDurationUpdate);
        const removeStateListener = callService.onCallState(handleStateUpdate);

        return () => {
            console.log('VoiceCall cleanup listeners');
            removeDurationListener();
            removeStateListener();
            if (!callService.getActiveCall()) {
                callService.hangupCall();
            }
        };
    }, [callService]);

    useEffect(() => {
        console.log('VoiceCall useEffect for activeCall triggered, activeCall:', activeCall ? 'exists' : 'not exists');
        if (activeCall) {
            setCall(activeCall);
            setIsCalling(true);
            setupCallListeners(activeCall);
            const remoteStream = activeCall.getRemoteFeeds()[0]?.stream;
            if (remoteStream) {
                setCallState('connected');
                setIsCalling(true);
            }
        } else {
            setCall(null);
            setIsCalling(false);
            setCallState('');
            setCallDuration(0);
            if (localAudioRef.current) localAudioRef.current.srcObject = null;
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
        }
    }, [activeCall]);

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const setupCallListeners = (call: MatrixCall) => {
        call.on(CallEvent.FeedsChanged, () => {
            const localStream = call.getLocalFeeds()[0]?.stream;
            const remoteStream = call.getRemoteFeeds()[0]?.stream;
            console.log('Local stream:', localStream ? 'exists' : 'not exists');
            console.log('Remote stream:', remoteStream ? 'exists' : 'not exists');
            if (localAudioRef.current && localStream) localAudioRef.current.srcObject = localStream;
            if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
            if (remoteStream && callState !== 'connected') {
                setCallState('connected');
                setIsCalling(true);
            }
        });
        call.on(CallEvent.Hangup, () => {
            console.log('Call hung up in VoiceCall');
            setIsCalling(false);
            setCall(null);
            setCallState('');
            setCallDuration(0);
            if (localAudioRef.current) localAudioRef.current.srcObject = null;
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
            onEndCall?.();
        });
        call.on(CallEvent.Error, (err) => {
            console.error('Call error in VoiceCall:', err.message);
            setError(err.message);
            setIsCalling(false);
            setCall(null);
            setCallState('');
            setCallDuration(0);
            if (localAudioRef.current) localAudioRef.current.srcObject = null;
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
            onEndCall?.();
        });
    };

    const hangupCall = () => {
        console.log('User clicked hangup button');
        callService.hangupCall();
        setIsCalling(false);
        setCall(null);
        setCallState('');
        setCallDuration(0);
        if (localAudioRef.current) localAudioRef.current.srcObject = null;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
        onEndCall?.();
    };

    const toggleSpeaker = () => {
        setIsSpeakerOn((prev) => !prev);
        // TODO: Thêm logic thực sự bật/tắt loa
    };

    const toggleMic = () => {
        setIsMicOn((prev) => !prev);
        if (call) {
            const localFeed = call.getLocalFeeds()[0];
            if (localFeed) {
                const audioTracks = localFeed.stream.getAudioTracks();
                audioTracks.forEach((track) => (track.enabled = !isMicOn));
            }
        }
    };

    const isConnected = callState === 'connected';
    console.log('isConnected:', isConnected, 'callState:', callState);

    return (
        <div className="h-screen bg-gray-800 flex flex-col items-center justify-between p-6">
            <div className="w-full text-center pt-10">
                <h2 className="text-white text-xl font-medium">{callerName}</h2>
                <p className="text-gray-400 text-sm mt-1">
                    {isConnected ? formatDuration(callDuration) : 'Đang chờ kết nối...'}
                </p>
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <div className="flex-grow flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-gray-600 overflow-hidden">
                    {/* Placeholder cho ảnh đại diện */}
                </div>
            </div>

            <div className="flex flex-col items-center w-full mb-10">
                <div className="flex justify-around w-full max-w-xs mb-8">
                    <button
                        onClick={toggleMic}
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${isMicOn ? 'bg-gray-600' : 'bg-gray-500'}`}
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMicOn ? "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" : "M19 11 Ning7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-5-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM5 5l14 14"} />
                        </svg>
                    </button>
                    <button
                        onClick={toggleSpeaker}
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${isSpeakerOn ? 'bg-gray-500' : 'bg-gray-600'}`}
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z" />
                        </svg>
                    </button>
                </div>
                <button
                    onClick={hangupCall}
                    className="w-20 h-20 rounded-full flex items-center justify-center bg-red-500"
                >
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <audio ref={localAudioRef} autoPlay muted className="hidden" />
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
        </div>
    );
};

export default VoiceCall;