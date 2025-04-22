import React, { useState } from 'react';
import  useCall from '@/app/hooks/useCall';
import CallControls from './CallControls';

const VoiceCallUI: React.FC = () => {
    const { state, hangupCall } = useCall();
    const [isMicOn, setIsMicOn] = useState<boolean>(true);

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleMic = () => {
        console.log('Toggling mic, current state:', isMicOn);
        setIsMicOn((prev) => {
            const newMicState = !prev;
            if (state.activeCall) {
                const localFeed = state.activeCall.getLocalFeeds()[0];
                if (localFeed) {
                    const audioTracks = localFeed.stream.getAudioTracks();
                    audioTracks.forEach((track) => {
                        track.enabled = newMicState;
                        console.log('Mic track enabled:', track.enabled);
                    });
                }
            }
            return newMicState;
        });
    };

    if (!state.activeCall || state.callType !== 'voice') return null;

    return (
        <div className="h-screen bg-gray-800 flex flex-col items-center justify-between p-6">
            <div className="w-full text-center pt-10">
                <h2 className="text-white text-xl font-medium">
                    {state.isCaller ? state.receiverName : state.callerName}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                    {state.callState === 'connected' ? formatDuration(state.callDuration) : 'Đang chờ kết nối...'}
                </p>
                {state.error && <p className="text-red-500 text-sm mt-1">{state.error}</p>}
            </div>

            <div className="flex-grow flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-gray-600 overflow-hidden">
                    {/* Placeholder cho ảnh đại diện */}
                </div>
            </div>

            <CallControls
                isMicOn={isMicOn}
                onToggleMic={toggleMic}
                onHangup={hangupCall}
            />

            <audio ref={(el) => {
                if (el && state.activeCall) {
                    const remoteStream = state.activeCall.getRemoteFeeds()[0]?.stream;
                    if (remoteStream && el.srcObject !== remoteStream) {
                        el.srcObject = remoteStream;
                        el.play().catch((err) => console.error('Error playing remote audio:', err));
                    }
                }
            }} autoPlay className="hidden" />
        </div>
    );
};

export default VoiceCallUI;