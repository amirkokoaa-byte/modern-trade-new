
import React, { useState } from 'react';
import { User } from '../types';
import { db, ref, onValue } from '../firebase';
import { ShieldAlert, User as UserIcon, Lock, Sparkles, ChevronLeft, ArrowLeft } from 'lucide-react';

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
            setError('خطأ في بيانات الدخول');
            setLoading(false);
          }
        } else {
          setError('السيرفر غير مستجيب');
          setLoading(false);
        }
      }, { onlyOnce: true });
    } catch (err) {
      setError('خطأ في الاتصال');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-login w-full max-w-md rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group">
        
        {/* Decorative Inner Glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all duration-700"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700"></div>

        <div className="relative z-10">
          {/* Logo Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-rose-900 to-rose-600 rounded-3xl shadow-2xl mb-6 transform hover:scale-110 transition-transform duration-500">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">SOFT ROSE</h1>
            <div className="flex items-center justify-center gap-2">
              <div className="h-[1px] w-8 bg-rose-500/30"></div>
              <p className="text-rose-400 font-bold uppercase text-[9px] tracking-[0.3em]">Modern Trade Portal</p>
              <div className="h-[1px] w-8 bg-rose-500/30"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div className="input-glow-wrapper">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 group-focus-within:bg-white/10 transition-all">
                <UserIcon className="text-rose-400 group-focus-within:text-rose-300" size={18} />
                <input 
                  className="w-full bg-transparent p-4 outline-none font-bold text-white placeholder-white/20 text-sm" 
                  placeholder="اسم المستخدم" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="input-glow-wrapper">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 group-focus-within:bg-white/10 transition-all">
                <Lock className="text-rose-400 group-focus-within:text-rose-300" size={18} />
                <input 
                  type="password" 
                  className="w-full bg-transparent p-4 outline-none font-bold text-white placeholder-white/20 text-sm" 
                  placeholder="كلمة المرور" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 text-red-400 p-4 rounded-2xl border border-red-500/20 backdrop-blur-md animate-in slide-in-from-top-2">
                <ShieldAlert size={18}/>
                <p className="text-[11px] font-black">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-rose-700 hover:bg-rose-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-rose-950/50 disabled:opacity-50 flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] group/btn"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="tracking-wide">الدخول الآمن</span>
                  <ArrowLeft size={18} className="group-hover/btn:-translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-12 text-center opacity-30">
             <p className="text-[9px] font-black text-white uppercase tracking-[0.4em]">Integrated Management System v2.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
