'use client';
import { MatrixCall } from 'matrix-js-sdk';

interface CallModalProps {
    incomingCall: MatrixCall | null;
    callerName: string; // Thêm prop callerName
    onAcceptCall: () => void;
    onRejectCall: () => void;
}

const CallModal: React.FC<CallModalProps> = ({ incomingCall, callerName, onAcceptCall, onRejectCall }) => {
    if (!incomingCall) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4">
                    Cuộc gọi đến từ {callerName}
                </h3>
                <div className="flex space-x-4">
                    <button
                        onClick={onAcceptCall}
                        className="bg-green-500 text-white rounded-lg p-3 hover:bg-green-600 transition"
                    >
                        Chấp nhận
                    </button>
                    <button
                        onClick={onRejectCall}
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