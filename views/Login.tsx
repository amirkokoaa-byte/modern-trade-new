
import React, { useState } from 'react';
import { User } from '../types';
import { db, ref, onValue } from '../firebase';

interface Props {
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Admin default login
    if (username === 'admin' && password === 'admin') {
      onLogin({
        id: 'admin-id',
        username: 'admin',
        employeeName: 'مدير النظام',
        role: 'admin',
        employeeCode: '001',
        phone: '',
        isOnline: true,
        canSeeAllSales: true,
        vacationBalance: { annual: 30, casual: 7, sick: 15, exams: 0 }
      });
      return;
    }

    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
      const users = snapshot.val();
      if (users) {
        const found = Object.values(users).find((u: any) => u.username === username && u.password === password) as User;
        if (found) {
          onLogin(found);
        } else {
          setError('اسم المستخدم أو كلمة المرور غير صحيحة');
          setLoading(false);
        }
      } else {
        setError('لا يوجد مستخدمين مسجلين');
        setLoading(false);
      }
    }, { onlyOnce: true });
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-rose-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-rose-700 mb-2">Soft Rose</h1>
          <p className="text-gray-500">Modern Trade Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">اسم المستخدم</label>
            <input 
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-rose-500 outline-none transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">كلمة المرور</label>
            <input 
              type="password"
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-rose-500 outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition shadow-lg shadow-rose-200 disabled:opacity-50"
          >
            {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t text-center text-xs text-gray-400">
          © 2025 Soft Rose. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
