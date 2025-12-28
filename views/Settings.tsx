
import React, { useState } from 'react';
import { User, AppSettings } from '../types';
import { db, ref, update, set, push, remove } from '../firebase';
import { Save, UserPlus, Shield, MessageCircle, AlertCircle } from 'lucide-react';

interface Props {
  user: User;
  settings: AppSettings | null;
  users: User[];
}

const Settings: React.FC<Props> = ({ user, settings, users }) => {
  const [newTickerText, setNewTickerText] = useState(settings?.tickerText || '');
  const [whatsapp, setWhatsapp] = useState(settings?.whatsappNumber || '');
  const [newUser, setNewUser] = useState({ username: '', password: '', employeeName: '', role: 'user' as const });

  const handleSaveSettings = async () => {
    await update(ref(db, 'settings'), {
      tickerText: newTickerText,
      whatsappNumber: whatsapp
    });
    alert("تم حفظ الإعدادات");
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    const usersRef = ref(db, 'users');
    const newId = push(usersRef).key || '';
    await set(ref(db, `users/${newId}`), {
      ...newUser,
      id: newId,
      isOnline: false,
      canSeeAllSales: false,
      vacationBalance: { annual: 21, casual: 7, sick: 15, exams: 0 }
    });
    setNewUser({ username: '', password: '', employeeName: '', role: 'user' });
    alert("تم إضافة المستخدم");
  };

  const togglePermission = async (targetUser: User) => {
    await update(ref(db, `users/${targetUser.id}`), {
      canSeeAllSales: !targetUser.canSeeAllSales
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold text-rose-800 mb-6 flex items-center gap-2">
          <Shield className="text-rose-600"/> إعدادات النظام
        </h2>
        
        <div className="space-y-6">
          {/* Ticker Settings */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-bold mb-3">إعدادات الشريط المتحرك (Ticker)</h3>
            <textarea 
              className="w-full border rounded-lg p-3 h-24 mb-3"
              placeholder="اكتب النص الذي سيظهر في الشريط المتحرك..."
              value={newTickerText}
              onChange={(e) => setNewTickerText(e.target.value)}
            />
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" defaultChecked={settings?.showDailySalesTicker}/>
                <span>ظهور المبيعات اليومية</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" defaultChecked={settings?.showMonthlySalesTicker}/>
                <span>ظهور المبيعات الشهرية</span>
              </label>
            </div>
          </div>

          {/* WhatsApp Settings */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-bold mb-3">إعدادات واتساب</h3>
            <div className="flex gap-2">
              <input 
                type="text" className="flex-1 border rounded-lg p-2"
                placeholder="رقم الواتس اب (مثال: 201234567890)"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          </div>

          <button 
            onClick={handleSaveSettings}
            className="bg-rose-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-rose-700 flex items-center gap-2"
          >
            <Save size={20}/> حفظ الإعدادات
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold text-rose-800 mb-6 flex items-center gap-2">
          <UserPlus className="text-rose-600"/> إدارة الحسابات
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8 bg-slate-50 p-4 rounded-lg">
          <input 
            className="border rounded p-2" placeholder="اسم المستخدم"
            value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})}
          />
          <input 
            type="password" className="border rounded p-2" placeholder="كلمة المرور"
            value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})}
          />
          <input 
            className="border rounded p-2" placeholder="اسم الموظف"
            value={newUser.employeeName} onChange={(e) => setNewUser({...newUser, employeeName: e.target.value})}
          />
          <select 
            className="border rounded p-2"
            value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
          >
            <option value="user">مستخدم عادي</option>
            <option value="admin">مدير (Admin)</option>
          </select>
          <button onClick={handleAddUser} className="bg-blue-600 text-white p-2 rounded col-span-1 md:col-span-4 font-bold">إضافة مستخدم جديد</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-right">
                <th className="p-3">الموظف</th>
                <th className="p-3">الصلاحية</th>
                <th className="p-3">رؤية الكل</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{u.employeeName}</td>
                  <td className="p-3">{u.role === 'admin' ? 'مدير' : 'موظف'}</td>
                  <td className="p-3 text-center">
                    <input 
                      type="checkbox" 
                      checked={u.canSeeAllSales} 
                      onChange={() => togglePermission(u)}
                      disabled={u.role === 'admin'}
                    />
                  </td>
                  <td className="p-3">
                    <span className={`flex items-center gap-2 ${u.isOnline ? 'text-blue-600' : 'text-red-600'}`}>
                      <span className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-blue-600' : 'bg-red-600'}`}></span>
                      {u.isOnline ? 'متصل' : 'أوفلاين'}
                    </span>
                  </td>
                  <td className="p-3 flex justify-center gap-2">
                    <button className="text-blue-500 hover:bg-blue-50 p-1 rounded"><AlertCircle size={18}/></button>
                    <button onClick={() => remove(ref(db, `users/${u.id}`))} className="text-red-500 hover:bg-red-50 p-1 rounded"><remove size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Settings;
