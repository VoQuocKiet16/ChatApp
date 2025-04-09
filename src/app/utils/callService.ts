import { MatrixClient, MatrixCall, createNewMatrixCall } from 'matrix-js-sdk';

// CallErrorCode không được export trực tiếp từ matrix-js-sdk
// Sử dụng giá trị thay thế
const CallErrorCode = {
    UserHangup: 'user_hangup', // Giá trị thay thế cho CallErrorCode.UserHangup
} as const;

// CallEventHandlerEvent không được export trực tiếp từ matrix-js-sdk
// Sử dụng giá trị thay thế
const CallEventHandlerEvent = {
    Incoming: 'Call.incoming', // Giá trị thay thế cho CallEventHandlerEvent.Incoming
} as const;

export class CallService {
    private matrixClient: MatrixClient;
    private activeCall: MatrixCall | null = null;

    constructor(matrixClient: MatrixClient) {
        this.matrixClient = matrixClient;
    }

    async startVoiceCall(roomId: string): Promise<MatrixCall> {
        const newCall = createNewMatrixCall(this.matrixClient, roomId);
        if (!newCall) {
            throw new Error('Không thể tạo cuộc gọi thoại: createNewMatrixCall trả về null');
        }
        await navigator.mediaDevices.getUserMedia({ audio: true });
        newCall.placeVoiceCall();
        this.activeCall = newCall;
        return newCall;
    }

    async startVideoCall(roomId: string): Promise<MatrixCall> {
        const newCall = createNewMatrixCall(this.matrixClient, roomId);
        if (!newCall) {
            throw new Error('Không thể tạo cuộc gọi video: createNewMatrixCall trả về null');
        }
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        newCall.placeVideoCall();
        this.activeCall = newCall;
        return newCall;
    }

    async answerCall(call: MatrixCall): Promise<void> {
        const isVoiceCall = call.type === 'voice';
        await navigator.mediaDevices.getUserMedia({ audio: true, video: !isVoiceCall });
        call.answer();
        this.activeCall = call;
    }

    hangupCall(): void {
        if (this.activeCall) {
            this.activeCall.hangup(CallErrorCode.UserHangup, false);
            this.activeCall = null;
        }
    }

    rejectCall(call: MatrixCall): void {
        call.reject();
    }

    onIncomingCall(callback: (call: MatrixCall) => void): void {
        this.matrixClient.on(CallEventHandlerEvent.Incoming, callback);
    }

    removeIncomingCallListener(callback: (call: MatrixCall) => void): void {
        this.matrixClient.removeListener(CallEventHandlerEvent.Incoming, callback);
    }
}