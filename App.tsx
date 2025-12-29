
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, ShoppingCart, History, Package, ClipboardList, 
  TrendingUp, BarChart, Settings as SettingsIcon, 
  LogOut, Menu, X, Bell, MessageCircle, Calendar,
  Loader2, Wifi, WifiOff, Palette, Copy, Trash2, User as UserIcon
} from 'lucide-react';
import { db, ref, onValue, set, update, push, remove } from './firebase';
import { User, AppSettings, Notification, AppTheme, Market, Company } from './types';

// View Components
import DailySales from './views/DailySales';
import SalesHistory from './views/SalesHistory';
import InventoryRegistration from './views/InventoryRegistration';
import InventoryHistory from './views/InventoryHistory';
import CompetitorPrices from './views/CompetitorPrices';
import CompetitorReports from './views/CompetitorReports';
import VacationManagement from './views/VacationManagement';
import Settings from './views/Settings';
import Login from './views/Login';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('daily-sales');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<AppTheme>('standard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    
    // Sync settings
    onValue(ref(db, 'settings'), (snapshot) => {
      const data = snapshot.val();
      if (data) setSettings(data);
    });

    // Sync users
    onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      if (data) setUsers(Object.values(data));
    });

    setIsLoading(false);
  }, []);

  // Sync markets & companies with privacy filter
  useEffect(() => {
    if (user) {
      onValue(ref(db, 'markets'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
          const filtered = list.filter(m => user.role === 'admin' || m.creatorId === user.id || !m.creatorId);
          setMarkets(filtered);
        }
      });
      onValue(ref(db, 'companies'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
          const filtered = list.filter(c => user.role === 'admin' || c.creatorId === user.id || !c.creatorId);
          setCompanies(filtered);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const notifRef = ref(db, 'notifications');
      onValue(notifRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const allNotifs = Object.entries(data).map(([id, val]: any) => ({ ...val, id }));
          const myNotifs = allNotifs.filter(n => n.receiverId === 'all' || n.receiverId === user.id);
          setNotifications(myNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else {
          setNotifications([]);
        }
      });
    }
  }, [user]);

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    update(ref(db, `users/${loggedUser.id}`), { isOnline: true });
  };

  const handleLogout = () => {
    if (user && user.id !== 'admin-id') {
      update(ref(db, `users/${user.id}`), { isOnline: false });
    }
    setUser(null);
  };

  const deleteNotification = (id: string) => {
    remove(ref(db, `notifications/${id}`));
  };

  const cycleTheme = () => {
    if (theme === 'standard') setTheme('glass');
    else if (theme === 'glass') setTheme('dark');
    else setTheme('standard');
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-rose-50">
      <Loader2 className="animate-spin text-rose-600 mb-4" size={48}/>
      <p className="text-rose-900 font-bold animate-pulse">جاري تحميل نظام Soft Rose...</p>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} />;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const sidebarItems = [
    { id: 'daily-sales', label: 'المبيعات اليومية', icon: <ShoppingCart size={20}/>, visible: true },
    { id: 'sales-history', label: 'سجل المبيعات', icon: <History size={20}/>, visible: user.role === 'admin' || user.permissions?.viewSalesHistory },
    { id: 'inventory-reg', label: 'تسجيل المخزون', icon: <Package size={20}/>, visible: user.role === 'admin' || user.permissions?.registerInventory },
    { id: 'inventory-history', label: 'سجل المخزون', icon: <ClipboardList size={20}/>, visible: user.role === 'admin' || user.permissions?.viewInventoryHistory },
    { id: 'competitor-prices', label: 'أسعار المنافسين', icon: <TrendingUp size={20}/>, visible: user.role === 'admin' || user.permissions?.viewCompetitorPrices },
    { id: 'competitor-reports', label: 'تقارير المنافسين', icon: <BarChart size={20}/>, visible: user.role === 'admin' || user.permissions?.viewCompetitorReports },
    { id: 'vacation-mgmt', label: 'رصيد الاجازات', icon: <Calendar size={20}/>, visible: true },
    { id: 'settings', label: 'إعدادات النظام', icon: <SettingsIcon size={20}/>, visible: user.role === 'admin' },
  ].filter(i => i.visible);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'coordinator': return 'منسق';
      case 'usher': return 'أشر';
      default: return 'موظف';
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden theme-${theme} transition-all duration-300 relative`}>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`bg-rose-900 text-white w-72 flex-shrink-0 transition-all duration-300 z-50 fixed md:relative inset-y-0 ${isSidebarOpen ? 'right-0' : '-right-72 md:right-0'} ${theme === 'glass' ? 'bg-rose-900/70 backdrop-blur-xl border-l border-white/10' : ''} shadow-2xl`}>
        <div className="p-6 flex flex-col h-full">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black tracking-widest text-rose-300">SOFT ROSE</span>
              <h1 className="text-xl font-black tracking-tighter">Modern Trade</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
          </div>
          
          <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-2">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${activeTab === item.id ? 'bg-white text-rose-900 font-bold shadow-xl shadow-black/10' : 'hover:bg-white/10 opacity-80 hover:opacity-100'}`}
              >
                <span className={activeTab === item.id ? 'text-rose-600' : 'text-white'}>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </button>
            ))}

            {user.role === 'admin' && (
              <div className="mt-10 pt-6 border-t border-white/10">
                <p className="text-[10px] uppercase text-rose-400 px-5 mb-4 font-black tracking-widest">الموظفون المتصلون</p>
                <div className="space-y-3">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-5">
                      <div className="relative">
                        <div className={`w-2.5 h-2.5 rounded-full ${u.isOnline ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-rose-800'}`}></div>
                      </div>
                      <span className={`text-xs font-bold ${u.isOnline ? 'text-white' : 'text-rose-400/60'}`}>{u.employeeName} ({getRoleLabel(u.role)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </nav>
          <div className="mt-4 text-[10px] text-center text-rose-400/40 uppercase font-bold tracking-widest">
            System v3.0.0 Stable
          </div>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#F9FAFB]'}`}>
        {/* Ticker at the VERY top */}
        {settings?.tickerText && (
          <div className="bg-rose-950 py-2 text-white text-[13px] overflow-hidden border-b border-rose-900/50 shadow-inner z-50">
            <div className="ticker-container">
              <div className="ticker-text font-bold opacity-90" style={{ animationDuration: '45s' }}>
                {settings.tickerText} &nbsp;&nbsp; ★ &nbsp;&nbsp; {settings.tickerText} &nbsp;&nbsp; ★ &nbsp;&nbsp; {settings.tickerText}
              </div>
            </div>
          </div>
        )}

        <header className={`h-20 flex items-center justify-between px-8 border-b transition-all duration-300 z-30 ${theme === 'glass' ? 'bg-white/40 backdrop-blur-md border-white/20 shadow-sm' : 'bg-white shadow-sm'} ${theme === 'dark' ? 'bg-[#121212] border-[#222]' : ''}`}>
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-3 hover:bg-rose-50 rounded-2xl transition-all">
              <Menu size={24} className="text-rose-800" />
            </button>
            <div className="flex flex-col">
              <h2 className="font-black text-rose-900 text-lg md:text-2xl tracking-tighter uppercase leading-tight">
                {settings?.programName || 'Soft Rose Modern Trade'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  {user.employeeName} <span className="opacity-30">|</span> {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100/50 p-1 rounded-2xl gap-1 mr-4 hidden sm:flex">
              <div className={`p-2 rounded-xl ${isOnline ? 'text-blue-600' : 'text-red-500'}`} title={isOnline ? 'متصل' : 'أنت غير متصل'}>
                {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
              </div>
              <button onClick={cycleTheme} className="p-2.5 hover:bg-white hover:shadow-md rounded-xl text-gray-500 transition-all group">
                <Palette size={20} className="group-hover:rotate-12 transition-transform" />
              </button>
            </div>

            <button onClick={() => setIsNotificationOpen(true)} className="relative p-3 hover:bg-rose-50 rounded-2xl group transition-all">
              <Bell size={24} className="text-gray-500 group-hover:text-rose-600" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 bg-red-600 border-2 border-white rounded-full animate-pulse shadow-sm"></span>
              )}
            </button>

            <button onClick={handleLogout} className="flex items-center gap-2 p-3 bg-rose-50 text-rose-800 rounded-2xl hover:bg-rose-100 hover:text-rose-900 transition-all font-bold text-sm border border-rose-100">
              <LogOut size={20} />
              <span className="hidden lg:inline">خروج</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activeTab === 'daily-sales' && <DailySales user={user} markets={markets.map(m => m.name)} />}
            {activeTab === 'sales-history' && <SalesHistory user={user} markets={markets.map(m => m.name)} users={users} />}
            {activeTab === 'inventory-reg' && <InventoryRegistration user={user} markets={markets.map(m => m.name)} />}
            {activeTab === 'inventory-history' && <InventoryHistory user={user} markets={markets.map(m => m.name)} users={users} />}
            {activeTab === 'competitor-prices' && <CompetitorPrices user={user} markets={markets.map(m => m.name)} />}
            {activeTab === 'competitor-reports' && <CompetitorReports user={user} markets={markets.map(m => m.name)} />}
            {activeTab === 'vacation-mgmt' && <VacationManagement user={user} users={users} />}
            {activeTab === 'settings' && <Settings user={user} settings={settings} users={users} markets={markets} companies={companies} />}
          </div>
        </div>
      </main>

      {isNotificationOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setIsNotificationOpen(false)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-900 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight">صندوق الرسائل</h3>
                <p className="text-rose-300 text-xs font-bold uppercase mt-1">Admin Communication Center</p>
              </div>
              <button onClick={() => setIsNotificationOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={28}/>
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/50">
              {notifications.length === 0 ? (
                <div className="text-center py-20"><Bell className="mx-auto text-gray-200 mb-4" size={60} /><p className="text-gray-400 font-bold">لا توجد رسائل جديدة</p></div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-6 bg-white rounded-3xl border border-rose-100 shadow-sm relative group hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600"><UserIcon size={20} /></div>
                      <div className="flex-1">
                        <p className="text-[15px] font-bold text-gray-800 leading-relaxed mb-4">{n.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-rose-300 font-black uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">{new Date(n.timestamp).toLocaleString('ar-EG')}</span>
                          <div className="flex gap-2">
                            <button onClick={() => deleteNotification(n.id)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
