
import React, { useState } from 'react';
import { User, AppSettings, Market, Company, UserRole } from '../types';
import { db, ref, update, set, push, remove } from '../firebase';
import { 
  Save, UserPlus, Shield, Store, Building2, UserCog, Send, Trash2, Edit,
  Settings as SettingsIcon, Key, X, Mail, Trophy, Zap, Plus
} from 'lucide-react';

interface Props {
  user: User;
  settings: AppSettings | null;
  users: User[];
  markets: Market[];
  companies: Company[];
}

const Settings: React.FC<Props> = ({ user, settings, users = [], markets = [], companies = [] }) => {
  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 glass-card-dark rounded-[2rem]" dir="rtl">
        <Shield size={64} className="text-rose-500/20 mb-4" />
        <h3 className="text-xl font-black text-white text-right">عذراً، هذه الصفحة مخصصة للمدير فقط</h3>
      </div>
    );
  }

  const [activeSubTab, setActiveSubTab] = useState('general');
  const [newTickerText, setNewTickerText] = useState(settings?.tickerText || '');
  const [newProgramName, setNewProgramName] = useState(settings?.programName || 'Soft Rose Modern Trade');
  const [whatsapp, setWhatsapp] = useState(settings?.whatsappNumber || '');
  const [showTopSalesInTicker, setShowTopSalesInTicker] = useState(settings?.showTopSalesInTicker || false);
  const [isTickerAnimated, setIsTickerAnimated] = useState(settings?.isTickerAnimated || false);
  
  const [newUser, setNewUser] = useState({ 
    username: '', 
    password: '', 
    employeeName: '', 
    employeeCode: '', 
    role: 'coordinator' as UserRole 
  });

  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [editingCredentials, setEditingCredentials] = useState<User | null>(null);
  const [messageTarget, setMessageTarget] = useState<User | null>(null);
  const [msgText, setMsgText] = useState('');
  
  const [newItemName, setNewItemName] = useState('');

  const handleSaveGeneral = async () => {
    await update(ref(db, 'settings'), {
      tickerText: newTickerText,
      programName: newProgramName,
      whatsappNumber: whatsapp,
      showTopSalesInTicker: showTopSalesInTicker,
      isTickerAnimated: isTickerAnimated
    });
    alert("✅ تم حفظ الإعدادات بنجاح");
  };

  const handleAddItem = async (type: 'markets' | 'companies') => {
    if (!newItemName.trim()) return;
    const newRef = push(ref(db, type));
    await set(newRef, { name: newItemName.trim(), creatorId: user.id });
    setNewItemName('');
    alert("✅ تمت الإضافة بنجاح");
  };

  const handleDeleteItem = async (type: 'markets' | 'companies', id: string) => {
    if (window.confirm("⚠️ هل أنت متأكد من الحذف؟")) {
      await remove(ref(db, `${type}/${id}`));
    }
  };

  const handleUpdateCredentials = async () => {
    if (!editingCredentials) return;
    await update(ref(db, `users/${editingCredentials.id}`), {
      username: editingCredentials.username,
      password: editingCredentials.password
    });
    alert("✅ تم التحديث بنجاح");
    setEditingCredentials(null);
  };

  const handleSendMessage = async () => {
    if (!messageTarget || !msgText.trim()) return;
    await push(ref(db, 'notifications'), {
      senderId: user.id,
      receiverId: messageTarget.id,
      message: msgText,
      timestamp: new Date().toISOString(),
      isRead: false
    });
    alert("✅ تم الإرسال بنجاح");
    setMessageTarget(null);
    setMsgText('');
  };

  return (
    <div className="space-y-8 pb-20 text-right" dir="rtl">
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'general', label: 'عام', icon: <SettingsIcon size={18}/> },
          { id: 'users', label: 'الموظفين', icon: <UserCog size={18}/> },
          { id: 'markets', label: 'الماركتات', icon: <Store size={18}/> },
          { id: 'companies', label: 'المنافسين', icon: <Building2 size={18}/> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-black text-xs ${activeSubTab === tab.id ? 'bg-rose-600 text-white' : 'bg-white/5 text-white/40'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'general' && (
        <div className="glass-card-dark p-6 md:p-10 rounded-[2rem] border border-white/5">
          <h3 className="text-xl font-black text-white mb-8 border-b border-white/10 pb-4">الإعدادات العامة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mr-2">اسم البرنامج</label>
              <input className="w-full glass-input-dark rounded-xl p-4 font-bold outline-none text-sm" value={newProgramName} onChange={e => setNewProgramName(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mr-2">رقم الواتساب</label>
              <input className="w-full glass-input-dark rounded-xl p-4 font-bold outline-none text-sm" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}/>
            </div>
            <div className="md:col-span-2 space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-5 bg-rose-600/10 rounded-[1.5rem] border border-rose-500/20">
                  <div className="flex items-center gap-3">
                    <Trophy className="text-rose-400" size={24}/>
                    <span className="text-sm font-black text-white">تفعيل نجم الشهر</span>
                  </div>
                  <input type="checkbox" checked={showTopSalesInTicker} onChange={e => setShowTopSalesInTicker(e.target.checked)} className="w-5 h-5 accent-rose-600" />
                </div>
                <div className="flex items-center justify-between p-5 bg-blue-600/10 rounded-[1.5rem] border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <Zap className="text-blue-400" size={24}/>
                    <span className="text-sm font-black text-white">تحريك شريط الأخبار</span>
                  </div>
                  <input type="checkbox" checked={isTickerAnimated} onChange={e => setIsTickerAnimated(e.target.checked)} className="w-5 h-5 accent-blue-600" />
                </div>
              </div>
              <textarea className="w-full glass-input-dark rounded-xl p-4 font-bold outline-none h-24 resize-none text-sm" value={newTickerText} onChange={e => setNewTickerText(e.target.value)} />
            </div>
          </div>
          <button onClick={handleSaveGeneral} className="bg-rose-600 text-white px-10 py-4 rounded-xl font-black flex items-center gap-2">
            <Save size={18}/> حفظ الإعدادات
          </button>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-8">
          <div className="glass-card-dark p-6 md:p-10 rounded-[2.5rem]">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3"><UserPlus className="text-rose-50" /> إضافة موظف جديد</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input className="glass-input-dark p-4 rounded-xl font-bold text-sm" placeholder="الاسم" value={newUser.employeeName} onChange={e => setNewUser({...newUser, employeeName: e.target.value})}/>
              <input className="glass-input-dark p-4 rounded-xl font-bold text-sm" placeholder="الكود" value={newUser.employeeCode} onChange={e => setNewUser({...newUser, employeeCode: e.target.value})}/>
              <select className="glass-input-dark p-4 rounded-xl font-bold text-sm" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                <option value="coordinator">منسق</option>
                <option value="usher">أشر</option>
                <option value="admin">مدير</option>
              </select>
              <input className="glass-input-dark p-4 rounded-xl font-bold text-sm" placeholder="اسم المستخدم" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/>
              <input className="glass-input-dark p-4 rounded-xl font-bold text-sm" type="password" placeholder="كلمة المرور" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
            </div>
            <button onClick={async () => {
              const id = push(ref(db, 'users')).key || '';
              await set(ref(db, `users/${id}`), { ...newUser, id, permissions: { registerSales: true, viewSalesHistory: true, registerInventory: true, viewInventoryHistory: true, registerCompetitorPrices: true, viewCompetitorReports: true, viewVacationMgmt: true, viewSettings: false, viewColleaguesSales: false }, vacationBalance: { annual: 14, casual: 7, sick: 0, exams: 0, absent_with_permission: 0, absent_without_permission: 0 } });
              setNewUser({ username: '', password: '', employeeName: '', employeeCode: '', role: 'coordinator' });
              alert("تم الحفظ");
            }} className="mt-6 bg-rose-600 text-white px-10 py-4 rounded-xl font-black">إضافة الحساب</button>
          </div>
          <div className="glass-card-dark rounded-[2.5rem] overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-white/5 text-[10px] font-black text-white/40">
                <tr><th className="p-6">الموظف</th><th className="p-6 text-center">الإجراءات</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="p-6 font-bold text-white">{u.employeeName}</td>
                    <td className="p-6">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setMessageTarget(u)} className="p-2 text-amber-400 hover:bg-white/10 rounded-lg"><Mail size={16}/></button>
                        <button onClick={() => setEditingCredentials(u)} className="p-2 text-blue-400 hover:bg-white/10 rounded-lg"><Key size={16}/></button>
                        <button onClick={async () => { if(window.confirm("حذف؟")) await remove(ref(db, `users/${u.id}`)); }} className="p-2 text-red-400 hover:bg-white/10 rounded-lg"><Trash2 size={16}/></button>
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
        <div className="space-y-6">
          <div className="glass-card-dark p-6 md:p-10 rounded-[2.5rem]">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
              <Plus className="text-rose-500" /> إضافة {activeSubTab === 'markets' ? 'ماركت' : 'شركة منافسة'}
            </h3>
            <div className="flex gap-4">
              <input 
                className="flex-1 glass-input-dark p-4 rounded-xl font-bold" 
                placeholder={`اسم ${activeSubTab === 'markets' ? 'الماركت' : 'الشركة'} الجديد...`} 
                value={newItemName} 
                onChange={e => setNewItemName(e.target.value)} 
              />
              <button onClick={() => handleAddItem(activeSubTab as any)} className="bg-rose-600 text-white px-8 py-4 rounded-xl font-black">إضافة</button>
            </div>
          </div>
          <div className="glass-card-dark rounded-[2.5rem] overflow-hidden">
            <div className="divide-y divide-white/5">
              {(activeSubTab === 'markets' ? markets : companies).map(item => (
                <div key={item.id} className="p-6 flex justify-between items-center hover:bg-white/5 transition-all">
                  <span className="font-bold text-white">{item.name}</span>
                  <button onClick={() => handleDeleteItem(activeSubTab as any, item.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {messageTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="glass-card-dark rounded-[3rem] p-8 max-w-md w-full border border-white/10">
            <h4 className="text-xl font-black text-white mb-6">مراسلة {messageTarget.employeeName}</h4>
            <textarea className="w-full glass-input-dark p-4 rounded-xl font-bold outline-none h-32 resize-none" placeholder="نص الرسالة..." value={msgText} onChange={e => setMsgText(e.target.value)}/>
            <div className="flex gap-3 mt-8">
              <button onClick={handleSendMessage} className="flex-1 bg-rose-600 text-white py-4 rounded-xl font-black">إرسال</button>
              <button onClick={() => setMessageTarget(null)} className="flex-1 bg-white/5 text-white/40 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingCredentials && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="glass-card-dark rounded-[3rem] p-8 max-w-md w-full border border-white/10">
            <h4 className="text-xl font-black text-white mb-6">تحديث بيانات {editingCredentials.employeeName}</h4>
            <div className="space-y-4">
              <input className="w-full glass-input-dark p-4 rounded-xl font-bold" placeholder="اسم المستخدم" value={editingCredentials.username} onChange={e => setEditingCredentials({...editingCredentials, username: e.target.value})}/>
              <input type="password" className="w-full glass-input-dark p-4 rounded-xl font-bold" placeholder="الباسورد الجديد" value={editingCredentials.password} onChange={e => setEditingCredentials({...editingCredentials, password: e.target.value})}/>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdateCredentials} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black">تحديث</button>
              <button onClick={() => setEditingCredentials(null)} className="flex-1 bg-white/5 text-white/40 py-4 rounded-xl font-black">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
