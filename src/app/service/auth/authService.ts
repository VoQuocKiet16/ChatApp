// authService.ts
import { MatrixClient, createClient } from "matrix-js-sdk";
import { MATRIX_CONFIG } from "@/app/service/utils/config";
import { MatrixClientManager } from "@/app/service/matrix/matrixClient";

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

  async login(username: string, password: string): Promise<void> {
    try {
      const client = createClient({ baseUrl: MATRIX_CONFIG.BASE_URL });
      const response = await client.loginWithPassword(username, password);

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", response.access_token);
        localStorage.setItem("userId", response.user_id);
      }

      MatrixClientManager.initialize(response.access_token, response.user_id);
      console.log("✅ Đăng nhập thành công:", response);
    } catch (error) {
      console.error("❌ Lỗi khi đăng nhập:", error);
      throw new Error("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  }

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
      // Nếu client chưa được khởi tạo, khởi tạo lại từ accessToken và userId
      if (!MatrixClientManager.getClient()) {
        MatrixClientManager.initialize(accessToken, userId);
      }

      const initializedClient = MatrixClientManager.getClient();
      if (!initializedClient) {
        throw new Error("Không thể khởi tạo Matrix client.");
      }
      // Kiểm tra token bằng cách gọi một API đơn giản
      await initializedClient.getProfileInfo(userId);
      console.log("MatrixClient đã được khởi tạo:", initializedClient.getUserId(), initializedClient.getSyncState());
      return initializedClient;
    } catch (error) {
      console.error("Token không hợp lệ, yêu cầu đăng nhập lại:", error);
      this.logout(); // Xóa phiên nếu token không hợp lệ
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }

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