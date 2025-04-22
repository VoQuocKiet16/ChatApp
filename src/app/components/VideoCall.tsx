/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { MatrixCall, CallEvent } from 'matrix-js-sdk';
import { VideoCallService } from '@/app/utils/videoCallService';

interface VideoCallProps {
    videoCallService: VideoCallService; // Đổi tên prop để rõ ràng
    roomId: string;
    onEndCall?: () => void;
    activeCall?: MatrixCall | null;
    callerName?: string;
    receiverName?: string;
    isCaller?: boolean;
}

const VideoCall: React.FC<VideoCallProps> = ({
    videoCallService,
    roomId,
    onEndCall,
    activeCall,
    callerName = 'Unknown User',
    receiverName = 'Unknown User',
    isCaller = false,
}) => {
    console.log('VideoCall props:', { callerName, receiverName, isCaller });
    const [call, setCall] = useState<MatrixCall | null>(null);
    const [isCalling, setIsCalling] = useState(false);
    const [callState, setCallState] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [callDuration, setCallDuration] = useState<number>(0);
    const [isMicOn, setIsMicOn] = useState<boolean>(true);
    const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const currentStreamId = useRef<string | null>(null); // Track current remote stream to prevent reassignment

    useEffect(() => {
        console.log('VideoCall useEffect for listeners triggered');
        const handleDurationUpdate = (duration: number) => {
            console.log('Call duration updated in VideoCall:', duration);
            setCallDuration(duration);
        };

        const handleStateUpdate = (state: string) => {
            console.log('Call state in VideoCall:', state);
            setCallState(state);
            if (state === 'connected') {
                setIsCalling(true);
            } else {
                setIsCalling(false);
                setCallDuration(0);
            }
        };

        const removeDurationListener = videoCallService.onCallDuration(handleDurationUpdate);
        const removeStateListener = videoCallService.onCallState(handleStateUpdate);

        return () => {
            console.log('VideoCall cleanup listeners');
            removeDurationListener();
            removeStateListener();
        };
    }, [videoCallService]);

    const cleanupCallState = useCallback(() => {
        console.log('Cleaning up call state in VideoCall');
        setIsCalling(false);
        setCall(null);
        setCallState('');
        setCallDuration(0);
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
            localVideoRef.current.pause();
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
            remoteVideoRef.current.pause();
        }
        currentStreamId.current = null;
        videoCallService.hangupCall();
        onEndCall?.();
    }, [videoCallService, onEndCall]);

    const playRemoteVideo = useCallback(() => {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.play().catch((err) => {
                console.error('Error playing remote video:', err);
                setError('Không thể phát video cuộc gọi: ' + err.message);
            });
        }
    }, []);

    const setupCallListeners = useCallback(
        (call: MatrixCall) => {
            console.log('Setting up call listeners for VideoCall, call:', call.callId);
            const onFeedsChanged = () => {
                const localStream = call.getLocalFeeds()[0]?.stream;
                const remoteStream = call.getRemoteFeeds()[0]?.stream;
                console.log('Local stream:', localStream ? 'exists' : 'not exists');
                console.log('Remote stream:', remoteStream ? 'exists' : 'not exists', 'streamId:', remoteStream?.id);
                if (localStream && localVideoRef.current) {
                    localVideoRef.current.srcObject = localStream;
                    localVideoRef.current.play().catch((err) => console.error('Error playing local video:', err));
                }
                if (remoteStream && remoteVideoRef.current) {
                    if (currentStreamId.current !== remoteStream.id) {
                        console.log('Assigning new remote stream:', remoteStream.id);
                        remoteVideoRef.current.srcObject = remoteStream;
                        currentStreamId.current = remoteStream.id;
                        playRemoteVideo();
                    } else {
                        console.log('Skipping redundant stream assignment:', remoteStream.id);
                    }
                }
                if (remoteStream && callState !== 'connected') {
                    setCallState('connected');
                    setIsCalling(true);
                }
            };

            const onHangup = () => {
                console.log('Received Hangup event in VideoCall for call:', call.callId);
                cleanupCallState();
            };

            const onError = (err: Error) => {
                console.error('Call error in VideoCall for call:', call.callId, 'error:', err.message);
                setError(err.message);
                cleanupCallState();
            };

            const onStateChange = (state: string) => {
                console.log('Call state changed in VideoCall:', state, 'for call:', call.callId);
                if (state === 'ended') {
                    cleanupCallState();
                }
            };

            call.on(CallEvent.FeedsChanged, onFeedsChanged);
            call.on(CallEvent.Hangup, onHangup);
            call.on(CallEvent.Error, onError);
            call.on(CallEvent.State, onStateChange);

            return () => {
                console.log('Cleaning up call listeners for call:', call.callId);
                call.removeListener(CallEvent.FeedsChanged, onFeedsChanged);
                call.removeListener(CallEvent.Hangup, onHangup);
                call.removeListener(CallEvent.Error, onError);
                call.removeListener(CallEvent.State, onStateChange);
            };
        },
        [callState, cleanupCallState, playRemoteVideo]
    );

    useEffect(() => {
        console.log('VideoCall useEffect for activeCall triggered, activeCall:', activeCall ? activeCall.callId : 'not exists');
        let cleanupListeners: (() => void) | null = null;
        if (activeCall && activeCall !== call) {
            setCall(activeCall);
            setIsCalling(true);
            cleanupListeners = setupCallListeners(activeCall);
            const localStream = activeCall.getLocalFeeds()[0]?.stream;
            const remoteStream = activeCall.getRemoteFeeds()[0]?.stream;
            if (localStream && localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
                localVideoRef.current.play().catch((err) => console.error('Error playing local video:', err));
            }
            if (remoteStream && remoteVideoRef.current) {
                if (currentStreamId.current !== remoteStream.id) {
                    console.log('Assigning initial remote stream:', remoteStream.id);
                    remoteVideoRef.current.srcObject = remoteStream;
                    currentStreamId.current = remoteStream.id;
                    playRemoteVideo();
                } else {
                    console.log('Skipping redundant initial stream assignment:', remoteStream.id);
                }
            }
        } else if (!activeCall && call) {
            cleanupCallState();
        }

        return () => {
            if (cleanupListeners) {
                cleanupListeners();
            }
        };
    }, [activeCall, call, setupCallListeners, cleanupCallState, playRemoteVideo]);

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const hangupCall = () => {
        console.log('User clicked hangup button for call:', call ? call.callId : 'none');
        cleanupCallState();
    };

    const toggleMic = () => {
        console.log('Toggling mic, current state:', isMicOn);
        setIsMicOn((prev) => {
            const newMicState = !prev;
            if (call) {
                const localFeed = call.getLocalFeeds()[0];
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
            if (call) {
                const localFeed = call.getLocalFeeds()[0];
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

    const isConnected = callState === 'connected';
    console.log('isConnected:', isConnected, 'callState:', callState, 'call:', call ? call.callId : 'none');

    return (
        <div className="h-screen bg-gray-800 flex flex-col items-center justify-between p-6">
            <div className="w-full text-center pt-10">
                <h2 className="text-white text-xl font-medium">
                    {isCaller ? receiverName : callerName}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                    {isConnected ? formatDuration(callDuration) : 'Đang chờ kết nối...'}
                </p>
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <div className="flex-grow flex items-center justify-center space-x-4">
                <div className="w-1/2 h-3/4 bg-gray-600 rounded-lg overflow-hidden">
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <div className="w-1/4 h-1/4 bg-gray-600 rounded-lg overflow-hidden absolute bottom-10 right-10">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
            </div>

            <div className="flex flex-col items-center w-full mb-10">
                <div className="flex justify-around w-full max-w-xs mb-8">
                    <button
                        onClick={toggleMic}
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
                    <button
                        onClick={toggleCamera}
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
        </div>
    );
};

export default VideoCall;