
import React, { useState } from 'react';
import { User } from '../types';
import { db, ref, onValue } from '../firebase';
// Added Loader2 to the lucide-react imports
import { ShieldAlert, User as UserIcon, Lock, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

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
        permissions: { registerSales: true, viewSalesHistory: true, registerInventory: true, viewInventoryHistory: true, registerCompetitorPrices: true, viewCompetitorReports: true, viewVacationMgmt: true, viewSettings: true, viewColleaguesSales: true },
        vacationBalance: { annual: 30, casual: 7, sick: 15, exams: 0 }
      });
      return;
    }

    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (usersData) {
        const foundEntry = Object.entries(usersData).find(([id, u]: any) => u.username === username && u.password === password);
        if (foundEntry) {
          const [id, data]: [string, any] = foundEntry;
          onLogin({ ...data, id: data.id || id });
        } else {
          setError('خطأ في بيانات الدخول');
          setLoading(false);
        }
      } else {
        setError('لا يوجد مستخدمين مسجلين');
        setLoading(false);
      }
    }, { onlyOnce: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent" dir="rtl">
      <div className="glass-card-dark w-full max-w-md rounded-[3rem] p-10 relative overflow-hidden group">
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-rose-900 to-rose-600 rounded-3xl shadow-2xl mb-8">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">SOFT ROSE</h1>
          <p className="text-rose-400 font-bold uppercase text-[9px] tracking-[0.3em] mb-12">Portal Access</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-4">
                <UserIcon className="text-rose-400" size={18} />
                <input className="w-full bg-transparent p-4 outline-none font-bold text-white text-right" placeholder="اسم المستخدم" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
            </div>
            <div className="relative">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-4">
                <Lock className="text-rose-400" size={18} />
                <input type="password" className="w-full bg-transparent p-4 outline-none font-bold text-white text-right" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 text-red-400 p-4 rounded-2xl border border-red-500/20 text-right">
                <ShieldAlert size={18}/>
                <p className="text-[11px] font-black">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-rose-700 hover:bg-rose-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95">
              {loading ? <Loader2 className="animate-spin" size={20}/> : (
                <><span>تسجيل دخول</span><ArrowLeft size={18}/></>
              )}
            </button>
          </form>

          <div className="mt-14 text-center">
             <p className="text-[11px] font-black text-rose-500/80">مع تحيات المطور Amir Lamay</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
