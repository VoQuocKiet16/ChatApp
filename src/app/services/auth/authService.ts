import { MatrixClient } from "matrix-js-sdk";
import { MATRIX_CONFIG } from "@/app/services/utils/config";
import { MatrixClientManager } from "@/app/services/matrix/matrixClient";

// Singleton class để quản lý phiên đăng nhập
class AuthService {
  private static instance: AuthService | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Logs in a user with username and password.
   * @param username The Matrix username.
   * @param password The password.
   */
  async login(username: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${MATRIX_CONFIG.BASE_URL}/_matrix/client/r0/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'm.login.password',
          identifier: { type: 'm.id.user', user: username },
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập.');
      }

      const { access_token, user_id } = await response.json();

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", access_token);
        localStorage.setItem("userId", user_id);
      }

      await MatrixClientManager.initialize(access_token, user_id);
      console.log("✅ Đăng nhập thành công:", user_id);
    } catch (error) {
      console.error("❌ Lỗi khi đăng nhập:", error);
      throw new Error("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  }

  /**
   * Gets the authenticated Matrix client.
   * @returns The Matrix client instance.
   * @throws Error if user is not logged in or client initialization fails.
   */
  async getAuthenticatedClient(): Promise<MatrixClient> {
    if (typeof window === "undefined") {
      throw new Error("Matrix client chỉ hoạt động trên client-side.");
    }

    const accessToken = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");

    if (!accessToken || !userId) {
      throw new Error("Bạn chưa đăng nhập vào Matrix. Vui lòng đăng nhập trước.");
    }

    try {
      const client = await MatrixClientManager.initialize(accessToken, userId);
      console.log("MatrixClient đã được khởi tạo:", client.getUserId(), client.getSyncState());
      return client;
    } catch (error) {
      console.error("Lỗi khi khởi tạo client:", error);
      this.logout();
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }

  /**
   * Logs out the user and clears the session.
   */
  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userId");
      const userId = MatrixClientManager.getClient()?.getUserId();
      if (userId) {
        sessionStorage.removeItem(`deviceId_${userId}`);
      }
    }
    MatrixClientManager.reset();
    console.log("✅ Đã đăng xuất thành công.");
  }
}

const authService = AuthService.getInstance();
export default authService;