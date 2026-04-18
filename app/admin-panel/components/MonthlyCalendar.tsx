import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Booking {
  id: string;
  patientName: string;
  phone: string;
  country: string;
  sessionType: string;
  location?: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  paymentStatus?: 'paid' | 'unpaid';
  price?: number;
  currency?: string;
  referenceNumber: string;
  createdAt: string;
}

interface MonthlyCalendarProps {
  bookings: Booking[];
  onUpdate: (bookings: Booking[]) => void;
  schedule: any;
}

interface DayCell {
  date: string | null;
  day: number;
  isCurrentMonth: boolean;
  bookings: Booking[];
}

const ALL_SLOTS = [
  '08:00 ص', '09:00 ص', '10:00 ص', '11:00 ص', 
  '12:00 م', '01:00 م', '02:00 م', '03:00 م', 
  '04:00 م', '05:00 م', '06:00 م', '07:00 م'
];

const getCurrentTime = () => {
  const now = new Date();
  const egyptTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const qatarTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Qatar" }));
  
  return {
    egypt: egyptTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }),
    qatar: qatarTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
};

const getNextHour = (hour: string) => {
  const hourNum = parseInt(hour.split(':')[0]);
  const period = hour.includes('ص') ? 'ص' : 'م';
  let nextHour = hourNum + 1;
  
  if (nextHour === 12 && period === 'ص') {
    return '12:00 م';
  } else if (nextHour === 13 && period === 'م') {
    return '01:00 م';
  } else if (nextHour > 12) {
    nextHour = 1;
  }
  
  const nextPeriod = (period === 'ص' && hourNum >= 11) ? 'م' : period;
  const formattedHour = nextHour.toString().padStart(2, '0');
  return `${formattedHour}:00 ${nextPeriod}`;
};

const convertTo12Hour = (time: string) => {
  return time; // Already in 12-hour format in our app
};

export default function MonthlyCalendar({ bookings, onUpdate, schedule }: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newBookingDate, setNewBookingDate] = useState<string | null>(null);
  const [newBookingTime, setNewBookingTime] = useState('');
  const [newBookingName, setNewBookingName] = useState('');
  const [newBookingPhone, setNewBookingPhone] = useState('');
  const [newBookingCountry, setNewBookingCountry] = useState<'egypt' | 'qatar'>('egypt');
  const [newBookingSessionType, setNewBookingSessionType] = useState<'online' | 'in-center'>('online');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<Booking['status']>('pending');
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const activeOverlayRef = useRef<HTMLDivElement | null>(null);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const firstDayOfWeek = firstDay.getDay();
    const saturdayIndex = 6;
    const startingDayOffset = (firstDayOfWeek - saturdayIndex + 7) % 7;

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = Array.from({ length: startingDayOffset }, (_, i) => ({
      date: null,
      day: prevMonthLastDay - startingDayOffset + i + 1,
      isCurrentMonth: false,
      bookings: [] as Booking[],
    }));

    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayBookings = bookings.filter((b) => b.date === dateStr);

      return {
        date: dateStr,
        day,
        isCurrentMonth: true,
        bookings: dayBookings,
      };
    });

    const totalCells = prevMonthDays.length + currentMonthDays.length;
    const nextMonthDays = Array.from({ length: 42 - totalCells }, (_, i) => ({
      date: null,
      day: i + 1,
      isCurrentMonth: false,
      bookings: [] as Booking[],
    }));

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays] as DayCell[];
  }, [currentDate, bookings]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (activeOverlayRef.current && activeOverlayRef.current.contains(e.target as Node)) return;
      setNewBookingDate(null);
      setEditingId(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(
    currentDate
  );

  const dayNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  const monthStats = useMemo(() => {
    const monthBookings = bookings.filter((b: any) => {
      const bookingDate = new Date(b.date);
      return (
        bookingDate.getFullYear() === currentDate.getFullYear() &&
        bookingDate.getMonth() === currentDate.getMonth()
      );
    });

    const uniqueBookingsMap = new Map();
    monthBookings.forEach((b: any) => {
      if (b.seriesId) {
        if (!uniqueBookingsMap.has(b.seriesId)) {
          uniqueBookingsMap.set(b.seriesId, b);
        }
      } else {
        uniqueBookingsMap.set(b.id, b);
      }
    });

    return { totalSessions: uniqueBookingsMap.size };
  }, [currentDate, bookings]);

  const isSlotTakenLocal = (date: string, time: string, sessionType: string, country: string, location?: string) =>
    bookings.some((b) => 
      b.status !== 'cancelled' && 
      b.date === date && 
      b.time === time &&
      b.sessionType === sessionType &&
      (sessionType === 'online' || (b.country === country && (sessionType !== 'in-center' || b.location === location)))
    );

  const getWorkingHoursForDate = (dateStr: string, sessionType: string, country: string) => {
    const location = country === 'egypt' ? 'new-cairo' : 'doha';
    let typeKey = sessionType === 'in-center' ? `in-center_${country}_${location}` : sessionType;
    
    if (!schedule[typeKey]) {
      if (sessionType === 'online' && schedule['online']) typeKey = 'online';
      else if (sessionType === 'in-center' && country === 'egypt' && schedule['egyptCenter']) typeKey = 'egyptCenter';
      else if (sessionType === 'in-center' && country === 'qatar' && schedule['qatarCenter']) typeKey = 'qatarCenter';
      else if (sessionType === 'in-center') typeKey = `in-center_${country}`;
    }

    const override = schedule[typeKey]?.[dateStr];
    if (override) {
      return override.active ? override.slots : [];
    } else if (typeKey === 'online') {
      const dayOfWeek = new Date(dateStr).getDay();
      if (dayOfWeek !== 4 && dayOfWeek !== 5) {
        return ALL_SLOTS;
      }
    }
    return [];
  };

  const handleQuickAdd = async (dateStr: string) => {
    if (!newBookingTime || !newBookingName || !newBookingPhone) {
      toast.error('برجاء إدخال الاسم ورقم الهاتف والوقت');
      return;
    }

    const country = newBookingCountry;
    const sessionType = country === 'qatar' ? 'online' : newBookingSessionType;
    const hours = getWorkingHoursForDate(dateStr, sessionType, country);
    
    if (!hours.includes(newBookingTime)) {
      toast.error('الوقت المحدد ليس ضمن ساعات العمل');
      return;
    }

    setIsSaving(true);
    try {
      const location = country === 'egypt' ? 'new-cairo' : 'doha';
      const newBooking = {
        date: dateStr,
        time: newBookingTime,
        patientName: newBookingName,
        phone: newBookingPhone,
        country,
        sessionType,
        location,
        status: 'pending',
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      });

      if (!res.ok) throw new Error('Failed to save');
      
      const data = await res.json();
      onUpdate([...bookings, data.booking]);
      
      setNewBookingTime('');
      setNewBookingName('');
      setNewBookingPhone('');
      setNewBookingDate(null);
      toast.success('تم إضافة الحجز بنجاح');
    } catch (error) {
      console.error('Error adding booking:', error);
      toast.error('فشل إضافة الحجز');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (booking: Booking) => {
    setEditingId(booking.id);
    setEditTime(booking.time);
    setEditName(booking.patientName);
    setEditPhone(booking.phone);
    setEditStatus(booking.status);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editTime || !editName || !editPhone) {
      toast.error('برجاء إدخال الاسم ورقم الهاتف والوقت');
      return;
    }
    
    const bookingToUpdate = bookings.find(b => b.id === editingId);
    if (!bookingToUpdate) return;

    try {
      const updatedBooking = { ...bookingToUpdate, time: editTime, patientName: editName, phone: editPhone, status: editStatus };
      
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBooking),
      });

      if (!res.ok) throw new Error('Failed to update');

      const updated = bookings.map((b) => b.id === editingId ? updatedBooking : b);
      onUpdate(updated);
      toast.success('تم تعديل الحجز');
      setEditingId(null);
    } catch (error) {
      toast.error('حدث خطأ أثناء التعديل');
    }
  };

  const deleteBooking = async (id: string) => {
    try {
      const bookingToUpdate = bookings.find(b => b.id === id);
      if (!bookingToUpdate) return;
      
      const updatedBooking = { ...bookingToUpdate, status: 'cancelled' as const };
      
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBooking),
      });

      if (!res.ok) throw new Error('Failed to delete');

      const updated = bookings.map((b) => b.id === id ? updatedBooking : b);
      onUpdate(updated);
      toast.success('تم إلغاء الحجز');
      if (editingId === id) setEditingId(null);
    } catch (error) {
      toast.error('حدث خطأ أثناء الإلغاء');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">جدول الحجوزات الشهري</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
          >
            <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <span className="min-w-[200px] text-center font-semibold text-gray-900 dark:text-white">{monthName}</span>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 sm:p-4 text-center sm:text-right flex flex-row items-center justify-between transition-colors duration-300">
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-bold items-center">إجمالي حجوزات الشهر</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">{monthStats.totalSessions}</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
        <div>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
            {dayNames.map((day) => (
              <div key={day} className="py-2 text-center font-semibold text-gray-700 dark:text-gray-300 text-[10px] sm:text-sm">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-0">
            {calendarData.map((cell, idx) => (
            <div
              key={idx}
              className={`min-h-[100px] sm:min-h-[150px] p-1 sm:p-3 border-r border-b border-gray-200 dark:border-gray-700 transition-colors duration-300 ${
                !cell.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'
              }`}
            >
              {cell.isCurrentMonth && (
                <>
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{cell.day}</div>
                    {cell.date && new Date(cell.date) >= new Date(new Date().setHours(0,0,0,0)) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewBookingDate(cell.date!);
                          setNewBookingTime('');
                          setNewBookingName('');
                        }}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-blue-600 dark:bg-blue-500 text-white font-extrabold leading-none hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-xs sm:text-base flex items-center justify-center p-0 m-0"
                        title="إضافة حجز"
                      >
                        +
                      </button>
                    )}
                  </div>

                  {/* Bookings */}
                  {cell.bookings.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1 sm:mt-2">
                      {cell.bookings.map((booking, i) => {
                        const statusColors: Record<string, string> = {
                          confirmed: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
                          pending: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
                          cancelled: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
                          completed: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                        };
                        return (
                          <button
                            key={`${cell.date}-${i}`}
                            className={`w-full text-right px-1 sm:px-2 py-1 rounded-md transition-colors duration-300 ${
                              statusColors[booking.status] || 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                            }`}
                            title={`${booking.patientName} - ${booking.time} (${booking.status})`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(booking);
                            }}
                          >
                            <div className="flex flex-row flex-wrap items-center gap-1 sm:gap-1.5">
                              <div className="font-bold text-[9px] sm:text-xs whitespace-nowrap">{convertTo12Hour(booking.time)}</div>
                              <div className="text-[9px] sm:text-xs leading-tight whitespace-normal break-words flex-1 text-right">{booking.patientName}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {cell.bookings.length === 0 && (
                    <div className="text-[9px] sm:text-xs text-gray-400 dark:text-gray-500 mb-1">لا يوجد حجوزات</div>
                  )}

                  {/* Quick Add Form */}
                  {cell.date && newBookingDate === cell.date && (
                    <div ref={activeOverlayRef} className="mt-2 space-y-1 z-10 relative bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg w-48 -mr-10 transition-colors duration-300">
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        <select
                          value={newBookingCountry}
                          onChange={(e) => setNewBookingCountry(e.target.value as 'egypt' | 'qatar')}
                          className="w-full px-2 py-1 text-[11px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="egypt">مصر</option>
                          <option value="qatar">قطر</option>
                        </select>
                        <select
                          value={newBookingCountry === 'qatar' ? 'online' : newBookingSessionType}
                          onChange={(e) => setNewBookingSessionType(e.target.value as 'online' | 'in-center')}
                          disabled={newBookingCountry === 'qatar'}
                          className="w-full px-2 py-1 text-[11px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
                        >
                          <option value="online">أونلاين</option>
                          <option value="in-center">في المركز</option>
                        </select>
                      </div>
                      {(() => {
                        const country = newBookingCountry;
                        const sessionType = country === 'qatar' ? 'online' : newBookingSessionType;
                        const hours = getWorkingHoursForDate(cell.date!, sessionType, country);
                        const location = country === 'egypt' ? 'new-cairo' : 'doha';
                        
                        return (
                          <div className="grid grid-cols-2 gap-2 mb-2 max-h-40 overflow-y-auto">
                            {hours.map((h: string) => {
                              const taken = isSlotTakenLocal(cell.date!, h, sessionType, country, location);
                              return (
                                <button
                                  key={`btn-${cell.date}-${sessionType}-${h}`}
                                  type="button"
                                  onClick={() => setNewBookingTime(h)}
                                  disabled={taken}
                                  className={`relative py-2 px-1 w-full text-xs font-semibold rounded-lg border transition-all ${
                                    taken
                                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                                      : newBookingTime === h
                                        ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                                  }`}
                                >
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    <div className="text-xs font-bold">{h}</div>
                                  </div>
                                </button>
                              );
                            })}
                            {hours.length === 0 && (
                              <div className="col-span-2 text-center text-xs text-gray-500 py-2">لا توجد مواعيد عمل</div>
                            )}
                          </div>
                        );
                      })()}
                      <input
                        type="text"
                        value={newBookingName}
                        onChange={(e) => setNewBookingName(e.target.value)}
                        placeholder="اسم المراجع"
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded mb-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      />
                      <input
                        type="tel"
                        value={newBookingPhone}
                        onChange={(e) => setNewBookingPhone(e.target.value)}
                        placeholder="رقم الهاتف"
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAdd(cell.date!);
                        }}
                        disabled={isSaving}
                        className="w-full px-2 py-1.5 text-xs font-bold rounded bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-60 transition-colors"
                      >
                        {isSaving ? 'جاري الحفظ...' : 'إضافة موعد'}
                      </button>
                    </div>
                  )}

                  {/* Edit Booking Form */}
                  {cell.date &&
                    editingId &&
                    cell.bookings.some((b) => b.id === editingId) && (
                      <div ref={activeOverlayRef} className="mt-2 space-y-2 border border-gray-200 dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg relative z-10 w-48 -mr-10 transition-colors duration-300">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">تعديل الحجز</p>
                        <select
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {ALL_SLOTS.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="اسم المراجع"
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="رقم الهاتف"
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                          dir="ltr"
                        />
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as Booking['status'])}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="confirmed">مؤكد</option>
                          <option value="pending">قيد الانتظار</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEdit();
                            }}
                            className="px-2 py-1.5 text-xs font-bold rounded bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBooking(editingId);
                            }}
                            className="px-2 py-1.5 text-xs font-bold rounded bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                          >
                            إلغاء الحجز
                          </button>
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}

