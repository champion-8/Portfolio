'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

export default function SignInPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/signin';
      const body = isSignUp
        ? {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
          }
        : {
            email: formData.email,
            password: formData.password,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(data.message);
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 500);
      } else {
        setMessage(data.error || 'An error occurred');
      }
    } catch (error) {
      setMessage('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    if(e.target.name === 'email') 
        setFormData((prev) => ({
      ...prev,
      username: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 sm:p-10 animate-scale-in border border-purple-300">
        <div className="text-center mb-8 animate-slide-down">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon icon="solar:chart-bold-duotone" className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {isSignUp ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}
          </h1>
          <p className="text-gray-500 text-sm">Thai Investment Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
          {/* {isSignUp && (
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Icon icon="solar:user-bold-duotone" className="w-4 h-4 text-purple-600" />
                ชื่อผู้ใช้
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all bg-white"
                placeholder="username"
              />
            </div>
          )} */}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Icon icon="solar:letter-bold-duotone" className="w-4 h-4 text-purple-600" />
              อีเมล
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all bg-white"
              placeholder="email@example.com"
            />
          </div>

          {isSignUp && (
            <div className="animate-slide-up">
              <label htmlFor="fullName" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Icon icon="solar:user-id-bold-duotone" className="w-4 h-4 text-purple-600" />
                ชื่อ-นามสกุล (ไม่บังคับ)
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all bg-white"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Icon icon="solar:lock-password-bold-duotone" className="w-4 h-4 text-purple-600" />
              รหัสผ่าน
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Icon icon="solar:hourglass-bold-duotone" className="w-5 h-5 animate-spin" />
                กำลังดำเนินการ...
              </>
            ) : (
              <>
                <Icon icon={isSignUp ? 'solar:user-plus-bold-duotone' : 'solar:login-3-bold-duotone'} className="w-5 h-5" />
                {isSignUp ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}
              </>
            )}
          </button>
        </form>

        {message && (
          <div
            className={`mt-6 p-4 rounded-xl text-sm animate-slide-up flex items-center gap-2 border ${
              message.includes('success') || message.includes('สำเร็จ')
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <Icon 
              icon={message.includes('success') || message.includes('สำเร็จ') ? 'solar:check-circle-bold-duotone' : 'solar:danger-circle-bold-duotone'} 
              className="w-5 h-5 flex-shrink-0" 
            />
            <span>{message}</span>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
              setFormData({ username: '', email: '', password: '', fullName: '' });
            }}
            className="text-purple-600 hover:text-purple-700 text-sm font-semibold transition-colors flex items-center gap-2 mx-auto cursor-pointer"
          >
            <Icon icon="solar:round-transfer-diagonal-bold-duotone" className="w-4 h-4" />
            {isSignUp ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สร้างบัญชี'}
          </button>
        </div>
      </div>
    </div>
  );
}
