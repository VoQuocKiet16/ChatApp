import { createClient, MatrixClient, SyncState, ClientEvent } from "matrix-js-sdk";
import { MATRIX_CONFIG } from "@/app/services/utils/config";

export class MatrixClientManager {
  private static client: MatrixClient | null = null;
  private static isInitializing: boolean = false;
  private static syncPromise: Promise<void> | null = null;

  /**
   * Initializes the Matrix client and waits for sync to complete.
   * @param accessToken The access token for authentication.
   * @param userId The user ID.
   * @returns The initialized Matrix client.
   */
  static async initialize(accessToken: string, userId: string): Promise<MatrixClient> {
    if (this.client && this.client.getSyncState() !== null) {
      console.log(`Trả về client đã khởi tạo: ${userId}, trạng thái: ${this.client.getSyncState()}`);
      return this.client;
    }

    if (this.isInitializing) {
      console.log(`Đang khởi tạo client cho ${userId}, chờ hoàn tất...`);
      await this.syncPromise;
      if (this.client) return this.client;
      throw new Error("Khởi tạo client thất bại.");
    }

    this.isInitializing = true;
    this.syncPromise = new Promise((resolve, reject) => {
      try {
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
        });

        this.client.on(ClientEvent.Sync, (state: SyncState, prevState: SyncState | null) => {
          console.log(`Trạng thái sync cho ${userId} (deviceId: ${deviceId}): ${state} (trước đó: ${prevState})`);
          if (state === "PREPARED" || state === "SYNCING") {
            console.log(`✅ MatrixClient đã đồng bộ xong cho ${userId}!`);
            resolve();
          } else if (state === "ERROR") {
            console.error(`❌ Lỗi đồng bộ hóa cho ${userId}!`);
            reject(new Error("Lỗi đồng bộ hóa client."));
          }
        });

        this.client.startClient({ initialSyncLimit: 10 }).catch(error => {
          console.error(`Lỗi khi khởi động client cho ${userId}:`, error);
          reject(error);
        });
      } catch (error) {
        console.error(`Lỗi khi khởi tạo client cho ${userId}:`, error);
        reject(error);
      }
    });

    try {
      await this.syncPromise;
      this.isInitializing = false;
      this.syncPromise = null;
      if (!this.client) throw new Error("Client không được khởi tạo.");
      return this.client;
    } catch (error) {
      this.isInitializing = false;
      this.syncPromise = null;
      this.client = null;
      throw error;
    }
  }

  /**
   * Gets the current Matrix client.
   * @returns The Matrix client or null if not initialized.
   */
  static getClient(): MatrixClient | null {
    return this.client;
  }

  /**
   * Resets the Matrix client.
   */
  static reset(): void {
    if (this.client) {
      this.client.stopClient();
      this.client = null;
    }
    this.isInitializing = false;
    this.syncPromise = null;
  }

  /**
   * Generates a unique device ID for the user.
   * @param userId The user ID.
   * @returns A unique device ID.
   */
  private static generateDeviceId(userId: string): string {
    return `${userId.split(':')[0]}-${Math.random().toString(36).substring(2, 15)}`;
  }
}