
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, ShoppingCart, History, Package, ClipboardList, 
  TrendingUp, BarChart, Settings as SettingsIcon, 
  LogOut, Menu, X, Bell, MessageCircle, Calendar,
  Loader2, Wifi, WifiOff, Palette, Copy, Trash2, User as UserIcon, Trophy
} from 'lucide-react';
import { db, ref, onValue, set, update, push, remove } from './firebase';
import { User, AppSettings, Notification, AppTheme, Market, Company, DailySale } from './types';

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
  const [sales, setSales] = useState<DailySale[]>([]);
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
    
    onValue(ref(db, 'settings'), (snapshot) => {
      const data = snapshot.val();
      if (data) setSettings(data);
    });

    onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      if (data) setUsers(Object.values(data));
    });

    onValue(ref(db, 'sales'), (snapshot) => {
      const data = snapshot.val();
      if (data) setSales(Object.values(data));
      else setSales([]);
    });

    setIsLoading(false);
  }, []);

  // Star of the Month Calculation (Day 1 to End of Month)
  const starOfMonthInfo = useMemo(() => {
    const now = new Date();
    const currentMonthSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const userTotals: Record<string, {name: string, total: number}> = {};
    currentMonthSales.forEach(s => {
      if (!userTotals[s.userId]) userTotals[s.userId] = { name: s.userName, total: 0 };
      userTotals[s.userId].total += (s.total || 0);
    });

    const sorted = Object.values(userTotals).sort((a, b) => b.total - a.total);
    return sorted[0] || null;
  }, [sales]);

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
    // Inject safety defaults for permissions and balance to prevent white screen crashes
    const safeUser = {
      ...loggedUser,
      permissions: loggedUser.permissions || {
        registerSales: true,
        viewSalesHistory: true,
        registerInventory: true,
        viewInventoryHistory: true,
        registerCompetitorPrices: true,
        viewCompetitorReports: true,
        viewVacationMgmt: true,
        viewSettings: false,
        viewColleaguesSales: false
      },
      vacationBalance: loggedUser.vacationBalance || { annual: 14, casual: 7, sick: 0, exams: 0, absent_with_permission: 0, absent_without_permission: 0 }
    };
    setUser(safeUser);
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

  const openWhatsApp = () => {
    if (settings?.whatsappNumber) {
      window.open(`https://wa.me/${settings.whatsappNumber}`, '_blank');
    } else {
      alert("رقم الواتساب غير مسجل في الإعدادات");
    }
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-rose-50">
      <Loader2 className="animate-spin text-rose-600 mb-4" size={48}/>
      <p className="text-rose-900 font-bold animate-pulse">جاري تحميل نظام Soft Rose...</p>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} />;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Safe permission checking
  const up = user.permissions || {};
  const sidebarItems = [
    { id: 'daily-sales', label: 'المبيعات اليومية', icon: <ShoppingCart size={20}/>, visible: user.role === 'admin' || up.registerSales },
    { id: 'sales-history', label: 'سجل المبيعات', icon: <History size={20}/>, visible: user.role === 'admin' || up.viewSalesHistory },
    { id: 'inventory-reg', label: 'تسجيل المخزون', icon: <Package size={20}/>, visible: user.role === 'admin' || up.registerInventory },
    { id: 'inventory-history', label: 'سجل المخزون', icon: <ClipboardList size={20}/>, visible: user.role === 'admin' || up.viewInventoryHistory },
    { id: 'competitor-prices', label: 'أسعار المنافسين', icon: <TrendingUp size={20}/>, visible: user.role === 'admin' || up.registerCompetitorPrices },
    { id: 'competitor-reports', label: 'تقارير المنافسين', icon: <BarChart size={20}/>, visible: user.role === 'admin' || up.viewCompetitorReports },
    { id: 'vacation-mgmt', label: 'رصيد الاجازات', icon: <Calendar size={20}/>, visible: user.role === 'admin' || up.viewVacationMgmt },
    { id: 'settings', label: 'إعدادات النظام', icon: <SettingsIcon size={20}/>, visible: user.role === 'admin' || up.viewSettings },
  ].filter(i => i.visible);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'coordinator': return 'منسق';
      case 'usher': return 'أشر';
      default: return 'موظف';
    }
  };

  const constructedTickerText = useMemo(() => {
    let text = settings?.tickerText || '';
    if (settings?.showTopSalesInTicker && starOfMonthInfo) {
      const topSalesMsg = `🏆 نجم الشهر الحالي: ${starOfMonthInfo.name} بمبيعات إجمالية ${starOfMonthInfo.total.toLocaleString()} ج.م 🏆`;
      text = topSalesMsg + (text ? ` | ${text}` : '');
    }
    return text;
  }, [settings, starOfMonthInfo]);

  return (
    <div className={`flex h-screen overflow-hidden theme-${theme} transition-all duration-300 relative`}>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Section */}
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
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 ${activeTab === item.id ? 'bg-white text-rose-900 font-bold shadow-xl shadow-black/10' : 'hover:bg-white/10 opacity-80 hover:opacity-100'}`}
              >
                <span className={activeTab === item.id ? 'text-rose-600' : 'text-white'}>{item.icon}</span>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}

            {user.role === 'admin' && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-[10px] uppercase text-rose-400 px-5 mb-4 font-black tracking-widest">الموظفون المتصلون</p>
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-5 py-1">
                      <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-rose-800'}`}></div>
                      </div>
                      <span className={`text-[11px] font-bold ${u.isOnline ? 'text-white' : 'text-rose-400/60'}`}>{u.employeeName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#F9FAFB]'}`}>
        
        {/* Ticker Section */}
        {constructedTickerText && (
          <div className="bg-rose-950 py-2 text-white text-[11px] md:text-[13px] overflow-hidden border-b border-rose-900/50 shadow-inner z-50">
            <div className="ticker-container">
              <div className="ticker-text font-bold opacity-90" style={{ animationDuration: '45s' }}>
                {constructedTickerText} &nbsp;&nbsp; ★ &nbsp;&nbsp; {constructedTickerText}
              </div>
            </div>
          </div>
        )}

        {/* Improved Header Section */}
        <header className={`h-16 md:h-20 flex items-center justify-between px-3 md:px-8 border-b transition-all duration-300 z-30 ${theme === 'glass' ? 'bg-white/40 backdrop-blur-md border-white/20 shadow-sm' : 'bg-white shadow-sm'} ${theme === 'dark' ? 'bg-[#121212] border-[#222]' : ''}`}>
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-rose-50 rounded-xl transition-all">
              <Menu size={20} className="text-rose-800" />
            </button>
            <div className="flex flex-col truncate">
              <h2 className="font-black text-rose-900 text-sm md:text-xl tracking-tighter uppercase leading-tight truncate">
                {settings?.programName || 'Soft Rose Modern Trade'}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                  {user.employeeName} • {getRoleLabel(user.role)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex items-center bg-slate-100/70 p-1 rounded-xl md:rounded-2xl gap-0.5 md:gap-1 shadow-inner">
              <button onClick={openWhatsApp} className="p-2 md:p-3 hover:bg-green-50 text-green-600 rounded-lg md:rounded-xl transition-all" title="واتساب">
                <MessageCircle size={18} />
              </button>

              <button onClick={cycleTheme} className="p-2 md:p-3 hover:bg-white hover:shadow-md rounded-lg md:rounded-xl text-amber-500 transition-all" title="الاستايل">
                <Palette size={18} />
              </button>

              <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${isOnline ? 'text-blue-600' : 'text-red-500'}`} title={isOnline ? 'متصل' : 'غير متصل'}>
                {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
              </div>

              <button onClick={() => setIsNotificationOpen(true)} className="relative p-2 md:p-3 hover:bg-rose-50 rounded-lg md:rounded-xl text-gray-500 transition-all" title="الإشعارات">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 border-2 border-white rounded-full"></span>
                )}
              </button>
            </div>

            <button onClick={handleLogout} className="p-2 md:p-3 bg-rose-50 text-rose-800 rounded-xl md:rounded-2xl hover:bg-rose-100 transition-all font-bold text-[11px] md:text-sm border border-rose-100 ml-1">
              <LogOut size={18} className="md:hidden" />
              <span className="hidden md:inline">خروج</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setIsNotificationOpen(false)}>
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-900 p-6 md:p-8 text-white flex justify-between items-center">
              <h3 className="text-xl font-black">صندوق الرسائل</h3>
              <button onClick={() => setIsNotificationOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-slate-50">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-gray-300 font-bold">لا توجد رسائل جديدة</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-5 bg-white rounded-2xl border border-rose-100 shadow-sm">
                    <p className="text-sm font-bold text-gray-800 mb-2">{n.message}</p>
                    <div className="flex justify-between items-center text-[10px] text-rose-300 font-bold uppercase">
                      <span>{new Date(n.timestamp).toLocaleString('ar-EG')}</span>
                      <button onClick={() => deleteNotification(n.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
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
