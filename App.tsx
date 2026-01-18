
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingCart, History, Package, ClipboardList, 
  TrendingUp, BarChart, Settings as SettingsIcon, 
  LogOut, Menu, X, Bell, Calendar,
  Loader2, Sparkles, Phone, Palette, Copy, Trash2
} from 'lucide-react';
import { db, ref, onValue, update, remove } from './firebase';
import { User, AppSettings, Notification, Market, Company, DailySale, InventoryRecord, Vacation } from './types';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'rose' | 'dark' | 'purple' | 'emerald'>('rose');

  const notifRef = useRef<HTMLDivElement>(null);

  // Theme Config
  const themes = {
    rose: 'blob-rose',
    dark: 'blob-dark',
    purple: 'blob-purple',
    emerald: 'blob-emerald'
  };

  useEffect(() => {
    document.body.className = themes[currentTheme];
  }, [currentTheme]);

  // Monthly Reset Logic for "Absent without Permission"
  useEffect(() => {
    if (user?.role === 'admin' && users.length > 0) {
      const currentMonth = new Date().getMonth();
      const lastResetMonth = localStorage.getItem('lastResetMonth');
      
      if (lastResetMonth === null || parseInt(lastResetMonth) !== currentMonth) {
        users.forEach(u => {
          if (u.id && u.vacationBalance) {
            update(ref(db, `users/${u.id}/vacationBalance`), {
              absent_without_permission: 0
            });
          }
        });
        localStorage.setItem('lastResetMonth', currentMonth.toString());
      }
    }
  }, [user, users]);

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
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ ...val, id }));
        setVacations(list);
      }
    });

    onValue(ref(db, 'notifications'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ ...val, id }));
        setNotifications(list);
      } else {
        setNotifications([]);
      }
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

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return notifications.filter(n => n.receiverId === user.id && !n.isRead).length;
  }, [notifications, user]);

  const userNotifications = useMemo(() => {
    if (!user) return [];
    return notifications.filter(n => n.receiverId === user.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, user]);

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    update(ref(db, `users/${loggedUser.id}`), { isOnline: true });
  };

  const handleLogout = () => {
    if (user) update(ref(db, `users/${user.id}`), { isOnline: false });
    setUser(null);
  };

  const openWhatsApp = () => {
    if (settings?.whatsappNumber) {
      window.open(`https://wa.me/${settings.whatsappNumber}`, '_blank');
    } else {
      alert("لم يتم تسجيل رقم واتساب في الإعدادات");
    }
  };

  const toggleTheme = () => {
    const themeOrder: Array<'rose' | 'dark' | 'purple' | 'emerald'> = ['rose', 'dark', 'purple', 'emerald'];
    const nextIdx = (themeOrder.indexOf(currentTheme) + 1) % themeOrder.length;
    setCurrentTheme(themeOrder[nextIdx]);
  };

  const deleteNotification = async (id: string) => {
    await remove(ref(db, `notifications/${id}`));
    if (selectedNotif?.id === id) setSelectedNotif(null);
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

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-transparent"><Loader2 className="animate-spin text-rose-50" size={48}/></div>;
  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className={`flex h-screen overflow-hidden relative bg-transparent text-white ${currentTheme}-theme`}>
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-md transition-all duration-300" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Glass Sidebar */}
      <aside className={`glass-sidebar-inner text-white w-72 flex-shrink-0 transition-all duration-500 z-[70] fixed md:absolute md:relative inset-y-0 ${isSidebarOpen ? 'right-0' : '-right-72 md:-right-72'} shadow-2xl`}>
        <div className="p-8 flex flex-col h-full">
          <div className="mb-12 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black tracking-[0.4em] text-rose-500">SOFT ROSE</span>
              <h1 className="text-xl font-black tracking-tighter">Modern Trade</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20}/></button>
          </div>
          
          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 relative group ${activeTab === item.id ? 'bg-rose-600/20 text-white font-black active-glow' : 'hover:bg-white/5 text-white/60 font-medium'}`}
              >
                <span className={`${activeTab === item.id ? 'text-rose-400' : 'group-hover:text-white'}`}>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
                {activeTab === item.id && <div className="absolute left-3 w-1.5 h-6 bg-rose-500 rounded-full"></div>}
              </button>
            ))}
          </nav>
          
          <div className="mt-8 pt-8 border-t border-white/5">
             <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-rose-400 hover:bg-rose-500/10 transition-all font-black text-sm">
                <LogOut size={20} />
                <span>تسجيل الخروج</span>
             </button>
          </div>
        </div>
      </aside>

      <main 
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        onClick={() => {
          if(isSidebarOpen) setIsSidebarOpen(false);
          if(isNotifDropdownOpen) setIsNotifDropdownOpen(false);
        }}
      >
        {tickerText && (
          <div className="bg-rose-950/40 backdrop-blur-md py-2.5 text-rose-100 text-[11px] font-black overflow-hidden z-[50] border-b border-white/5 ticker-container">
            <div className={settings?.isTickerAnimated ? "animate-ticker" : "px-8"}>
              {tickerText} &nbsp;&nbsp; • &nbsp;&nbsp; {tickerText}
            </div>
          </div>
        )}

        <header className="h-20 flex items-center justify-between px-8 glass-header-inner z-[40]">
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }} 
              className="p-2.5 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all active:scale-95 flex items-center gap-3"
            >
              <Menu size={22} />
              <span className="hidden md:block font-black text-xs text-white/80">{user.employeeName}</span>
            </button>
            <h2 className="font-black text-white text-lg tracking-tight hidden sm:block">
              {settings?.programName || 'Soft Rose Modern Trade'}
            </h2>
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            {/* Top Navigation Buttons - Ordered Left to Right: Logout, Bell, Style, WhatsApp */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleLogout} 
                className="p-2.5 bg-white/5 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                title="تسجيل الخروج"
              >
                <LogOut size={20} />
              </button>
              
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsNotifDropdownOpen(!isNotifDropdownOpen); }}
                  className="p-2.5 bg-white/5 text-amber-400 rounded-xl hover:bg-amber-500 hover:text-white transition-all relative shadow-sm"
                  title="الإشعارات"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border border-slate-900 animate-pulse"></div>}
                </button>
                
                {isNotifDropdownOpen && (
                  <div className="absolute left-0 mt-4 w-72 glass-card-dark rounded-2xl overflow-hidden shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                    <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                      <span className="text-xs font-black">مركز التنبيهات</span>
                      <span className="text-[10px] bg-rose-600 px-2 py-0.5 rounded-full">{userNotifications.length}</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      {userNotifications.length === 0 ? (
                        <div className="p-8 text-center text-white/20 text-[10px] font-bold italic">لا توجد رسائل جديدة</div>
                      ) : (
                        userNotifications.map(n => (
                          <button 
                            key={n.id} 
                            onClick={() => {
                              setSelectedNotif(n);
                              setIsNotifDropdownOpen(false);
                              update(ref(db, `notifications/${n.id}`), { isRead: true });
                            }}
                            className={`w-full p-4 text-right hover:bg-white/5 transition-all border-b border-white/5 flex gap-3 items-start ${!n.isRead ? 'bg-rose-600/5' : ''}`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.isRead ? 'bg-rose-500' : 'bg-transparent'}`}></div>
                            <div>
                              <p className={`text-xs ${!n.isRead ? 'font-black text-white' : 'font-medium text-white/60'} line-clamp-2 text-right`}>{n.message}</p>
                              <p className="text-[9px] text-white/20 mt-1 text-right">{new Date(n.timestamp).toLocaleString('ar-EG')}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={toggleTheme}
                className="p-2.5 bg-white/5 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                title="تغيير الاستايل"
              >
                <Palette size={20} />
              </button>

              <button 
                onClick={openWhatsApp}
                className="p-2.5 bg-white/5 text-green-400 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm"
                title="تواصل واتساب"
              >
                <Phone size={20} />
              </button>
            </div>

            <div className="w-10 h-10 md:w-11 md:h-11 bg-rose-700/80 text-white rounded-2xl flex items-center justify-center font-black shadow-xl border border-white/10">
               {user.employeeName.charAt(0)}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            <div className="glass-card-dark rounded-[2.5rem] p-6 md:p-10 min-h-full">
              {activeTab === 'daily-sales' && <DailySales user={user} markets={markets.map(m => m.name)} />}
              {activeTab === 'sales-history' && <SalesHistory user={user} markets={markets.map(m => m.name)} users={users} />}
              {activeTab === 'inventory-reg' && <InventoryRegistration user={user} markets={markets.map(m => m.name)} />}
              {activeTab === 'inventory-history' && <InventoryHistory user={user} markets={markets.map(m => m.name)} users={users} />}
              {activeTab === 'competitor-prices' && <CompetitorPrices user={user} markets={markets.map(m => m.name)} />}
              {activeTab === 'competitor-reports' && <CompetitorReports user={user} markets={markets.map(m => m.name)} />}
              {activeTab === 'vacation-mgmt' && <VacationManagement user={user} users={users} vacations={vacations} />}
              {activeTab === 'settings' && <Settings user={user} settings={settings} users={users} markets={markets} companies={companies} />}
            </div>
          </div>
        </div>

        {/* Notif Modal */}
        {selectedNotif && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
            <div className="glass-card-dark rounded-[3rem] p-8 max-w-md w-full border border-white/10 animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-black text-amber-400">رسالة واردة</h3>
                 <button onClick={() => setSelectedNotif(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
               </div>
               <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-sm font-bold leading-relaxed mb-8 text-right">
                 {selectedNotif.message}
               </div>
               <div className="flex gap-4">
                 <button 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedNotif.message);
                    alert("تم النسخ بنجاح");
                  }} 
                  className="flex-1 bg-white/10 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-black text-xs hover:bg-white/20 transition-all"
                 >
                   <Copy size={16}/> نسخ النص
                 </button>
                 <button 
                  onClick={() => deleteNotification(selectedNotif.id)} 
                  className="flex-1 bg-red-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-black text-xs hover:bg-red-700 transition-all"
                 >
                   <Trash2 size={16}/> حذف
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* Floating AI */}
        <div className="fixed bottom-8 left-8 z-[1000] flex flex-col items-end gap-5 pointer-events-none">
          {isAIChatOpen && (
            <div className="w-[90vw] md:w-[420px] h-[600px] pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-500 shadow-2xl">
              <AIChatbot 
                user={user} 
                onClose={() => setIsAIChatOpen(false)}
                appData={{ sales, inventory, vacations, users, markets, settings }}
              />
            </div>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); setIsAIChatOpen(!isAIChatOpen); }}
            className={`w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-2xl pointer-events-auto transition-all duration-500 hover:scale-110 group ${isAIChatOpen ? 'rotate-90 bg-slate-900' : 'animate-bounce active-glow'}`}
          >
            {isAIChatOpen ? <X size={24}/> : <Sparkles size={28} className="text-amber-300" />}
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
