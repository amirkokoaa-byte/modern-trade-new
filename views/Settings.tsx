
import React, { useState } from 'react';
import { User, AppSettings, Market, Company, Notification } from '../types';
import { db, ref, update, set, push, remove } from '../firebase';
import { 
  Save, UserPlus, Shield, MessageCircle, AlertCircle, 
  Store, Building2, UserCog, Send, Trash2, Edit,
  // Fix: Added missing SettingsIcon import
  Settings as SettingsIcon
} from 'lucide-react';

interface Props {
  user: User;
  settings: AppSettings | null;
  users: User[];
  markets: Market[];
  companies: Company[];
}

const Settings: React.FC<Props> = ({ user, settings, users, markets, companies }) => {
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [newTickerText, setNewTickerText] = useState(settings?.tickerText || '');
  const [newProgramName, setNewProgramName] = useState(settings?.programName || '');
  const [whatsapp, setWhatsapp] = useState(settings?.whatsappNumber || '');
  
  // User Management States
  const [newUser, setNewUser] = useState({ username: '', password: '', employeeName: '', role: 'user' as const });
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  // Market/Company States
  const [newItemName, setNewItemName] = useState('');

  const handleSaveGeneral = async () => {
    await update(ref(db, 'settings'), {
      tickerText: newTickerText,
      programName: newProgramName,
      whatsappNumber: whatsapp
    });
    alert("تم حفظ الإعدادات العامة");
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    const newId = push(ref(db, 'users')).key || '';
    await set(ref(db, `users/${newId}`), {
      ...newUser,
      id: newId,
      isOnline: false,
      permissions: {
        viewColleaguesSales: false,
        viewSalesHistory: true,
        registerInventory: true,
        viewInventoryHistory: true,
        viewCompetitorReports: true,
        viewCompetitorPrices: true,
      },
      vacationBalance: { annual: 21, casual: 7, sick: 15, exams: 0 }
    });
    setNewUser({ username: '', password: '', employeeName: '', role: 'user' });
  };

  const togglePerm = async (userId: string, perm: string, current: boolean) => {
    await update(ref(db, `users/${userId}/permissions`), { [perm]: !current });
  };

  const sendNotification = async () => {
    if (!messageText || !messageTarget) return;
    await push(ref(db, 'notifications'), {
      senderId: user.id,
      receiverId: messageTarget,
      message: messageText,
      timestamp: new Date().toISOString(),
      isRead: false
    });
    setMessageText('');
    setMessageTarget(null);
    alert('تم إرسال الرسالة');
  };

  const addItem = async (type: 'markets' | 'companies') => {
    if (!newItemName) return;
    await push(ref(db, type), { name: newItemName });
    setNewItemName('');
  };

  return (
    <div className="space-y-6">
      {/* Settings Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'general', label: 'إعدادات عامة', icon: <SettingsIcon size={18}/> },
          { id: 'users', label: 'الموظفون والصلاحيات', icon: <UserCog size={18}/> },
          { id: 'markets', label: 'إدارة الماركتات', icon: <Store size={18}/> },
          { id: 'companies', label: 'إدارة الشركات', icon: <Building2 size={18}/> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl whitespace-nowrap transition-all font-bold ${activeSubTab === tab.id ? 'bg-rose-800 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-rose-50'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'general' && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-rose-100">
          <h3 className="text-xl font-black text-rose-900 mb-8">الإعدادات العامة للنظام</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-500 mr-2">اسم البرنامج</label>
              <input 
                className="w-full bg-slate-50 rounded-2xl p-4 border-2 border-transparent focus:border-rose-200 outline-none"
                value={newProgramName} onChange={e => setNewProgramName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-500 mr-2">رقم واتساب الدعم</label>
              <input 
                className="w-full bg-slate-50 rounded-2xl p-4 border-2 border-transparent focus:border-rose-200 outline-none"
                value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-gray-500 mr-2">نص الشريط المتحرك (Ticker)</label>
              <textarea 
                className="w-full bg-slate-50 rounded-2xl p-4 border-2 border-transparent focus:border-rose-200 outline-none h-32"
                value={newTickerText} onChange={e => setNewTickerText(e.target.value)}
              />
            </div>
          </div>
          <button onClick={handleSaveGeneral} className="bg-rose-800 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-rose-200 hover:scale-[1.02] transition-all">حفظ الإعدادات العامة</button>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-rose-100">
            <h3 className="text-xl font-black text-rose-900 mb-6 flex items-center gap-2">
              <UserPlus className="text-rose-600"/> إضافة موظف جديد
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input className="bg-slate-50 p-4 rounded-2xl outline-none" placeholder="الاسم الكامل" value={newUser.employeeName} onChange={e => setNewUser({...newUser, employeeName: e.target.value})}/>
              <input className="bg-slate-50 p-4 rounded-2xl outline-none" placeholder="اسم المستخدم" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/>
              <input className="bg-slate-50 p-4 rounded-2xl outline-none" type="password" placeholder="كلمة المرور" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
              <select className="bg-slate-50 p-4 rounded-2xl outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                <option value="user">موظف</option>
                <option value="admin">مدير</option>
              </select>
            </div>
            <button onClick={handleAddUser} className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">إضافة الموظف</button>
          </div>

          <div className="bg-white p-0 rounded-[2.5rem] shadow-sm border border-rose-100 overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-gray-500 text-xs uppercase tracking-widest font-bold">
                <tr>
                  <th className="p-6">الموظف</th>
                  <th className="p-6">الوظيفة</th>
                  <th className="p-6">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${u.isOnline ? 'bg-blue-500 animate-pulse' : 'bg-rose-200'}`}></div>
                        <div>
                          <p className="font-bold text-gray-800">{u.employeeName}</p>
                          <p className="text-xs text-gray-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-sm font-medium">{u.role === 'admin' ? 'مدير نظام' : 'مندوب'}</td>
                    <td className="p-6">
                      <div className="flex gap-2">
                        <button onClick={() => setMessageTarget(u.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="إرسال رسالة"><Send size={18}/></button>
                        <button onClick={() => setEditingPermissions(u.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100" title="الصلاحيات"><Shield size={18}/></button>
                        <button className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"><Edit size={18}/></button>
                        <button onClick={() => remove(ref(db, `users/${u.id}`))} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeSubTab === 'markets' || activeSubTab === 'companies') && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-rose-100">
          <h3 className="text-xl font-black text-rose-900 mb-6">إدارة {activeSubTab === 'markets' ? 'الماركتات' : 'الشركات المنافسة'}</h3>
          <div className="flex gap-2 mb-8">
            <input 
              className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none font-bold" 
              placeholder={`اسم ال${activeSubTab === 'markets' ? 'ماركت' : 'شركة'}`} 
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
            />
            <button onClick={() => addItem(activeSubTab as any)} className="bg-rose-800 text-white px-8 rounded-2xl font-bold">إضافة</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(activeSubTab === 'markets' ? markets : companies).map(item => (
              <div key={item.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group">
                <span className="font-bold text-gray-700">{item.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit size={16}/></button>
                  <button onClick={() => remove(ref(db, `${activeSubTab}/${item.id}`))} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {editingPermissions && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full">
            <h4 className="text-lg font-black mb-6 border-b pb-4 text-rose-900">إدارة صلاحيات الموظف</h4>
            <div className="space-y-4">
              {users.find(u => u.id === editingPermissions)?.permissions && Object.entries(users.find(u => u.id === editingPermissions)!.permissions).map(([key, val]: any) => (
                <label key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-sm font-bold text-gray-600">
                    {key === 'viewColleaguesSales' ? 'رؤية مبيعات الزملاء' : 
                     key === 'viewSalesHistory' ? 'رؤية سجل المبيعات' :
                     key === 'registerInventory' ? 'تسجيل المخزون' :
                     key === 'viewInventoryHistory' ? 'رؤية سجل المخزون' :
                     key === 'viewCompetitorReports' ? 'رؤية تقارير المنافسين' : 'رؤية أسعار المنافسين'}
                  </span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-rose-600" 
                    checked={val} 
                    onChange={() => togglePerm(editingPermissions, key, val)}
                  />
                </label>
              ))}
            </div>
            <button onClick={() => setEditingPermissions(null)} className="w-full mt-8 bg-rose-800 text-white py-4 rounded-2xl font-black">حفظ وإغلاق</button>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {messageTarget && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full">
            <h4 className="text-lg font-black mb-6 text-rose-900">إرسال رسالة إدارية</h4>
            <textarea 
              className="w-full bg-slate-50 p-4 rounded-2xl outline-none h-40 border-2 border-transparent focus:border-rose-200"
              placeholder="اكتب نص الرسالة هنا..."
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
            ></textarea>
            <div className="flex gap-3 mt-6">
              <button onClick={sendNotification} className="flex-1 bg-rose-800 text-white py-4 rounded-2xl font-black">إرسال الآن</button>
              <button onClick={() => setMessageTarget(null)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
