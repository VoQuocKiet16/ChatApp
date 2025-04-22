import React, { useState } from 'react';
import useCall from '@/app/hooks/useCall';
import CallControls from './CallControls';
import VideoFeed from './VideoFeed';

const VideoCallUI: React.FC = () => {
    const { state, hangupCall } = useCall();
    const [isMicOn, setIsMicOn] = useState<boolean>(true);
    const [isCameraOn, setIsCameraOn] = useState<boolean>(true);

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

    const toggleCamera = () => {
        console.log('Toggling camera, current state:', isCameraOn);
        setIsCameraOn((prev) => {
            const newCameraState = !prev;
            if (state.activeCall) {
                const localFeed = state.activeCall.getLocalFeeds()[0];
                if (localFeed) {
                    const videoTracks = localFeed.stream.getVideoTracks();
                    videoTracks.forEach((track) => {
                        track.enabled = newCameraState;
                        console.log('Camera track enabled:', track.enabled);
                    });
                }
            }
            return newCameraState;
        });
    };

    if (!state.activeCall || state.callType !== 'video') return null;

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

            <VideoFeed call={state.activeCall} />

            <CallControls
                isMicOn={isMicOn}
                isCameraOn={isCameraOn}
                onToggleMic={toggleMic}
                onToggleCamera={toggleCamera}
                onHangup={hangupCall}
            />
        </div>
    );
};

export default VideoCallUI;