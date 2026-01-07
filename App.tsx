
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, History, Package, ClipboardList, 
  TrendingUp, BarChart, Settings as SettingsIcon, 
  LogOut, Menu, X, Bell, Calendar,
  Loader2, Sparkles
} from 'lucide-react';
import { db, ref, onValue, update } from './firebase';
import { User, AppSettings, Notification, AppTheme, Market, Company, DailySale, InventoryRecord, Vacation } from './types';

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
import AIChatbot from './views/AIChatbot';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('daily-sales');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sales, setSales] = useState<DailySale[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<AppTheme>('standard');
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  useEffect(() => {
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
    });

    onValue(ref(db, 'inventory'), (snapshot) => {
      const data = snapshot.val();
      if (data) setInventory(Object.values(data));
    });

    onValue(ref(db, 'vacations'), (snapshot) => {
      const data = snapshot.val();
      if (data) setVacations(Object.values(data));
    });

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      onValue(ref(db, 'markets'), (snapshot) => {
        const data = snapshot.val();
        if (data) setMarkets(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
      });
      onValue(ref(db, 'companies'), (snapshot) => {
        const data = snapshot.val();
        if (data) setCompanies(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
      });
      onValue(ref(db, 'notifications'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const allNotifs = Object.entries(data).map(([id, val]: any) => ({ ...val, id }));
          setNotifications(allNotifs.filter(n => n.receiverId === 'all' || n.receiverId === user.id));
        }
      });
    }
  }, [user]);

  const starOfMonthInfo = useMemo(() => {
    if (!sales || sales.length === 0) return null;
    const now = new Date();
    const currentMonthSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const userTotals: Record<string, {name: string, total: number}> = {};
    currentMonthSales.forEach(s => {
      if (!userTotals[s.userId]) userTotals[s.userId] = { name: s.userName, total: 0 };
      userTotals[s.userId].total += (Number(s.total) || 0);
    });
    return Object.values(userTotals).sort((a, b) => b.total - a.total)[0] || null;
  }, [sales]);

  const tickerText = useMemo(() => {
    let text = settings?.tickerText || '';
    if (settings?.showTopSalesInTicker && starOfMonthInfo) {
      text = `🏆 نجم الشهر: ${starOfMonthInfo.name} بمبيعات ${starOfMonthInfo.total.toLocaleString()} ج.م 🏆 | ` + text;
    }
    return text;
  }, [settings, starOfMonthInfo]);

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    update(ref(db, `users/${loggedUser.id}`), { isOnline: true });
  };

  const handleLogout = () => {
    if (user) update(ref(db, `users/${user.id}`), { isOnline: false });
    setUser(null);
  };

  const sidebarItems = [
    { id: 'daily-sales', label: 'المبيعات اليومية', icon: <ShoppingCart size={20}/>, visible: true },
    { id: 'sales-history', label: 'سجل المبيعات', icon: <History size={20}/>, visible: true },
    { id: 'inventory-reg', label: 'تسجيل المخزون', icon: <Package size={20}/>, visible: true },
    { id: 'inventory-history', label: 'سجل المخزون', icon: <ClipboardList size={20}/>, visible: true },
    { id: 'competitor-prices', label: 'أسعار المنافسين', icon: <TrendingUp size={20}/>, visible: true },
    { id: 'competitor-reports', label: 'تقارير المنافسين', icon: <BarChart size={20}/>, visible: true },
    { id: 'vacation-mgmt', label: 'رصيد الاجازات', icon: <Calendar size={20}/>, visible: true },
    { id: 'settings', label: 'إعدادات النظام', icon: <SettingsIcon size={20}/>, visible: user?.role === 'admin' },
  ].filter(i => i.visible);

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-rose-50"><Loader2 className="animate-spin text-rose-600" size={48}/></div>;
  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className={`flex h-screen overflow-hidden theme-${theme} transition-all duration-300 relative`}>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}/>}

      <aside className={`bg-rose-900 text-white w-72 flex-shrink-0 transition-all duration-300 z-50 fixed md:relative inset-y-0 ${isSidebarOpen ? 'right-0' : '-right-72 md:right-0'} shadow-2xl`}>
        <div className="p-6 flex flex-col h-full">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black tracking-widest text-rose-300">SOFT ROSE</span>
              <h1 className="text-xl font-black">Modern Trade</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
          </div>
          <nav className="flex-1 space-y-1.5 overflow-y-auto">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 ${activeTab === item.id ? 'bg-white text-rose-900 font-bold shadow-xl shadow-rose-100' : 'hover:bg-white/10 opacity-80'}`}
              >
                <span className={activeTab === item.id ? 'text-rose-600' : 'text-white'}>{item.icon}</span>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-0 overflow-hidden bg-[#F9FAFB] relative">
        {tickerText && (
          <div className="bg-rose-950 py-2 text-white text-[11px] overflow-hidden z-50">
            <div className="ticker-container"><div className="ticker-text font-bold opacity-90">{tickerText}</div></div>
          </div>
        )}

        <header className="h-20 flex items-center justify-between px-8 bg-white shadow-sm z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-rose-50 rounded-xl transition-all"><Menu size={20} className="text-rose-800" /></button>
            <h2 className="font-black text-rose-900 text-xl leading-tight">Soft Rose Modern Trade</h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-rose-50 px-4 py-2 rounded-xl text-rose-800 font-black text-sm">{user.employeeName}</div>
             <button onClick={handleLogout} className="p-2.5 bg-rose-900 text-white rounded-xl hover:bg-rose-800 transition-all shadow-lg shadow-rose-100"><LogOut size={18} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
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

        {/* Floating AI - Always Accessible */}
        <div className="fixed bottom-6 left-6 z-[3000] flex flex-col items-end gap-4 pointer-events-none">
          {isAIChatOpen && (
            <div className="w-[90vw] md:w-[380px] h-[500px] pointer-events-auto animate-in slide-in-from-bottom-5">
              <AIChatbot 
                user={user} 
                onClose={() => setIsAIChatOpen(false)}
                appData={{ sales, inventory, vacations, users, markets, settings }}
              />
            </div>
          )}
          <button 
            onClick={() => setIsAIChatOpen(!isAIChatOpen)}
            className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-rose-900 text-white flex items-center justify-center shadow-2xl pointer-events-auto transition-all hover:scale-110 active:scale-95 ${isAIChatOpen ? 'rotate-90 bg-rose-950 shadow-none' : 'animate-bounce'}`}
          >
            {isAIChatOpen ? <X size={24}/> : <Sparkles size={28} className="text-amber-400"/>}
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
