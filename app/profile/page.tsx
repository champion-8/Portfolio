'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  fullName: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState<'th' | 'en'>('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Translations
  const t = {
    title: language === 'th' ? 'โปรไฟล์' : 'Profile',
    subtitle: language === 'th' ? 'จัดการข้อมูลส่วนตัว' : 'Manage your personal information',
    dashboard: language === 'th' ? 'แดชบอร์ด' : 'Dashboard',
    logout: language === 'th' ? 'ออกจากระบบ' : 'Logout',
    userInfo: language === 'th' ? 'ข้อมูลผู้ใช้' : 'User Information',
    username: language === 'th' ? 'ชื่อผู้ใช้' : 'Username',
    email: language === 'th' ? 'อีเมล' : 'Email',
    role: language === 'th' ? 'บทบาท' : 'Role',
    fullName: language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name',
    createdAt: language === 'th' ? 'สร้างเมื่อ' : 'Created',
    admin: language === 'th' ? 'ผู้ดูแลระบบ' : 'Administrator',
    user: language === 'th' ? 'ผู้ใช้งาน' : 'User',
    editProfile: language === 'th' ? 'แก้ไขโปรไฟล์' : 'Edit Profile',
    save: language === 'th' ? 'บันทึก' : 'Save',
    changePassword: language === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password',
    currentPassword: language === 'th' ? 'รหัสผ่านปัจจุบัน' : 'Current Password',
    newPassword: language === 'th' ? 'รหัสผ่านใหม่' : 'New Password',
    confirmPassword: language === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Password',
    updateSuccess: language === 'th' ? 'อัปเดตโปรไฟล์สำเร็จ ✓' : 'Profile updated successfully ✓',
    passwordSuccess: language === 'th' ? 'เปลี่ยนรหัสผ่านสำเร็จ ✓' : 'Password changed successfully ✓',
    passwordMismatch: language === 'th' ? 'รหัสผ่านใหม่ไม่ตรงกัน' : 'Passwords do not match',
    connectionError: language === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์' : 'Cannot connect to server',
    error: language === 'th' ? 'เกิดข้อผิดพลาด' : 'An error occurred',
    loading: language === 'th' ? 'กำลังโหลด...' : 'Loading...',
  };

  // Profile update form
  const [profileForm, setProfileForm] = useState({
    email: '',
    fullName: '',
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setProfileForm({
          email: data.user.email,
          fullName: data.user.fullName || '',
        });
      } else {
        router.push('/signin');
      }
    } catch (error) {
      router.push('/signin');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(t.updateSuccess);
        setUser(data.user);
      } else {
        setMessage(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      setMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage(t.passwordMismatch);
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(t.passwordSuccess);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setMessage(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      setMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      router.push('/signin');
      router.refresh();
    } catch (error) {
      setMessage('ออกจากระบบไม่สำเร็จ');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          {/* Loading Spinner */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-purple-400 rounded-full animate-spin"></div>
          </div>
          
          {/* Loading Text */}
          <p className="text-gray-600 text-lg mb-4">{t.loading}</p>
          
          {/* Loading Dots */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-100">
      {/* Header - Matching Dashboard Style */}
      <header className="bg-purple-700 backdrop-blur-sm border-b border-purple-300 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-3">
          <div className="flex items-center justify-between relative">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center border border-purple-300">
                <Icon icon="solar:user-bold-duotone" className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-purple-50">
                  {t.title}
                </h1>
                <p className="text-xs text-purple-200">
                  {t.subtitle}
                </p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
                className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-1.5 font-medium cursor-pointer border border-purple-200 hover:border-purple-300"
              >
                <Icon icon="ic:baseline-language" className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'EN' : 'TH'}</span>
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-1.5 font-medium cursor-pointer border border-purple-200 hover:border-purple-300"
              >
                <Icon icon="solar:arrow-left-bold-duotone" className="w-3.5 h-3.5" />
                <span>{t.dashboard}</span>
              </button>
              <button
                onClick={handleSignOut}
                className="px-3 py-2 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-red-200 hover:border-red-300"
              >
                <Icon icon="solar:logout-2-bold-duotone" className="w-3.5 h-3.5" />
                <span>{t.logout}</span>
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden px-2 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all cursor-pointer border border-purple-200"
            >
              <Icon icon={mobileMenuOpen ? "solar:close-circle-bold" : "solar:hamburger-menu-bold"} className="w-5 h-5" />
            </button>

            {/* Floating Mobile Menu */}
            {mobileMenuOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="sm:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                  onClick={() => setMobileMenuOpen(false)}
                />
                
                {/* Floating Menu Card */}
                <div className="sm:hidden absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-purple-100 z-50 animate-scale-in">
                  <div className="p-3 space-y-2">
                    <button
                      onClick={() => { setLanguage(language === 'th' ? 'en' : 'th'); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-2 font-medium cursor-pointer border border-purple-200"
                    >
                      <Icon icon="ic:baseline-language" className="w-4 h-4" />
                      <span>{language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นไทย'}</span>
                    </button>
                    <button
                      onClick={() => { router.push('/dashboard'); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-2 font-medium cursor-pointer border border-purple-200"
                    >
                      <Icon icon="solar:arrow-left-bold-duotone" className="w-4 h-4" />
                      <span>{t.dashboard}</span>
                    </button>
                    <button
                      onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all flex items-center gap-2 cursor-pointer border border-red-200"
                    >
                      <Icon icon="solar:logout-2-bold-duotone" className="w-4 h-4" />
                      <span>{t.logout}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
              message.includes('✓') || message.includes('สำเร็จ')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <Icon 
              icon={message.includes('✓') || message.includes('สำเร็จ') ? 'solar:check-circle-bold-duotone' : 'solar:danger-circle-bold-duotone'} 
              className="w-4 h-4 flex-shrink-0" 
            />
            <span>{message}</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* User Info */}
          <div className="bg-white border border-purple-300 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon 
                  icon={user?.role === 'admin' ? 'solar:crown-bold-duotone' : 'solar:user-bold-duotone'} 
                  className="w-5 h-5 text-purple-400" 
                />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{t.userInfo}</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Icon icon="solar:letter-bold-duotone" className="w-3 h-3" />
                  {t.email}
                </span>
                <p className="font-medium text-gray-900 mt-1">{user?.email}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Icon icon="solar:shield-user-bold-duotone" className="w-3 h-3" />
                  {t.role}
                </span>
                <p className="font-medium mt-1">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 ${
                      user?.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <Icon 
                      icon={user?.role === 'admin' ? 'solar:crown-bold-duotone' : 'solar:user-bold-duotone'} 
                      className="w-3 h-3" 
                    />
                    {user?.role === 'admin' ? t.admin : t.user}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Icon icon="solar:user-speak-bold-duotone" className="w-3 h-3" />
                  {t.fullName}
                </span>
                <p className="font-medium text-gray-900 mt-1">{user?.fullName || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Icon icon="solar:calendar-bold-duotone" className="w-3 h-3" />
                  {t.createdAt}
                </span>
                <p className="font-medium text-gray-900 mt-1">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Update Profile */}
          <div className="bg-white border border-pink-300 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <Icon icon="solar:pen-bold-duotone" className="w-5 h-5 text-pink-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{t.editProfile}</h2>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.email}
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent bg-white transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.fullName}
                </label>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-pink-400 hover:bg-pink-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon icon="solar:diskette-bold-duotone" className="w-4 h-4" />
                {t.save}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white border border-blue-300 rounded-xl p-5 md:col-span-2 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon icon="solar:lock-password-bold-duotone" className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{t.changePassword}</h2>
            </div>
            
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.currentPassword}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.newPassword}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white transition-all"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.confirmPassword}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white transition-all"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-400 hover:bg-blue-500 text-white font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Icon icon="solar:key-bold-duotone" className="w-4 h-4" />
                {t.changePassword}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
