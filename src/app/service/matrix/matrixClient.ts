// matrixClient.ts
import { createClient, MatrixClient, SyncState, ClientEvent } from "matrix-js-sdk";
import { MATRIX_CONFIG } from "@/app/service/utils/config";

export class MatrixClientManager {
  private static client: MatrixClient | null = null;

  static initialize(accessToken: string, userId: string): MatrixClient {
    if (!this.client) {
      let deviceId = sessionStorage.getItem(`deviceId_${userId}`);
      if (!deviceId) {
        deviceId = this.generateDeviceId(userId);
        sessionStorage.setItem(`deviceId_${userId}`, deviceId);
      }

      console.log(`Khởi tạo MatrixClient cho user ${userId} với deviceId: ${deviceId}`);

      this.client = createClient({
        baseUrl: MATRIX_CONFIG.BASE_URL,
        accessToken,
        userId,
        deviceId,
        // iceServers: MATRIX_CONFIG.ICE_SERVERS,
      });

      this.client.on(ClientEvent.Sync, (state: SyncState, prevState: SyncState | null) => {
        console.log(`Trạng thái sync cho ${userId} (deviceId: ${deviceId}): ${state} (trước đó: ${prevState})`);
        if (state === "PREPARED") {
          console.log(`✅ MatrixClient đã đồng bộ xong cho ${userId}!`);
        } else if (state === "ERROR") {
          console.error(`❌ Lỗi đồng bộ hóa cho ${userId}!`);
        }
      });

      this.client.startClient({ initialSyncLimit: 10 }).catch(error => {
        console.error(`Lỗi khi khởi động client cho ${userId}:`, error);
      });
    }
    return this.client;
  }

  static getClient(): MatrixClient | null {
    if (!this.client) {
      return null;
    }
    return this.client;
  }

  static reset(): void {
    this.client = null;
  }

  private static generateDeviceId(userId: string): string {
    return `${userId.split(':')[0]}-${Math.random().toString(36).substring(2, 15)}`;
  }
}