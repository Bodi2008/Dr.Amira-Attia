import React, { useState, useEffect } from 'react';
import { X, Save, Calendar as CalendarIcon, Clock, Info, ChevronRight, ChevronLeft, Building, Video, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfToday, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isSameDay, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (booking: any) => void;
  initialData?: {
    patientName?: string;
    phone?: string;
  };
  bookingToEdit?: any;
}

const ALL_SLOTS = [
  '08:00 ص', '09:00 ص', '10:00 ص', '11:00 ص', 
  '12:00 م', '01:00 م', '02:00 م', '03:00 م', 
  '04:00 م', '05:00 م', '06:00 م', '07:00 م'
];

const qatarTimeMap: Record<string, string> = {
  '08:00 ص': '09:00 ص',
  '09:00 ص': '10:00 ص',
  '10:00 ص': '11:00 ص',
  '11:00 ص': '12:00 م',
  '12:00 م': '01:00 م',
  '01:00 م': '02:00 م',
  '02:00 م': '03:00 م',
  '03:00 م': '04:00 م',
  '04:00 م': '05:00 م',
  '05:00 م': '06:00 م',
  '06:00 م': '07:00 م',
  '07:00 م': '08:00 م'
};

export default function ManualBookingModal({ isOpen, onClose, onSuccess, initialData, bookingToEdit }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schedule, setSchedule] = useState<any>({ egyptCenter: {}, qatarCenter: {}, online: {} });
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(startOfToday()));
  const [editSeries, setEditSeries] = useState(false);

  const [formData, setFormData] = useState({
    patientName: bookingToEdit?.patientName || initialData?.patientName || '',
    phone: bookingToEdit?.phone || initialData?.phone || '',
    date: bookingToEdit?.date || '',
    time: bookingToEdit?.time || '',
    sessionType: bookingToEdit?.sessionType || 'in-center',
    country: bookingToEdit?.country || 'egypt',
    location: bookingToEdit?.location || 'new-cairo',
    notes: bookingToEdit?.notes || 'حجز يدوي من الإدارة'
  });

  const [settings, setSettings] = useState<any>(null);

  // Reset form when modal opens or initialData/bookingToEdit changes
  useEffect(() => {
    if (isOpen) {
      setEditSeries(false);
      setFormData({
        patientName: bookingToEdit?.patientName || initialData?.patientName || '',
        phone: bookingToEdit?.phone || initialData?.phone || '',
        date: bookingToEdit?.date || '',
        time: bookingToEdit?.time || '',
        sessionType: bookingToEdit?.sessionType || 'in-center',
        country: bookingToEdit?.country || 'egypt',
        location: bookingToEdit?.location || 'new-cairo',
        notes: bookingToEdit?.notes || 'حجز يدوي من الإدارة'
      });
      
      if (bookingToEdit?.date) {
        setCurrentMonth(startOfMonth(parseISO(bookingToEdit.date)));
      } else {
        setCurrentMonth(startOfMonth(startOfToday()));
      }
      
      // Fetch schedule and bookings
      setLoadingSchedule(true);
      Promise.all([
        fetch('/api/schedule').then(res => res.json()),
        fetch('/api/bookings').then(res => res.json()),
        fetch('/api/settings').then(res => res.json())
      ]).then(([scheduleData, bookingsData, settingsData]) => {
        setSchedule(scheduleData.schedule || { egyptCenter: {}, qatarCenter: {}, online: {} });
        setBookings(bookingsData.bookings || []);
        setSettings(settingsData.settings || null);
        setLoadingSchedule(false);
      });
    }
  }, [isOpen, initialData, bookingToEdit]);

  const today = startOfToday();
  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDayOfWeek = (getDay(startOfMonth(currentMonth)) + 1) % 7; // Adjust for Saturday start
  const blanks = Array.from({ length: startDayOfWeek }).map((_, i) => i);

  const isTimePast = (date: Date, timeStr: string) => {
    const now = new Date();
    if (!isSameDay(date, now)) return false;
    
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'م' && hours !== 12) hours += 12;
    if (period === 'ص' && hours === 12) hours = 0;
    
    const slotDate = new Date(date);
    slotDate.setHours(hours, minutes, 0, 0);
    
    return isBefore(slotDate, now);
  };

  const getSlotStatus = (date: Date, slot: string) => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    if (isTimePast(date, slot)) return 'unavailable';
    
    // Default to holiday (active: false, slots: [])
    let isActive = false;
    let availableSlots: string[] = [];
    
    // Determine the correct schedule key
    let typeKey = formData.sessionType === 'in-center' ? `in-center_${formData.country}_${formData.location}` : formData.sessionType;
    
    // Fallback for old data structure if needed
    if (!schedule[typeKey]) {
      if (formData.sessionType === 'online' && schedule['online']) typeKey = 'online';
      else if (formData.sessionType === 'in-center' && formData.country === 'egypt' && schedule['egyptCenter']) typeKey = 'egyptCenter';
      else if (formData.sessionType === 'in-center' && formData.country === 'qatar' && schedule['qatarCenter']) typeKey = 'qatarCenter';
      else if (formData.sessionType === 'in-center') typeKey = `in-center_${formData.country}`; // fallback to country level if branch level doesn't exist
    }

    const override = schedule[typeKey]?.[dateString];
    
    if (override) {
      isActive = override.active;
      availableSlots = override.slots;
    } else if (typeKey === 'online') {
      // Default online schedule: active all days except Thursday (4) and Friday (5)
      const dayOfWeek = getDay(date);
      if (dayOfWeek !== 4 && dayOfWeek !== 5) {
        isActive = true;
        availableSlots = settings?.timeSlots || ALL_SLOTS;
      }
    }
    
    if (!isActive || !availableSlots.includes(slot)) return 'unavailable';
    
    const booking = bookings.find(b => 
      b.date === dateString && 
      b.time === slot && 
      b.status !== 'cancelled' &&
      b.sessionType === formData.sessionType &&
      (formData.sessionType === 'online' || (b.country === formData.country && (formData.sessionType !== 'in-center' || b.location === formData.location)))
    );
    
    if (booking) {
      return 'booked';
    }
    
    return 'available';
  };

  const hasAnyAvailableSlots = (date: Date) => {
    return ALL_SLOTS.some(slot => getSlotStatus(date, slot) === 'available');
  };

  const handlePrevMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    if (!isBefore(endOfMonth(prevMonth), today)) {
      setCurrentMonth(prevMonth);
    }
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = bookingToEdit ? 'PUT' : 'POST';
      const body = bookingToEdit ? { ...bookingToEdit, ...formData, editSeries } : formData;

      const response = await fetch('/api/bookings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء حفظ الحجز');
      }

      toast.success(bookingToEdit ? 'تم تعديل الحجز بنجاح' : 'تم إضافة الحجز بنجاح');
      onSuccess(data.booking);
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{bookingToEdit ? 'تعديل موعد الحجز' : 'إضافة حجز يدوي'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم المريض</label>
              <input required type="text" name="patientName" value={formData.patientName} onChange={handleChange} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف</label>
              <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} dir="ltr" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all text-right placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
            
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الدولة</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, country: 'egypt', sessionType: 'in-center', location: '' })}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                      formData.country === 'egypt' 
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <span className="text-2xl mt-1">🇪🇬</span>
                    <span className="font-bold text-sm">مصر</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, country: 'qatar', sessionType: 'online', location: '' })}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                      formData.country === 'qatar' 
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <span className="text-2xl mt-1">🇶🇦</span>
                    <span className="font-bold text-sm">قطر</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نوع الجلسة</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, sessionType: 'in-center', location: '' })}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.sessionType === 'in-center' 
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <Building className="w-5 h-5 mt-1" />
                    <span className="font-bold text-sm">في المركز</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, sessionType: 'online', location: '' })}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.sessionType === 'online' 
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <Video className="w-5 h-5 mt-1" />
                    <span className="font-bold text-sm">أونلاين</span>
                  </button>
                </div>
              </div>

              {formData.sessionType === 'in-center' && formData.country === 'egypt' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الفرع</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, location: 'new-cairo' })}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.location === 'new-cairo' 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <MapPin className="w-5 h-5 mt-1" />
                      <span className="font-bold text-sm">التجمع الخامس</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, location: 'madinaty' })}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.location === 'madinaty' 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <MapPin className="w-5 h-5 mt-1" />
                      <span className="font-bold text-sm">مدينتي</span>
                    </button>
                  </div>
                </div>
              )}
              {formData.sessionType === 'in-center' && formData.country === 'qatar' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الفرع</label>
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, location: 'doha' })}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.location === 'doha' 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <MapPin className="w-5 h-5 mt-1" />
                      <span className="font-bold text-sm">الدوحة</span>
                    </button>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ملاحظات</label>
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleChange} 
                  placeholder="ملاحظات إضافية..."
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
                  rows={3}
                />
              </div>
            </div>

            {bookingToEdit?.seriesId && (
              <div className="col-span-1 md:col-span-2 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSeries}
                    onChange={(e) => setEditSeries(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 dark:text-indigo-500 rounded focus:ring-indigo-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                  <div>
                    <div className="font-bold text-indigo-900 dark:text-indigo-300">تعديل جميع الحجوزات المستقبلية المرتبطة</div>
                    <div className="text-sm text-indigo-700 dark:text-indigo-400">سيتم تطبيق هذا التعديل على جميع الحجوزات القادمة في هذا الحجز المستمر</div>
                  </div>
                </label>
              </div>
            )}

            <div className="col-span-1 md:col-span-2 border-t border-gray-100 dark:border-gray-800 pt-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">اختر الموعد</label>
              
              {loadingSchedule ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">جاري تحميل المواعيد المتاحة...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <button 
                        type="button"
                        onClick={handlePrevMonth} 
                        disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), today)}
                        className="p-2 rounded-xl hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {format(currentMonth, 'MMMM yyyy', { locale: ar })}
                      </h3>
                      <button 
                        type="button"
                        onClick={handleNextMonth}
                        className="p-2 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'].map(day => (
                        <div key={day} className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {blanks.map(blank => (
                        <div key={`blank-${blank}`} className="aspect-square"></div>
                      ))}
                      {monthDays.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const isSelected = formData.date === dateStr;
                        const isPast = isBefore(date, today);
                        const hasSlots = !isPast && hasAnyAvailableSlots(date);
                        const isToday = isSameDay(date, today);

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={isPast || !hasSlots}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, date: dateStr, time: '' }));
                            }}
                            className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                              isSelected 
                                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md' 
                                : isPast 
                                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                  : hasSlots
                                    ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-100 dark:border-gray-700'
                                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-100/50 dark:bg-gray-800/30'
                            } ${isToday && !isSelected ? 'border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-500' : ''}`}
                          >
                            {format(date, 'd')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {formData.date && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                        الأوقات المتاحة
                      </h4>
                      
                      {formData.country === 'qatar' && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-xl text-xs font-medium border border-blue-100 dark:border-blue-800/50 flex items-start gap-2 mb-4">
                          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <p>المواعيد بتوقيت قطر (متقدمة ساعة عن مصر).</p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {(settings?.timeSlots || ALL_SLOTS).map((time: string) => {
                          const status = getSlotStatus(parseISO(formData.date), time);
                          const isSelected = formData.time === time;
                          const isDisabled = status !== 'available';
                          const displayTime = formData.country === 'qatar' ? (qatarTimeMap[time] || time) : time;
                          
                          let buttonClass = '';
                          let label = displayTime;
                          
                          if (status === 'booked') {
                            buttonClass = 'border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60 line-through';
                            label = 'محجوز';
                          } else if (isSelected) {
                            buttonClass = 'border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500 text-white shadow-md';
                          } else if (isDisabled) {
                            buttonClass = 'border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60';
                          } else {
                            buttonClass = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 text-gray-700 dark:text-gray-300';
                          }

                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => setFormData(prev => ({ ...prev, time }))}
                              className={`p-2 rounded-lg border-2 text-sm font-bold transition-all duration-200 ${buttonClass}`}
                            >
                              <span dir="ltr">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                      
                      {!hasAnyAvailableSlots(parseISO(formData.date)) && (
                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 mt-4">
                          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">عذراً، لا توجد مواعيد متاحة في هذا اليوم.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={isSubmitting || !formData.date || !formData.time} className="flex-[2] py-3 px-4 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {isSubmitting ? 'جاري الإضافة...' : (
                <>
                  <Save className="w-5 h-5" />
                  حفظ الحجز
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
