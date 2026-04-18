'use client';
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Check, X, Power } from 'lucide-react';
import { toast } from 'sonner';

type ModalType = 'addBranch' | 'editBranch' | 'deleteBranch' | 
                 'addSessionType' | 'editSessionType' | 'deleteSessionType' | 
                 'addCountry' | 'editCountry' | 'deleteCountry' | 
                 'addTimeSlot' | 'editTimeSlot' | 'deleteTimeSlot' | null;

export default function SettingsManager() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [modal, setModal] = useState<{ type: ModalType, data?: any }>({ type: null });
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data.settings);
    } catch (error) {
      toast.error('فشل في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: any) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error();
      setSettings(newSettings);
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const openModal = (type: ModalType, data?: any) => {
    setModal({ type, data });
    if (type === 'addBranch') setFormData({ name: '', countryId: 'egypt' });
    if (type === 'editBranch') setFormData({ name: data.name, countryId: data.countryId });
    if (type === 'addSessionType') setFormData({ name: '', availableIn: 'egypt,qatar' });
    if (type === 'editSessionType') setFormData({ name: data.name, availableIn: data.availableIn.join(',') });
    if (type === 'addCountry') setFormData({ name: '', flag: '', whatsappNumber: '' });
    if (type === 'editCountry') setFormData({ name: data.name, flag: data.flag, whatsappNumber: data.whatsappNumber || '' });
    if (type === 'addTimeSlot') setFormData({ time: '' });
    if (type === 'editTimeSlot') setFormData({ time: data.time, oldTime: data.time });
  };

  const closeModal = () => {
    setModal({ type: null });
    setFormData({});
  };

  const handleConfirm = () => {
    let newSettings = { ...settings };
    
    switch (modal.type) {
      case 'addBranch':
        if (!formData.name) return toast.error('يرجى إدخال اسم الفرع');
        newSettings.branches.push({
          id: formData.name.toLowerCase().replace(/\s+/g, '-'),
          name: formData.name,
          countryId: formData.countryId,
          isActive: true
        });
        break;
      case 'editBranch':
        if (!formData.name) return toast.error('يرجى إدخال اسم الفرع');
        newSettings.branches = newSettings.branches.map((b: any) => 
          b.id === modal.data.id ? { ...b, name: formData.name, countryId: formData.countryId } : b
        );
        break;
      case 'deleteBranch':
        newSettings.branches = newSettings.branches.filter((b: any) => b.id !== modal.data.id);
        break;
        
      case 'addSessionType':
        if (!formData.name) return toast.error('يرجى إدخال اسم الجلسة');
        newSettings.sessionTypes.push({
          id: formData.name.toLowerCase().replace(/\s+/g, '-'),
          name: formData.name,
          icon: 'Video',
          availableIn: formData.availableIn.split(',').map((s: string) => s.trim()).filter(Boolean),
          isActive: true
        });
        break;
      case 'editSessionType':
        if (!formData.name) return toast.error('يرجى إدخال اسم الجلسة');
        newSettings.sessionTypes = newSettings.sessionTypes.map((s: any) => 
          s.id === modal.data.id ? { 
            ...s, 
            name: formData.name, 
            availableIn: formData.availableIn.split(',').map((str: string) => str.trim()).filter(Boolean) 
          } : s
        );
        break;
      case 'deleteSessionType':
        newSettings.sessionTypes = newSettings.sessionTypes.filter((s: any) => s.id !== modal.data.id);
        break;

      case 'addCountry':
        if (!formData.name || !formData.flag) return toast.error('يرجى إدخال اسم وعلم الدولة');
        newSettings.countries.push({
          id: formData.name.toLowerCase().replace(/\s+/g, '-'),
          name: formData.name,
          flag: formData.flag,
          whatsappNumber: formData.whatsappNumber || '',
          isActive: true
        });
        break;
      case 'editCountry':
        if (!formData.name || !formData.flag) return toast.error('يرجى إدخال اسم وعلم الدولة');
        newSettings.countries = newSettings.countries.map((c: any) => 
          c.id === modal.data.id ? { ...c, name: formData.name, flag: formData.flag, whatsappNumber: formData.whatsappNumber || '' } : c
        );
        break;
      case 'deleteCountry':
        newSettings.countries = newSettings.countries.filter((c: any) => c.id !== modal.data.id);
        break;

      case 'addTimeSlot':
        if (!formData.time) return toast.error('يرجى إدخال الوقت');
        if (!newSettings.timeSlots) newSettings.timeSlots = [];
        newSettings.timeSlots.push(formData.time);
        break;
      case 'editTimeSlot':
        if (!formData.time) return toast.error('يرجى إدخال الوقت');
        newSettings.timeSlots = newSettings.timeSlots.map((t: string) => 
          t === formData.oldTime ? formData.time : t
        );
        break;
      case 'deleteTimeSlot':
        newSettings.timeSlots = newSettings.timeSlots.filter((t: string) => t !== modal.data.time);
        break;
    }

    saveSettings(newSettings);
    closeModal();
  };

  const toggleBranch = (id: string) => {
    const newSettings = {
      ...settings,
      branches: settings.branches.map((b: any) => 
        b.id === id ? { ...b, isActive: !b.isActive } : b
      )
    };
    saveSettings(newSettings);
  };

  const toggleSessionType = (id: string) => {
    const newSettings = {
      ...settings,
      sessionTypes: settings.sessionTypes.map((s: any) => 
        s.id === id ? { ...s, isActive: !s.isActive } : s
      )
    };
    saveSettings(newSettings);
  };

  const toggleCountry = (id: string) => {
    const newSettings = {
      ...settings,
      countries: settings.countries.map((c: any) => 
        c.id === id ? { ...c, isActive: !c.isActive } : c
      )
    };
    saveSettings(newSettings);
  };

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!settings) return null;

  return (
    <div className="space-y-8 relative">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            إعدادات الفروع
          </h2>
          <button
            onClick={() => openModal('addBranch')}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            إضافة فرع
          </button>
        </div>

        <div className="grid gap-4">
          {settings.branches.map((branch: any) => (
            <div key={branch.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{branch.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {settings.countries.find((c: any) => c.id === branch.countryId)?.name || branch.countryId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal('editBranch', branch)}
                  className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                  title="تعديل"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleBranch(branch.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    branch.isActive 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={branch.isActive ? 'إيقاف مؤقت' : 'تفعيل'}
                >
                  <Power className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openModal('deleteBranch', branch)}
                  className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            إعدادات أنواع الجلسات
          </h2>
          <button
            onClick={() => openModal('addSessionType')}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            إضافة نوع جلسة
          </button>
        </div>
        <div className="grid gap-4">
          {settings.sessionTypes.map((session: any) => (
            <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{session.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  متاح في: {session.availableIn.map((cId: string) => settings.countries.find((c: any) => c.id === cId)?.name || cId).join('، ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal('editSessionType', session)}
                  className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                  title="تعديل"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleSessionType(session.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    session.isActive 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={session.isActive ? 'إيقاف مؤقت' : 'تفعيل'}
                >
                  <Power className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openModal('deleteSessionType', session)}
                  className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            إعدادات الدول
          </h2>
          <button
            onClick={() => openModal('addCountry')}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            إضافة دولة
          </button>
        </div>
        <div className="grid gap-4">
          {settings.countries.map((country: any) => (
            <div key={country.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{country.flag}</span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{country.name}</h3>
                  {country.whatsappNumber && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1" dir="ltr">📞 {country.whatsappNumber}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal('editCountry', country)}
                  className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                  title="تعديل"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleCountry(country.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    country.isActive 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={country.isActive ? 'إيقاف مؤقت' : 'تفعيل'}
                >
                  <Power className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openModal('deleteCountry', country)}
                  className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            إعدادات المواعيد الافتراضية
          </h2>
          <button
            onClick={() => openModal('addTimeSlot')}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            إضافة موعد
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {settings.timeSlots?.map((time: string) => (
            <div key={time} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white" dir="ltr">{time}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openModal('editTimeSlot', { time })}
                  className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                  title="تعديل"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openModal('deleteTimeSlot', { time, name: time })}
                  className="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal.type && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-colors">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {modal.type === 'addBranch' && 'إضافة فرع جديد'}
                {modal.type === 'editBranch' && 'تعديل الفرع'}
                {modal.type === 'deleteBranch' && 'حذف الفرع'}
                {modal.type === 'addSessionType' && 'إضافة نوع جلسة'}
                {modal.type === 'editSessionType' && 'تعديل نوع الجلسة'}
                {modal.type === 'deleteSessionType' && 'حذف نوع الجلسة'}
                {modal.type === 'addCountry' && 'إضافة دولة'}
                {modal.type === 'editCountry' && 'تعديل الدولة'}
                {modal.type === 'deleteCountry' && 'حذف الدولة'}
                {modal.type === 'addTimeSlot' && 'إضافة موعد'}
                {modal.type === 'editTimeSlot' && 'تعديل الموعد'}
                {modal.type === 'deleteTimeSlot' && 'حذف الموعد'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {(modal.type === 'addBranch' || modal.type === 'editBranch') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الفرع</label>
                    <input 
                      type="text" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدولة</label>
                    <select
                      value={formData.countryId || 'egypt'}
                      onChange={e => setFormData({...formData, countryId: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {settings.countries.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {(modal.type === 'addSessionType' || modal.type === 'editSessionType') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الجلسة</label>
                    <input 
                      type="text" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدول المتاحة (مفصولة بفاصلة)</label>
                    <input 
                      type="text" 
                      value={formData.availableIn || ''} 
                      onChange={e => setFormData({...formData, availableIn: e.target.value})}
                      placeholder="egypt,qatar"
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">معرفات الدول: {settings.countries.map((c: any) => c.id).join(', ')}</p>
                  </div>
                </>
              )}

              {(modal.type === 'addCountry' || modal.type === 'editCountry') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الدولة</label>
                    <input 
                      type="text" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">علم الدولة (إيموجي)</label>
                    <input 
                      type="text" 
                      value={formData.flag || ''} 
                      onChange={e => setFormData({...formData, flag: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الواتساب (مع كود الدولة)</label>
                    <input 
                      type="text" 
                      value={formData.whatsappNumber || ''} 
                      onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                      placeholder="مثال: 201234567890"
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      dir="ltr"
                    />
                  </div>
                </>
              )}

              {(modal.type === 'addTimeSlot' || modal.type === 'editTimeSlot') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوقت</label>
                  <input 
                    type="text" 
                    value={formData.time || ''} 
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    placeholder="مثال: 08:00 ص"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    dir="ltr"
                  />
                </div>
              )}

              {modal.type?.startsWith('delete') && (
                <p className="text-gray-700">هل أنت متأكد من رغبتك في حذف <strong>{modal.data?.name || modal.data?.time}</strong>؟ لا يمكن التراجع عن هذا الإجراء.</p>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3 justify-end bg-gray-50">
              <button 
                onClick={closeModal} 
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={handleConfirm} 
                className={`px-4 py-2 text-white font-medium rounded-lg transition-colors ${
                  modal.type?.startsWith('delete') ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {modal.type?.startsWith('delete') ? 'حذف' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
