
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, ShoppingCart, History, Package, ClipboardList, 
  TrendingUp, BarChart, Settings as SettingsIcon, 
  LogOut, Menu, X, Bell, MessageCircle, Calendar,
  Loader2
} from 'lucide-react';
import { db, ref, onValue, set, update, push } from './firebase';
import { User, AppSettings, DailySale, InventoryRecord, CompetitorPrice, Vacation } from './types';
import { INITIAL_MARKETS, PRODUCT_GROUPS } from './constants';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [markets, setMarkets] = useState<string[]>(INITIAL_MARKETS);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial data loading with a slight timeout to prevent flash
    const timer = setTimeout(() => setIsLoading(false), 2000);

    // Sync settings
    const settingsRef = ref(db, 'settings');
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setSettings(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase connection error:", error);
      setIsLoading(false);
    });

    // Sync users
    const usersRef = ref(db, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers(Object.values(data));
      }
    });

    // Sync markets
    const marketsRef = ref(db, 'markets');
    const unsubscribeMarkets = onValue(marketsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const marketList = Object.values(data) as string[];
        setMarkets([...INITIAL_MARKETS, ...marketList]);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribeSettings();
      unsubscribeUsers();
      unsubscribeMarkets();
    };
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-rose-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-rose-800 animate-pulse">Soft Rose Modern Trade</h2>
        <p className="text-rose-400 mt-2">جاري الاتصال بقاعدة البيانات...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const sidebarItems = [
    { id: 'daily-sales', label: settings?.sidebarConfig?.['daily-sales']?.label || 'المبيعات اليومية', icon: <ShoppingCart size={20}/> },
    { id: 'sales-history', label: settings?.sidebarConfig?.['sales-history']?.label || 'سجل المبيعات', icon: <History size={20}/> },
    { id: 'inventory-reg', label: settings?.sidebarConfig?.['inventory-reg']?.label || 'تسجيل المخزون', icon: <Package size={20}/> },
    { id: 'inventory-history', label: settings?.sidebarConfig?.['inventory-history']?.label || 'سجل المخزون', icon: <ClipboardList size={20}/> },
    { id: 'competitor-prices', label: settings?.sidebarConfig?.['competitor-prices']?.label || 'أسعار المنافسين', icon: <TrendingUp size={20}/> },
    { id: 'competitor-reports', label: settings?.sidebarConfig?.['competitor-reports']?.label || 'تقارير المنافسين', icon: <BarChart size={20}/> },
    { id: 'vacation-mgmt', label: settings?.sidebarConfig?.['vacation-mgmt']?.label || 'رصيد الاجازات', icon: <Calendar size={20}/> },
    { id: 'settings', label: 'الإعدادات', icon: <SettingsIcon size={20}/>, adminOnly: true },
  ].filter(item => {
    if (item.adminOnly && user.role !== 'admin') return false;
    const config = settings?.sidebarConfig?.[item.id];
    if (config && !config.isVisible && user.role !== 'admin') return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-rose-800 text-white w-64 flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'ml-0' : '-ml-64'} md:relative fixed inset-y-0 z-50 shadow-2xl shadow-rose-900/50`}>
        <div className="p-4 flex flex-col h-full">
          <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-rose-300 font-bold">Soft Rose</span>
              <h1 className="text-lg font-bold">Modern Trade</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 hover:bg-white/10 rounded-full">
              <X size={24} />
            </button>
          </div>
          
          <nav className="flex-1 space-y-1">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === item.id ? 'bg-white text-rose-800 font-bold shadow-lg shadow-black/10' : 'hover:bg-white/10'}`}
              >
                <span className={`${activeTab === item.id ? 'text-rose-600' : 'text-white'}`}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-4 border-t border-white/20">
            <div className="flex items-center gap-3 mb-4 px-4 bg-white/5 p-3 rounded-xl">
              <div className="relative">
                <div className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {user.employeeName.charAt(0)}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-rose-800 ${user.isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold truncate max-w-[120px]">{user.employeeName}</span>
                <span className="text-[10px] text-rose-300 uppercase">{user.role === 'admin' ? 'مدير النظام' : 'مندوب مبيعات'}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500 transition-colors group"
            >
              <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className={`${isSidebarOpen ? 'hidden' : 'block'} p-2 hover:bg-gray-100 rounded-lg transition-colors`}>
              <Menu size={24} className="text-rose-800" />
            </button>
            <h2 className="font-bold text-rose-900 md:text-xl text-lg truncate">
              {sidebarItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          
          <div className="flex-1 text-center font-black text-rose-800 text-xl hidden lg:block tracking-tighter">
            SOFT ROSE MODERN TRADE
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsNotificationOpen(true)}
              className="relative p-2.5 hover:bg-rose-50 rounded-full transition-colors group"
            >
              <Bell size={22} className="text-gray-500 group-hover:text-rose-600" />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-600 border-2 border-white rounded-full"></span>
              )}
            </button>
            
            {settings?.whatsappNumber && (
              <a 
                href={`https://wa.me/${settings.whatsappNumber}`} 
                target="_blank"
                className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#128C7E] transition-all shadow-md shadow-green-100"
              >
                <MessageCircle size={18} />
                <span className="hidden md:inline">الدعم الفني</span>
              </a>
            )}
          </div>
        </header>

        {/* Ticker */}
        {settings && (settings.tickerText || settings.showDailySalesTicker) && (
          <div className="bg-rose-900 py-1.5 text-white text-xs overflow-hidden border-b border-rose-950">
            <div className="ticker-container">
              <div className="ticker-text px-4 font-bold flex gap-8 items-center">
                <span>{settings.tickerText}</span>
                {settings.showDailySalesTicker && (
                  <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] border border-white/5">
                    📢 مبيعات اليوم الأعلى: محلاوي الحي العاشر (5,420 ج.م)
                  </span>
                )}
                <span>🌟 جودة سوفت روز .. خيارك الأول دائماً</span>
              </div>
            </div>
          </div>
        )}

        {/* Views Container */}
        <div className="flex-1 overflow-y-auto bg-[#FDFDFD]">
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            {activeTab === 'daily-sales' && <DailySales user={user} markets={markets} />}
            {activeTab === 'sales-history' && <SalesHistory user={user} markets={markets} users={users} />}
            {activeTab === 'inventory-reg' && <InventoryRegistration user={user} markets={markets} />}
            {activeTab === 'inventory-history' && <InventoryHistory user={user} markets={markets} users={users} />}
            {activeTab === 'competitor-prices' && <CompetitorPrices user={user} markets={markets} />}
            {activeTab === 'competitor-reports' && <CompetitorReports user={user} markets={markets} />}
            {activeTab === 'vacation-mgmt' && <VacationManagement user={user} users={users} />}
            {activeTab === 'settings' && user.role === 'admin' && <Settings user={user} settings={settings} users={users} />}
          </div>
        </div>
      </main>

      {/* Notification Modal */}
      {isNotificationOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-0 overflow-hidden shadow-2xl">
            <div className="bg-rose-800 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">الإشعارات</h3>
                <p className="text-rose-200 text-xs">اخر التحديثات والتنبيهات</p>
              </div>
              <button onClick={() => setIsNotificationOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Bell className="w-12 h-12 mb-4 opacity-20" />
                    <p>لا توجد إشعارات جديدة</p>
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="p-4 border-r-4 border-rose-500 bg-rose-50 rounded-xl">
                      <p className="text-sm font-medium text-rose-900">{n.message}</p>
                      <span className="text-[10px] text-rose-400 mt-2 block">منذ قليل</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setIsNotificationOpen(false)}
                className="px-6 py-2 bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md"
              >
                فهمت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
