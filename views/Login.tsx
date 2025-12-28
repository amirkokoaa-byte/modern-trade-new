
import React, { useState } from 'react';
import { User } from '../types';
import { db, ref, onValue } from '../firebase';
import { ShieldAlert, AlertCircle } from 'lucide-react';

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

    // Admin default login (Master Override)
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

    try {
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
          setError('قاعدة البيانات فارغة أو غير متصلة. يرجى مراجعة إعدادات Firebase.');
          setLoading(false);
        }
      }, { onlyOnce: true });
    } catch (err) {
      setError('خطأ في الاتصال بالسيرفر. تأكد من إعدادات Vercel.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF0F3] flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl w-full max-w-lg border border-rose-100 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-[5rem] -mr-8 -mt-8 z-0"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-rose-50 rounded-tr-[4rem] -ml-6 -mb-6 z-0"></div>

        <div className="relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-rose-800 text-white rounded-3xl shadow-xl mb-6 transform rotate-3">
              <span className="text-3xl font-black">SR</span>
            </div>
            <h1 className="text-4xl font-black text-rose-900 mb-2 tracking-tighter">SOFT ROSE</h1>
            <p className="text-rose-400 font-medium uppercase text-xs tracking-[0.2em]">Modern Trade Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold mb-2 text-rose-900/40 uppercase tracking-widest mr-1">اسم المستخدم</label>
              <input 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-200 rounded-2xl p-4 outline-none transition-all text-rose-900 font-bold"
                placeholder="ادخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-2 text-rose-900/40 uppercase tracking-widest mr-1">كلمة المرور</label>
              <input 
                type="password"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-200 rounded-2xl p-4 outline-none transition-all text-rose-900 font-bold"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 animate-shake">
                <ShieldAlert size={20} className="shrink-0" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-rose-800 text-white font-black py-5 rounded-2xl hover:bg-rose-900 transition-all shadow-xl shadow-rose-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>جاري التحقق...</span>
                </>
              ) : 'دخول النظام'}
            </button>
          </form>
          
          <div className="mt-12 text-center">
            <div className="flex items-center justify-center gap-2 text-rose-900/20 text-[10px] font-bold uppercase tracking-widest">
              <span>Secure Access</span>
              <div className="w-1 h-1 bg-rose-100 rounded-full"></div>
              <span>v2.5.0 Production</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Helper */}
      {!loading && error.includes('إعدادات') && (
        <div className="fixed bottom-6 right-6 left-6 md:right-auto md:left-auto md:max-w-sm bg-yellow-50 border-2 border-yellow-200 p-4 rounded-2xl shadow-lg flex items-start gap-3">
          <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-800 font-bold">
            <p className="mb-1">مساعدة للمسؤول:</p>
            <p className="font-normal opacity-80">تأكد من إضافة متغيرات البيئة في Vercel وتفعيل Realtime Database في Firebase Console.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
