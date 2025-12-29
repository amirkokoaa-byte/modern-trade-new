
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, History, Package, ClipboardList, 
  TrendingUp, BarChart, Settings as SettingsIcon, 
  LogOut, Menu, X, Bell, MessageCircle, Calendar,
  Loader2, Wifi, WifiOff, Palette, Trophy
} from 'lucide-react';
import { db, ref, onValue, update, remove } from './firebase';
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
      if (data) {
        const usersList = Object.entries(data).map(([id, val]: any) => ({ ...val, id: val.id || id }));
        setUsers(usersList);
      }
    });

    onValue(ref(db, 'sales'), (snapshot) => {
      const data = snapshot.val();
      if (data) setSales(Object.values(data));
      else setSales([]);
    });

    setIsLoading(false);
  }, []);

  const starOfMonthInfo = useMemo(() => {
    if (!sales.length) return null;
    const now = new Date();
    const currentMonthSales = sales.filter(s => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const userTotals: Record<string, {name: string, total: number}> = {};
    currentMonthSales.forEach(s => {
      if (!userTotals[s.userId]) userTotals[s.userId] = { name: s.userName || 'غير معروف', total: 0 };
      userTotals[s.userId].total += (Number(s.total) || 0);
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

  const constructedTickerText = useMemo(() => {
    let text = settings?.tickerText || '';
    if (settings?.showTopSalesInTicker && starOfMonthInfo) {
      const topSalesMsg = `🏆 نجم الشهر الحالي: ${starOfMonthInfo.name} بمبيعات إجمالية ${(starOfMonthInfo.total || 0).toLocaleString()} ج.م 🏆`;
      text = topSalesMsg + (text ? ` | ${text}` : '');
    }
    return text;
  }, [settings, starOfMonthInfo]);

  return (
    <div className={`flex h-screen overflow-hidden theme-${theme} transition-all duration-300 relative`}>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}/>
      )}

      <aside className={`bg-rose-900 text-white w-72 flex-shrink-0 transition-all duration-300 z-50 fixed md:relative inset-y-0 ${isSidebarOpen ? 'right-0' : '-right-72 md:right-0'} shadow-2xl`}>
        <div className="p-6 flex flex-col h-full">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black tracking-widest text-rose-300">SOFT ROSE</span>
              <h1 className="text-xl font-black tracking-tighter">Modern Trade</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
          </div>
          
          <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 ${activeTab === item.id ? 'bg-white text-rose-900 font-bold shadow-xl' : 'hover:bg-white/10 opacity-80'}`}
              >
                <span className={activeTab === item.id ? 'text-rose-600' : 'text-white'}>{item.icon}</span>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F9FAFB]">
        {constructedTickerText && (
          <div className="bg-rose-950 py-2 text-white text-[11px] md:text-[13px] overflow-hidden border-b border-rose-900/50 shadow-inner z-50">
            <div className="ticker-container">
              <div className="ticker-text font-bold opacity-90" style={{ animationDuration: '45s' }}>
                {constructedTickerText} &nbsp;&nbsp; ★ &nbsp;&nbsp; {constructedTickerText}
              </div>
            </div>
          </div>
        )}

        <header className="h-16 md:h-20 flex items-center justify-between px-3 md:px-8 bg-white shadow-sm z-30">
          <div className="flex items-center gap-2 md:gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-rose-50 rounded-xl transition-all">
              <Menu size={20} className="text-rose-800" />
            </button>
            <div className="flex flex-col">
              <h2 className="font-black text-rose-900 text-sm md:text-xl truncate">
                {settings?.programName || 'Soft Rose Modern Trade'}
              </h2>
              <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                {user.employeeName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex items-center bg-slate-100/70 p-1 rounded-xl gap-1">
              <button onClick={openWhatsApp} className="p-2 md:p-3 text-green-600 hover:bg-white rounded-lg transition-all"><MessageCircle size={18} /></button>
              <button onClick={cycleTheme} className="p-2 md:p-3 text-amber-500 hover:bg-white rounded-lg transition-all"><Palette size={18} /></button>
              <div className={`p-2 md:p-3 rounded-lg ${isOnline ? 'text-blue-600' : 'text-red-500'}`}>{isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}</div>
              <button onClick={() => setIsNotificationOpen(true)} className="relative p-2 md:p-3 text-gray-500 hover:bg-white rounded-lg transition-all">
                <Bell size={18} />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 border-2 border-white rounded-full"></span>}
              </button>
            </div>
            <button onClick={handleLogout} className="p-2 md:p-3 bg-rose-50 text-rose-800 rounded-xl hover:bg-rose-100 transition-all font-bold text-[11px] md:text-sm border border-rose-100 ml-1">
              <LogOut size={18} className="md:hidden" />
              <span className="hidden md:inline">خروج</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
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
            <div className="bg-rose-900 p-6 text-white flex justify-between items-center">
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
