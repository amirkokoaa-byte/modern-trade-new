
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, ShoppingCart, History, Package, ClipboardList, 
  TrendingUp, BarChart, Settings as SettingsIcon, 
  LogOut, Menu, X, Bell, MessageCircle, Calendar,
  Loader2, Wifi, WifiOff, Palette, Copy, Trash2
} from 'lucide-react';
import { db, ref, onValue, set, update, push, remove } from './firebase';
import { User, AppSettings, Notification, AppTheme, Market, Company } from './types';
import { INITIAL_MARKETS } from './constants';

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

    // Sync markets & companies
    onValue(ref(db, 'markets'), (snapshot) => {
      const data = snapshot.val();
      if (data) setMarkets(Object.entries(data).map(([id, val]: any) => ({ id, name: val.name })));
    });
    onValue(ref(db, 'companies'), (snapshot) => {
      const data = snapshot.val();
      if (data) setCompanies(Object.entries(data).map(([id, val]: any) => ({ id, name: val.name })));
    });

    setIsLoading(false);
  }, []);

  // Notification syncing
  useEffect(() => {
    if (user) {
      onValue(ref(db, 'notifications'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const allNotifs = Object.entries(data).map(([id, val]: any) => ({ ...val, id }));
          const myNotifs = allNotifs.filter(n => n.receiverId === 'all' || n.receiverId === user.id);
          setNotifications(myNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
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

  const copyNotifText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم نسخ النص');
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-rose-50"><Loader2 className="animate-spin text-rose-600" size={48}/></div>;
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
    { id: 'settings', label: 'لوحة التحكم', icon: <SettingsIcon size={20}/>, visible: user.role === 'admin' },
  ].filter(i => i.visible);

  return (
    <div className={`flex h-screen overflow-hidden theme-${theme} transition-all`}>
      {/* Overlay for sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`bg-rose-900 text-white w-64 flex-shrink-0 transition-all z-50 fixed md:relative inset-y-0 ${isSidebarOpen ? 'right-0' : '-right-64 md:right-0'} ${theme === 'glass' ? 'bg-rose-900/80 backdrop-blur-md' : ''}`}>
        <div className="p-4 flex flex-col h-full">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-rose-300">Soft Rose</p>
              <h1 className="text-lg font-black tracking-tighter">Modern Trade</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><X/></button>
          </div>
          
          <nav className="flex-1 space-y-1">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === item.id ? 'bg-white text-rose-900 font-bold' : 'hover:bg-white/10'}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}

            {user.role === 'admin' && (
              <div className="mt-8 pt-4 border-t border-white/10">
                <p className="text-[10px] uppercase text-rose-300 px-4 mb-2">الموظفون المتصلون</p>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-2 px-4 py-1 text-sm">
                      <span className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-blue-400' : 'bg-rose-700'}`}></span>
                      <span className={u.isOnline ? 'text-white' : 'text-rose-300'}>{u.employeeName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </nav>

          <div className="pt-4 border-t border-white/20">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500 transition">
              <LogOut size={20}/>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden ${theme === 'dark' ? 'bg-black' : 'bg-[#FDFDFD]'}`}>
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-6 border-b transition-colors ${theme === 'glass' ? 'bg-white/30 backdrop-blur-md' : 'bg-white'} ${theme === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : ''}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={24} className="text-rose-800" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-black text-rose-800 text-lg hidden sm:block uppercase tracking-tighter">
                {settings?.programName || 'Soft Rose Modern Trade'}
              </span>
              <div className="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
              <span className="font-bold text-gray-700">{user.employeeName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Indicator */}
            <div className="flex items-center gap-1 ml-4" title={isOnline ? 'متصل' : 'غير متصل'}>
              {isOnline ? <Wifi size={18} className="text-blue-500" /> : <WifiOff size={18} className="text-red-500" />}
            </div>

            <button onClick={() => setTheme(theme === 'dark' ? 'standard' : theme === 'glass' ? 'dark' : 'glass')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-all">
              <Palette size={20} />
            </button>

            {settings?.whatsappNumber && (
              <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all shadow-lg shadow-green-100">
                <MessageCircle size={20} />
              </a>
            )}

            <button onClick={() => setIsNotificationOpen(true)} className="relative p-2 hover:bg-rose-50 rounded-full group">
              <Bell size={22} className="text-gray-500 group-hover:text-rose-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </header>

        {/* Ticker */}
        {settings?.tickerText && (
          <div className="bg-rose-950 py-1.5 text-white text-xs overflow-hidden">
            <div className="ticker-container">
              <div className="ticker-text font-bold" style={{ animationDuration: '40s' }}>
                {settings.tickerText} &nbsp;&nbsp; | &nbsp;&nbsp; {settings.tickerText}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
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

      {/* Notification Modal */}
      {isNotificationOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setIsNotificationOpen(false)}>
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-900 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">الإشعارات والرسائل</h3>
              <button onClick={() => setIsNotificationOpen(false)}><X/></button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-gray-400">لا توجد رسائل حالياً</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-4 bg-rose-50 rounded-2xl border border-rose-100 relative group">
                    <p className="text-sm font-medium text-rose-900 mb-3">{n.message}</p>
                    <div className="flex items-center justify-between text-[10px] text-rose-400 font-bold uppercase">
                      <span>{new Date(n.timestamp).toLocaleString('ar-EG')}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyNotifText(n.message)} className="p-1.5 bg-white rounded-lg shadow-sm hover:text-rose-600"><Copy size={14}/></button>
                        <button onClick={() => deleteNotification(n.id)} className="p-1.5 bg-white rounded-lg shadow-sm hover:text-red-600"><Trash2 size={14}/></button>
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
