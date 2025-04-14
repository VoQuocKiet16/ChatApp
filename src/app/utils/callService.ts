import { MatrixClient, MatrixCall, createNewMatrixCall } from 'matrix-js-sdk';

const CallEvent = {
    FeedsChanged: 'feeds_changed',
    Hangup: 'Call.hangup',
    Error: 'Call.error',
    IceConnectionState: 'iceconnectionstatechange',
} as const;

const CallState = {
    Connected: 'connected',
} as const;

const CallErrorCode = { UserHangup: 'user_hangup' } as const;
const CallEventHandlerEvent = { Incoming: 'Call.incoming' } as const;

export class CallService {
    private matrixClient: MatrixClient;
    private activeCall: MatrixCall | null = null;
    private callStartTime: number | null = null;
    private callDurationListeners: ((duration: number) => void)[] = [];
    private callStateListeners: ((state: string) => void)[] = [];
    private durationTimer: NodeJS.Timeout | null = null;
    private isConnected: boolean = false;

    constructor(matrixClient: MatrixClient) {
        this.matrixClient = matrixClient;
    }

    async startVoiceCall(roomId: string): Promise<MatrixCall> {
        if (this.activeCall) {
            this.hangupCall();
        }
        const newCall = createNewMatrixCall(this.matrixClient, roomId);
        if (!newCall) {
            throw new Error('Không thể tạo cuộc gọi thoại: createNewMatrixCall trả về null');
        }
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            throw new Error('Không thể truy cập micro: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
        }
        newCall.placeVoiceCall();
        this.activeCall = newCall;
        this.setupCallListeners(newCall);
        return newCall;
    }

    async startVideoCall(roomId: string): Promise<MatrixCall> {
        const newCall = createNewMatrixCall(this.matrixClient, roomId);
        if (!newCall) {
            throw new Error('Không thể tạo cuộc gọi video: createNewMatrixCall trả về null');
        }
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err) {
            throw new Error('Không thể truy cập camera/micro: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
        }
        newCall.placeVideoCall();
        this.activeCall = newCall;
        this.setupCallListeners(newCall);
        return newCall;
    }

    async answerCall(call: MatrixCall): Promise<void> {
        const isVoiceCall = call.type === 'voice';
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true, video: !isVoiceCall });
        } catch (err) {
            throw new Error('Không thể truy cập thiết bị: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
        }
        call.answer();
        this.activeCall = call;
        this.setupCallListeners(call);
    }

    hangupCall(): void {
        if (this.activeCall) {
            const localFeed = this.activeCall.getLocalFeeds()[0];
            const remoteFeed = this.activeCall.getRemoteFeeds()[0];
            [localFeed, remoteFeed].forEach(feed => {
                if (feed) {
                    feed.stream.getTracks().forEach(track => {
                        track.stop();
                        console.log('Stopped track:', track.id);
                    });
                }
            });
            this.activeCall.hangup(CallErrorCode.UserHangup, true); // Force hangup
            this.activeCall = null;
            this.callStartTime = null;
            this.isConnected = false;
            this.notifyDuration(0);
            this.notifyCallState('');
            if (this.durationTimer) {
                console.log('Clearing duration timer on hangup');
                clearInterval(this.durationTimer);
                this.durationTimer = null;
            }
        }
    }

    rejectCall(call: MatrixCall): void {
        call.reject();
        this.callStartTime = null;
        this.isConnected = false;
        this.notifyDuration(0);
        this.notifyCallState('');
        if (this.durationTimer) {
            console.log('Clearing duration timer on reject');
            clearInterval(this.durationTimer);
            this.durationTimer = null;
        }
    }

    onIncomingCall(callback: (call: MatrixCall) => void): void {
        this.matrixClient.on(CallEventHandlerEvent.Incoming, callback);
    }

    removeIncomingCallListener(callback: (call: MatrixCall) => void): void {
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
        console.log('Notifying call duration:', duration);
        this.callDurationListeners.forEach((callback) => callback(duration));
    }

    private notifyCallState(state: string): void {
        console.log('Notifying call state:', state);
        this.callStateListeners.forEach((callback) => callback(state));
    }

    private setupCallListeners(call: MatrixCall): void {
        call.on(CallEvent.IceConnectionState, (state: string) => {
            console.log('ICE connection state changed:', state);
            if (state === CallState.Connected && !this.isConnected) {
                this.isConnected = true;
                this.notifyCallState(CallState.Connected);
                this.callStartTime = Date.now();
                this.startDurationTimer();
            }
        });

        call.on(CallEvent.FeedsChanged, () => {
            const remoteStream = call.getRemoteFeeds()[0]?.stream;
            console.log('Feeds changed, remote stream:', remoteStream ? 'exists' : 'not exists');
            if (remoteStream && !this.isConnected) {
                console.log('Remote feed detected, assuming call is connected');
                this.isConnected = true;
                this.notifyCallState(CallState.Connected);
                this.callStartTime = Date.now();
                this.startDurationTimer();
            }
        });

        call.on(CallEvent.Hangup, () => {
            console.log('Call hung up in CallService');
            const localFeed = call.getLocalFeeds()[0];
            const remoteFeed = call.getRemoteFeeds()[0];
            [localFeed, remoteFeed].forEach(feed => {
                if (feed) {
                    feed.stream.getTracks().forEach(track => {
                        track.stop();
                        console.log('Stopped track on hangup:', track.id);
                    });
                }
            });
            this.isConnected = false;
            this.callStartTime = null;
            this.activeCall = null;
            this.notifyDuration(0);
            this.notifyCallState('');
            if (this.durationTimer) {
                console.log('Clearing duration timer on hangup event');
                clearInterval(this.durationTimer);
                this.durationTimer = null;
            }
        });

        call.on(CallEvent.Error, (err: Error) => {
            console.error('Call error:', err.message);
            this.isConnected = false;
            this.callStartTime = null;
            this.notifyDuration(0);
            this.notifyCallState('');
            if (this.durationTimer) {
                console.log('Clearing duration timer on error');
                clearInterval(this.durationTimer);
                this.durationTimer = null;
            }
        });
    }

    private startDurationTimer(): void {
        if (this.durationTimer) {
            console.log('Clearing existing duration timer');
            clearInterval(this.durationTimer);
        }
        this.durationTimer = setInterval(() => {
            if (this.callStartTime && this.isConnected) {
                const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
                this.notifyDuration(duration);
            } else {
                console.log('Stopping duration timer: call is not connected');
                clearInterval(this.durationTimer);
                this.durationTimer = null;
            }
        }, 1000);
    }

    getActiveCall(): MatrixCall | null {
        return this.activeCall;
    }
}