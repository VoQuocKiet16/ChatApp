// profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/app/service/auth/authService';
import { MatrixClient } from 'matrix-js-sdk';
import Footer from '@/app/components/common/Footer'; 

const ProfilePage = () => {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{ displayName: string; userId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const client: MatrixClient = await authService.getAuthenticatedClient();
        const userId = client.getUserId();
        if (!userId) {
          throw new Error("Không thể lấy user ID.");
        }

        // Lấy thông tin người dùng từ Matrix
        const profile = await client.getProfileInfo(userId);
        setUserInfo({
          displayName: profile.displayname || userId,
          userId: userId,
        });
      } catch (err) {
        console.error("Lỗi khi tải thông tin người dùng:", err);
        setError("Không thể tải thông tin người dùng. Vui lòng thử lại.");
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, [router]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      alert("Đăng xuất thành công!");
      router.push("/auth/login");
    } catch (err) {
      console.error("Lỗi khi đăng xuất:", err);
      setError("Đăng xuất thất bại. Vui lòng thử lại!");
    }
  };

  if (loading) return <p className="text-center text-gray-500">Đang tải...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Hồ sơ người dùng</h2>
            <p className="mt-2 text-sm text-gray-600">Thông tin cá nhân của bạn</p>
          </div>

          {/* User Info */}
          {userInfo && (
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                  {userInfo.displayName.charAt(0).toUpperCase()}
                </div>
                <h3 className="mt-4 text-xl font-semibold">{userInfo.displayName}</h3>
                <p className="text-sm text-gray-600">{userInfo.userId}</p>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-200"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProfilePage;