
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, ShoppingCart, History, Package, ClipboardList, 
  TrendingUp, BarChart, Settings as SettingsIcon, 
  LogOut, Menu, X, Bell, MessageCircle, Calendar,
  Download, Plus, Trash2, Edit
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

  useEffect(() => {
    // Sync settings
    const settingsRef = ref(db, 'settings');
    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setSettings(data);
    });

    // Sync users
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers(Object.values(data));
      }
    });

    // Sync markets
    const marketsRef = ref(db, 'markets');
    onValue(marketsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setMarkets([...INITIAL_MARKETS, ...Object.values(data) as string[]]);
    });
  }, []);

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    update(ref(db, `users/${loggedUser.id}`), { isOnline: true });
  };

  const handleLogout = () => {
    if (user) {
      update(ref(db, `users/${user.id}`), { isOnline: false });
    }
    setUser(null);
  };

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
      <aside className={`bg-rose-700 text-white w-64 flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'ml-0' : '-ml-64'} md:relative fixed inset-y-0 z-50`}>
        <div className="p-4 flex flex-col h-full">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-xl font-bold">{settings?.programName || 'Soft Rose'}</h1>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden">
              <X size={24} />
            </button>
          </div>
          
          <nav className="flex-1 space-y-1">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === item.id ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-4 border-t border-white/20">
            <div className="flex items-center gap-3 mb-4 px-4">
              <div className={`w-3 h-3 rounded-full ${user.isOnline ? 'bg-blue-400' : 'bg-red-400'}`}></div>
              <span className="text-sm">{user.employeeName}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition"
            >
              <LogOut size={20} />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-4 sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className={`${isSidebarOpen ? 'hidden' : 'block'} p-2 hover:bg-gray-100 rounded-lg`}>
            <Menu size={24} />
          </button>
          
          <div className="flex-1 text-center font-bold text-rose-800 text-lg hidden sm:block">
            {settings?.programName || 'Soft Rose Modern Trade'}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsNotificationOpen(true)}
              className="relative p-2 hover:bg-gray-100 rounded-full"
            >
              <Bell size={22} className="text-gray-600" />
              {notifications.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>}
            </button>
            
            {settings?.whatsappNumber && (
              <a 
                href={`https://wa.me/${settings.whatsappNumber}`} 
                target="_blank"
                className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm hover:bg-green-600 transition"
              >
                <MessageCircle size={18} />
                <span className="hidden md:inline">تواصل واتس اب</span>
              </a>
            )}
          </div>
        </header>

        {/* Ticker */}
        {settings && (settings.tickerText || settings.showDailySalesTicker) && (
          <div className="bg-rose-100 py-1 text-rose-800 text-sm overflow-hidden border-b">
            <div className="ticker-container">
              <div className="ticker-text px-4">
                {settings.tickerText} {settings.showDailySalesTicker && " | مبيعات اليوم الأعلى: محلاوي الحي العاشر 5000ج"}
              </div>
            </div>
          </div>
        )}

        {/* Views */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'daily-sales' && <DailySales user={user} markets={markets} />}
          {activeTab === 'sales-history' && <SalesHistory user={user} markets={markets} users={users} />}
          {activeTab === 'inventory-reg' && <InventoryRegistration user={user} markets={markets} />}
          {activeTab === 'inventory-history' && <InventoryHistory user={user} markets={markets} users={users} />}
          {activeTab === 'competitor-prices' && <CompetitorPrices user={user} markets={markets} />}
          {activeTab === 'competitor-reports' && <CompetitorReports user={user} markets={markets} />}
          {activeTab === 'vacation-mgmt' && <VacationManagement user={user} users={users} />}
          {activeTab === 'settings' && user.role === 'admin' && <Settings user={user} settings={settings} users={users} />}
        </div>
      </main>

      {/* Notification Modal */}
      {isNotificationOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">الإشعارات</h3>
              <button onClick={() => setIsNotificationOpen(false)}><X/></button>
            </div>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">لا توجد إشعارات حالياً</p>
              ) : (
                notifications.map((n, i) => (
                  <div key={i} className="p-3 border rounded-lg bg-gray-50">
                    <p>{n.message}</p>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => setIsNotificationOpen(false)}
              className="w-full mt-6 bg-rose-600 text-white py-2 rounded-lg"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
