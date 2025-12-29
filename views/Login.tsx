
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

    if (username === 'admin' && password === 'admin') {
      onLogin({
        id: 'admin-id',
        username: 'admin',
        employeeName: 'مدير النظام',
        role: 'admin',
        employeeCode: '001',
        phone: '',
        isOnline: true,
        permissions: {
          registerSales: true,
          viewSalesHistory: true,
          registerInventory: true,
          viewInventoryHistory: true,
          registerCompetitorPrices: true,
          viewCompetitorReports: true,
          viewVacationMgmt: true,
          viewSettings: true,
          viewColleaguesSales: true
        },
        vacationBalance: { annual: 30, casual: 7, sick: 15, exams: 0 }
      });
      return;
    }

    try {
      const usersRef = ref(db, 'users');
      onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val();
        if (usersData) {
          const entries = Object.entries(usersData);
          const foundEntry = entries.find(([id, u]: any) => u.username === username && u.password === password);
          
          if (foundEntry) {
            const [id, data]: [string, any] = foundEntry;
            const userWithId = { ...data, id: data.id || id };
            onLogin(userWithId as User);
          } else {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة');
            setLoading(false);
          }
        } else {
          setError('قاعدة البيانات فارغة أو غير متصلة.');
          setLoading(false);
        }
      }, { onlyOnce: true });
    } catch (err) {
      setError('خطأ في الاتصال بالسيرفر.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF0F3] flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl w-full max-w-lg border border-rose-100 relative overflow-hidden">
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
              <input className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-200 rounded-2xl p-4 outline-none transition-all text-rose-900 font-bold" placeholder="ادخل اسم المستخدم" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-bold mb-2 text-rose-900/40 uppercase tracking-widest mr-1">كلمة المرور</label>
              <input type="password" className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-200 rounded-2xl p-4 outline-none transition-all text-rose-900 font-bold" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="flex items-center gap-3 bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100"><ShieldAlert size={20}/><p className="text-sm font-bold">{error}</p></div>}
            <button type="submit" disabled={loading} className="w-full bg-rose-800 text-white font-black py-5 rounded-2xl hover:bg-rose-900 shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">
              {loading ? <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : 'دخول النظام'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
