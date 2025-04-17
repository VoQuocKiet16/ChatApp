import { MatrixClient, MatrixCall, createNewMatrixCall } from 'matrix-js-sdk';
import { CallErrorCode, CallEvent, CallState } from 'matrix-js-sdk/lib/webrtc/call';
import { CallEventHandlerEvent } from 'matrix-js-sdk/lib/webrtc/callEventHandler';



export class CallService {
    private matrixClient: MatrixClient;
    private activeCall: MatrixCall | null = null;
    private callStartTime: number | null = null;
    private callDurationListeners: ((duration: number) => void)[] = [];
    private callStateListeners: ((state: string) => void)[] = [];
    private durationTimer: NodeJS.Timeout | null = null;
    private isConnected: boolean = false;
    private timeoutId: NodeJS.Timeout | null = null;

    constructor(matrixClient: MatrixClient) {
        this.matrixClient = matrixClient;
    }

    async startVoiceCall(roomId: string): Promise<MatrixCall> {
        console.log('Starting voice call for room:', roomId);
        this.cleanupCall();
        const newCall = createNewMatrixCall(this.matrixClient, roomId);
        if (!newCall) {
            throw new Error('Không thể tạo cuộc gọi thoại: createNewMatrixCall trả về null');
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Microphone stream obtained:', stream.id);
            // newCall.setLocalAudioVideoStream(stream); // Explicitly set stream
        } catch (err) {
            throw new Error('Không thể truy cập micro: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
        }
        newCall.placeVoiceCall();
        this.activeCall = newCall;
        this.setupCallListeners(newCall);
        return newCall;
    }

    // async startVideoCall(roomId: string): Promise<MatrixCall> {
    //     console.log('Starting video call for room:', roomId);
    //     this.cleanupCall();
    //     const newCall = createNewMatrixCall(this.matrixClient, roomId);
    //     if (!newCall) {
    //         throw new Error('Không thể tạo cuộc gọi video: createNewMatrixCall trả về null');
    //     }
    //     try {
    //         const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    //         console.log('Camera and microphone stream obtained:', stream.id);
    //         newCall.setLocalAudioVideoStream(stream); // Explicitly set stream
    //     } catch (err) {
    //         throw new Error('Không thể truy cập camera/micro: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
    //     }
    //     newCall.placeVideoCall();
    //     this.activeCall = newCall;
    //     this.setupCallListeners(newCall);
    //     return newCall;
    // }

    async answerCall(call: MatrixCall): Promise<void> {
        console.log('Answering call:', call.callId);
        this.cleanupCall();
        const isVoiceCall = call.type === 'voice';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !isVoiceCall });
            console.log('Media stream obtained for answering:', stream.id);
            // call.setLocalAudioVideoStream(stream); // Explicitly set stream
        } catch (err) {
            throw new Error('Không thể truy cập thiết bị: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
        }
        call.answer();
        this.activeCall = call;
        this.setupCallListeners(call);
    }
    
    hangupCall(): void {
        if (!this.activeCall) {
            console.log('No active call to hang up');
            return;
        }
        const callId = this.activeCall.callId; // Lưu callId để tránh race condition
        console.log(`Attempting to hangup call, activeCall: ${callId}`);
        try {
            console.log(`Call ${callId} hangup() ending call (reason=user_hangup)`);
            this.activeCall.hangup(CallErrorCode.UserHangup, true);
            console.log(`Hangup signal sent for call: ${callId}`);
        } catch (err) {
            console.error(`Error during hangup for call ${callId}:`, err);
        }
        this.cleanupCall();
    }

    rejectCall(call: MatrixCall): void {
        console.log('Rejecting call:', call.callId);
        try {
            call.reject();
        } catch (err) {
            console.error('Error rejecting call:', err);
        }
        this.cleanupCall();
    }

    onIncomingCall(callback: (call: MatrixCall) => void): () => void {
        console.log('Registering incoming call listener');
        const wrappedCallback = (call: MatrixCall) => {
            if (call.state === CallState.Ringing) {
                callback(call);
            } else {
                console.warn(`Ignoring incoming call ${call.callId} in unexpected state: ${call.state}`);
            }
        };
        this.matrixClient.on(CallEventHandlerEvent.Incoming, wrappedCallback);
        return () => {
            console.log('Removing incoming call listener');
            this.matrixClient.removeListener(CallEventHandlerEvent.Incoming, wrappedCallback);
        };
    }

    removeIncomingCallListener(callback: (call: MatrixCall) => void): void {
        console.log('Removing incoming call listener');
        this.matrixClient.removeListener(CallEventHandlerEvent.Incoming, callback);
    }

    onCallDuration(callback: (duration: number) => void): () => void {
        console.log('Registering call duration listener');
        this.callDurationListeners.push(callback);
        return () => {
            console.log('Removing call duration listener');
            this.callDurationListeners = this.callDurationListeners.filter((l) => l !== callback);
        };
    }

    onCallState(callback: (state: string) => void): () => void {
        console.log('Registering call state listener');
        this.callStateListeners.push(callback);
        return () => {
            console.log('Removing call state listener');
            this.callStateListeners = this.callStateListeners.filter((l) => l !== callback);
        };
    }

    private notifyDuration(duration: number): void {
        console.log('Notifying call duration:', duration, 'isConnected:', this.isConnected, 'activeCall:', this.activeCall ? this.activeCall.callId : 'none');
        this.callDurationListeners.forEach((callback) => callback(duration));
    }

    private notifyCallState(state: string): void {
        console.log('Notifying call state:', state);
        this.callStateListeners.forEach((callback) => callback(state));
    }

    private setupCallListeners(call: MatrixCall): void {
        console.log('Setting up call listeners for call:', call.callId);

        const onStateChange = (state: string) => {
            console.log('Call state changed:', state, 'for call:', call.callId);
            if (state === CallState.Connected && !this.isConnected) {
                const remoteStream = call.getRemoteFeeds()[0]?.stream;
                if (remoteStream) {
                    this.isConnected = true;
                    this.callStartTime = Date.now();
                    this.notifyCallState(CallState.Connected);
                    this.startDurationTimer();
                    console.log('Call connected, starting timer for call:', call.callId);
                }
            } else if (state === CallState.Ended) {
                console.log('Call ended, cleaning up for call:', call.callId);
                this.cleanupCall();
            }
        };

        const onFeedsChanged = () => {
            const remoteStream = call.getRemoteFeeds()[0]?.stream;
            console.log('Feeds changed, remote stream:', remoteStream ? 'exists' : 'not exists', 'for call:', call.callId);
            if (remoteStream && !this.isConnected && call.state === CallState.Connected) {
                console.log('Remote feed detected, confirming call is connected');
                this.isConnected = true;
                this.callStartTime = Date.now();
                this.notifyCallState(CallState.Connected);
                this.startDurationTimer();
            }
        };

        const onHangup = () => {
            console.log('Received Hangup event for call:', call.callId);
            this.cleanupCall();
        };

        const onError = (err: Error) => {
            console.error('Call error for call:', call.callId, 'error:', err.message);
            this.cleanupCall();
        };

        call.on(CallEvent.State, onStateChange);
        call.on(CallEvent.FeedsChanged, onFeedsChanged);
        call.on(CallEvent.Hangup, onHangup);
        call.on(CallEvent.Error, onError);

        this.timeoutId = setTimeout(() => {
            if (this.isConnected || this.activeCall) {
                console.warn('Call timeout, forcing hangup for call:', call.callId);
                this.hangupCall();
            }
        }, 60000);

        call.on(CallEvent.Hangup, () => {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
        });
        call.on(CallEvent.Error, () => {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
        });
        call.on(CallEvent.State, (state: string) => {
            if (state === CallState.Ended && this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
        });
    }

    private startDurationTimer(): void {
        console.log('Starting duration timer');
        if (this.durationTimer) {
            console.log('Clearing existing duration timer');
            clearInterval(this.durationTimer);
            this.durationTimer = null;
        }

        if (!this.isConnected || !this.activeCall) {
            console.log('Not starting duration timer: call is not connected or no active call');
            return;
        }

        this.durationTimer = setInterval(() => {
            console.log('Timer tick, checking conditions:', {
                callStartTime: !!this.callStartTime,
                isConnected: this.isConnected,
                activeCall: !!this.activeCall,
            });
            if (this.callStartTime && this.isConnected && this.activeCall) {
                const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
                this.notifyDuration(duration);
            } else {
                console.log('Stopping duration timer: call is not connected or no active call');
                if (this.durationTimer) {
                    clearInterval(this.durationTimer);
                    this.durationTimer = null;
                }
            }
        }, 1000);
    }

    private cleanupCall(): void {
        console.log('Cleaning up call, activeCall:', this.activeCall ? this.activeCall.callId : 'none');
        if (this.activeCall) {
            const localFeeds = this.activeCall.getLocalFeeds();
            const remoteFeeds = this.activeCall.getRemoteFeeds();
            [...localFeeds, ...remoteFeeds].forEach(feed => {
                if (feed && feed.stream) {
                    feed.stream.getTracks().forEach(track => {
                        track.stop();
                        console.log('Stopped track:', track.id);
                    });
                }
            });
        }

        this.isConnected = false;
        this.callStartTime = null;
        this.activeCall = null;

        if (this.durationTimer) {
            console.log('Clearing duration timer in cleanupCall');
            clearInterval(this.durationTimer);
            this.durationTimer = null;
        }

        if (this.timeoutId) {
            console.log('Clearing timeout in cleanupCall');
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        this.notifyDuration(0);
        this.notifyCallState('');
    }

    getActiveCall(): MatrixCall | null {
        console.log('Getting active call:', this.activeCall ? this.activeCall.callId : 'none');
        return this.activeCall;
    }
}