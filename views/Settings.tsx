
import React, { useState } from 'react';
import { User, AppSettings, Market, Company, Notification, UserRole } from '../types';
import { db, ref, update, set, push, remove } from '../firebase';
import { 
  Save, UserPlus, Shield, MessageCircle, AlertCircle, 
  Store, Building2, UserCog, Send, Trash2, Edit,
  Settings as SettingsIcon, Key, UserCheck, X
} from 'lucide-react';

interface Props {
  user: User;
  settings: AppSettings | null;
  users: User[];
  markets: Market[];
  companies: Company[];
}

const Settings: React.FC<Props> = ({ user, settings, users = [], markets = [], companies = [] }) => {
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [newTickerText, setNewTickerText] = useState(settings?.tickerText || '');
  const [newProgramName, setNewProgramName] = useState(settings?.programName || '');
  const [whatsapp, setWhatsapp] = useState(settings?.whatsappNumber || '');
  
  // User Management States
  const [newUser, setNewUser] = useState({ username: '', password: '', employeeName: '', role: 'coordinator' as UserRole });
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [editingCredentials, setEditingCredentials] = useState<User | null>(null);
  const [messageTarget, setMessageTarget] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  // Market/Company States
  const [newItemName, setNewItemName] = useState('');
  const [editItem, setEditItem] = useState<{id: string, name: string, type: 'markets' | 'companies'} | null>(null);

  const handleSaveGeneral = async () => {
    await update(ref(db, 'settings'), {
      tickerText: newTickerText,
      programName: newProgramName,
      whatsappNumber: whatsapp
    });
    alert("تم حفظ الإعدادات العامة بنجاح");
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.employeeName) {
      alert("يرجى إكمال كافة بيانات الموظف");
      return;
    }
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
    setNewUser({ username: '', password: '', employeeName: '', role: 'coordinator' });
    alert("تمت إضافة الموظف بنجاح");
  };

  const handleUpdateCredentials = async () => {
    if (!editingCredentials) return;
    await update(ref(db, `users/${editingCredentials.id}`), {
      username: editingCredentials.username,
      password: editingCredentials.password,
      employeeName: editingCredentials.employeeName,
      role: editingCredentials.role
    });
    setEditingCredentials(null);
    alert("تم تحديث بيانات الحساب");
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
    alert('تم إرسال الرسالة بنجاح');
  };

  const addItem = async (type: 'markets' | 'companies') => {
    if (!newItemName) return;
    await push(ref(db, type), { name: newItemName, creatorId: user.id });
    setNewItemName('');
  };

  const updateItemName = async () => {
    if (!editItem) return;
    await update(ref(db, `${editItem.type}/${editItem.id}`), { name: editItem.name });
    setEditItem(null);
  };

  const deleteUser = async (u: User) => {
    if (confirm(`هل أنت متأكد من حذف حساب ${u.employeeName}؟`)) {
      await remove(ref(db, `users/${u.id}`));
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير نظام';
      case 'coordinator': return 'منسق';
      case 'usher': return 'أشر';
      default: return 'موظف';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {[
          { id: 'general', label: 'إعدادات عامة', icon: <SettingsIcon size={20}/> },
          { id: 'users', label: 'إدارة الموظفين', icon: <UserCog size={20}/> },
          { id: 'markets', label: 'إدارة الماركتات', icon: <Store size={20}/> },
          { id: 'companies', label: 'إدارة الشركات', icon: <Building2 size={20}/> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl whitespace-nowrap transition-all font-black text-sm uppercase tracking-tight ${activeSubTab === tab.id ? 'bg-rose-800 text-white shadow-xl shadow-rose-200 scale-105' : 'bg-white text-gray-500 hover:bg-rose-50 border border-gray-100'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'general' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-rose-50 animate-in fade-in duration-500">
          <h3 className="text-2xl font-black text-rose-900 mb-10 flex items-center gap-3">
            <SettingsIcon className="text-rose-600" /> الإعدادات العامة للنظام
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-3">
              <label className="text-xs font-black text-rose-400 uppercase tracking-widest mr-2">اسم البرنامج المعروض</label>
              <input 
                className="w-full bg-slate-50 rounded-2xl p-5 border-2 border-transparent focus:border-rose-200 outline-none font-bold text-rose-900 transition-all"
                value={newProgramName} onChange={e => setNewProgramName(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-rose-400 uppercase tracking-widest mr-2">رقم واتساب الدعم الفني</label>
              <input 
                className="w-full bg-slate-50 rounded-2xl p-5 border-2 border-transparent focus:border-rose-200 outline-none font-bold text-rose-900 transition-all"
                value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-3">
              <label className="text-xs font-black text-rose-400 uppercase tracking-widest mr-2">نص الشريط المتحرك (Ticker)</label>
              <textarea 
                className="w-full bg-slate-50 rounded-2xl p-6 border-2 border-transparent focus:border-rose-200 outline-none h-40 font-bold text-rose-900 leading-relaxed transition-all resize-none"
                placeholder="اكتب النص الذي سيظهر في الشريط المتحرك بالأعلى..."
                value={newTickerText} onChange={e => setNewTickerText(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSaveGeneral} className="bg-rose-800 text-white px-12 py-5 rounded-2xl font-black shadow-2xl shadow-rose-200 hover:scale-105 transition-all flex items-center gap-3">
              <Save size={20}/> حفظ الإعدادات العامة
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-rose-50">
            <h3 className="text-2xl font-black text-rose-900 mb-8 flex items-center gap-3">
              <UserPlus className="text-rose-600"/> إضافة موظف جديد
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <input className="bg-slate-50 p-5 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-rose-200" placeholder="الاسم الكامل" value={newUser.employeeName} onChange={e => setNewUser({...newUser, employeeName: e.target.value})}/>
              <input className="bg-slate-50 p-5 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-rose-200" placeholder="اسم المستخدم" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/>
              <input className="bg-slate-50 p-5 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-rose-200" type="password" placeholder="كلمة المرور" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
              <select className="bg-slate-50 p-5 rounded-2xl outline-none font-black text-sm border border-transparent focus:border-rose-200" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                <option value="admin">مدير (Manager)</option>
                <option value="coordinator">منسق (Coordinator)</option>
                <option value="usher">أشر (Usher)</option>
              </select>
            </div>
            <button onClick={handleAddUser} className="mt-8 bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-blue-100 hover:scale-105 transition-all">إضافة الموظف الآن</button>
          </div>

          <div className="bg-white rounded-[3rem] shadow-sm border border-rose-50 overflow-hidden">
            <div className="p-8 border-b bg-slate-50/50">
              <h4 className="font-black text-rose-900">قائمة حسابات الموظفين</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[600px]">
                <thead className="bg-slate-50 text-gray-400 text-[10px] uppercase tracking-widest font-black">
                  <tr>
                    <th className="p-8">الموظف</th>
                    <th className="p-8">الوظيفة والحالة</th>
                    <th className="p-8 text-center">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length > 0 ? users.map(u => (
                    <tr key={u.id} className="hover:bg-rose-50/30 transition-colors group">
                      <td className="p-8">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${u.isOnline ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {u.employeeName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-black text-gray-800">{u.employeeName}</p>
                            <p className="text-xs text-gray-400 font-bold">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'text-purple-600' : u.role === 'coordinator' ? 'text-blue-500' : 'text-green-600'}`}>
                            {getRoleLabel(u.role)}
                          </span>
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-blue-500 animate-pulse' : 'bg-rose-100'}`}></div>
                             <span className="text-[10px] font-bold text-gray-400 uppercase">{u.isOnline ? 'Online' : 'Offline'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => setMessageTarget(u.id)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="إرسال رسالة"><Send size={18}/></button>
                          <button onClick={() => setEditingPermissions(u.id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="الصلاحيات"><Shield size={18}/></button>
                          <button onClick={() => setEditingCredentials(u)} className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm" title="تعديل الحساب"><Edit size={18}/></button>
                          <button onClick={() => deleteUser(u)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm" title="حذف الحساب"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="p-12 text-center text-gray-400 font-bold italic">لا يوجد موظفين مسجلين حالياً</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(activeSubTab === 'markets' || activeSubTab === 'companies') && (
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-rose-50 animate-in fade-in duration-500">
          <h3 className="text-2xl font-black text-rose-900 mb-8 flex items-center gap-3">
             {activeSubTab === 'markets' ? <Store className="text-rose-600" /> : <Building2 className="text-rose-600" />}
             إدارة {activeSubTab === 'markets' ? 'الماركتات' : 'الشركات المنافسة'}
          </h3>
          <div className="flex gap-4 mb-10">
            <input 
              className="flex-1 bg-slate-50 p-5 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-rose-200" 
              placeholder={`أدخل اسم ال${activeSubTab === 'markets' ? 'ماركت' : 'شركة'} الجديد...`} 
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
            />
            <button onClick={() => addItem(activeSubTab as any)} className="bg-rose-800 text-white px-12 rounded-2xl font-black shadow-xl shadow-rose-100 hover:scale-105 transition-all">إضافة</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeSubTab === 'markets' ? markets : companies).map(item => (
              <div key={item.id} className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between group hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100">
                <span className="font-bold text-gray-700">{item.name}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditItem({ id: item.id, name: item.name, type: activeSubTab as any })} className="p-2.5 text-blue-600 hover:bg-white rounded-xl shadow-sm"><Edit size={16}/></button>
                  <button onClick={() => remove(ref(db, `${activeSubTab}/${item.id}`))} className="p-2.5 text-red-600 hover:bg-white rounded-xl shadow-sm"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingPermissions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-4 mb-8 border-b pb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-900 flex items-center justify-center text-white"><Shield /></div>
              <div>
                <h4 className="text-xl font-black text-rose-900">صلاحيات الموظف</h4>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Custom Access Control</p>
              </div>
            </div>
            <div className="space-y-3">
              {users.find(u => u.id === editingPermissions)?.permissions && Object.entries(users.find(u => u.id === editingPermissions)!.permissions).map(([key, val]: any) => (
                <label key={key} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl cursor-pointer hover:bg-rose-50 transition-all group">
                  <span className="text-sm font-bold text-gray-700 group-hover:text-rose-900 transition-colors">
                    {key === 'viewColleaguesSales' ? 'رؤية مبيعات الزملاء' : 
                     key === 'viewSalesHistory' ? 'رؤية سجل المبيعات' :
                     key === 'registerInventory' ? 'تسجيل المخزون' :
                     key === 'viewInventoryHistory' ? 'رؤية سجل المخزون' :
                     key === 'viewCompetitorReports' ? 'رؤية تقارير المنافسين' : 'رؤية أسعار المنافسين'}
                  </span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={val} 
                      onChange={() => togglePerm(editingPermissions, key, val)}
                    />
                    <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-700"></div>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={() => setEditingPermissions(null)} className="w-full mt-10 bg-rose-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-rose-100 hover:scale-105 transition-all">حفظ وإغلاق الصلاحيات</button>
          </div>
        </div>
      )}

      {editingCredentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-8 border-b pb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white"><Key /></div>
              <div>
                <h4 className="text-xl font-black text-rose-900">تعديل بيانات الحساب</h4>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Edit Login Credentials</p>
              </div>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">الاسم الكامل</label>
                <input 
                  className="w-full bg-slate-50 p-5 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-amber-200"
                  value={editingCredentials.employeeName}
                  onChange={e => setEditingCredentials({...editingCredentials, employeeName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">اسم المستخدم</label>
                <input 
                  className="w-full bg-slate-50 p-5 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-amber-200"
                  value={editingCredentials.username}
                  onChange={e => setEditingCredentials({...editingCredentials, username: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">كلمة المرور الجديدة</label>
                <input 
                  type="password"
                  className="w-full bg-slate-50 p-5 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-amber-200"
                  value={editingCredentials.password}
                  onChange={e => setEditingCredentials({...editingCredentials, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">تعديل الوظيفة</label>
                <select 
                  className="w-full bg-slate-50 p-5 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-amber-200"
                  value={editingCredentials.role}
                  onChange={e => setEditingCredentials({...editingCredentials, role: e.target.value as any})}
                >
                  <option value="admin">مدير (Manager)</option>
                  <option value="coordinator">منسق (Coordinator)</option>
                  <option value="usher">أشر (Usher)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={handleUpdateCredentials} className="flex-1 bg-amber-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-amber-100 hover:scale-105 transition-all flex items-center justify-center gap-3">
                <UserCheck size={20}/> تحديث البيانات
              </button>
              <button onClick={() => setEditingCredentials(null)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black hover:bg-slate-200 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {messageTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white"><MessageCircle /></div>
              <h4 className="text-xl font-black text-rose-900">إرسال رسالة للموظف</h4>
            </div>
            <textarea 
              className="w-full bg-slate-50 p-6 rounded-3xl outline-none h-48 border-2 border-transparent focus:border-blue-200 font-bold text-gray-700 leading-relaxed resize-none transition-all"
              placeholder="اكتب نص الرسالة هنا..."
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
            ></textarea>
            <div className="flex gap-4 mt-8">
              <button onClick={sendNotification} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-100 hover:scale-105 transition-all flex items-center justify-center gap-3">
                 <Send size={18}/> إرسال الآن
              </button>
              <button onClick={() => setMessageTarget(null)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black hover:bg-slate-200 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h4 className="text-xl font-black text-rose-900 mb-8">تعديل الاسم</h4>
            <input 
              className="w-full bg-slate-50 p-5 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-rose-200 mb-8"
              value={editItem.name}
              onChange={e => setEditItem({...editItem, name: e.target.value})}
            />
            <div className="flex gap-3">
              <button onClick={updateItemName} className="flex-1 bg-rose-800 text-white py-4 rounded-2xl font-black">حفظ التغيير</button>
              <button onClick={() => setEditItem(null)} className="flex-1 bg-slate-100 text-gray-500 py-4 rounded-2xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
