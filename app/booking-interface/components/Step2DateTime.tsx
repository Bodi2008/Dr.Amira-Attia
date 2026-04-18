import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { format, addDays, startOfToday, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isSameDay, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Country, SessionType, Location } from '../types';

interface Props {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  selectedTime: string;
  setSelectedTime: (t: string) => void;
  country: Country;
  sessionType: SessionType;
  location: Location;
  patientPhone?: string;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
  backLabel?: string;
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

export default function Step2DateTime({
  selectedDate, setSelectedDate, selectedTime, setSelectedTime, country, sessionType, location, patientPhone, onNext, onBack, nextLabel = 'التالي', backLabel = 'رجوع', settings
}: Props & { settings?: any }) {
  const [schedule, setSchedule] = useState<any>({ egyptCenter: {}, qatarCenter: {}, online: {} });
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(startOfToday()));

  useEffect(() => {
    Promise.all([
      fetch('/api/schedule').then(res => res.json()),
      fetch('/api/bookings').then(res => res.json())
    ]).then(([scheduleData, bookingsData]) => {
      setSchedule(scheduleData.schedule || { egyptCenter: {}, qatarCenter: {}, online: {} });
      setBookings(bookingsData.bookings || []);
      setLoading(false);
    });
  }, []);

  const today = startOfToday();
  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDayOfWeek = (getDay(startOfMonth(currentMonth)) + 1) % 7; // Adjust for Saturday start
  const blanks = Array.from({ length: startDayOfWeek }).map((_, i) => i);

  const timeSlotsToUse = settings?.timeSlots || ALL_SLOTS;

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
    let typeKey = sessionType === 'in-center' ? `in-center_${country}_${location}` : sessionType;
    
    // Fallback for old data structure if needed
    if (!schedule[typeKey]) {
      if (sessionType === 'online' && schedule['online']) typeKey = 'online';
      else if (sessionType === 'in-center' && country === 'egypt' && schedule['egyptCenter']) typeKey = 'egyptCenter';
      else if (sessionType === 'in-center' && country === 'qatar' && schedule['qatarCenter']) typeKey = 'qatarCenter';
      else if (sessionType === 'in-center') typeKey = `in-center_${country}`; // fallback to country level if branch level doesn't exist
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
        availableSlots = timeSlotsToUse;
      }
    }
    
    if (!isActive || !availableSlots.includes(slot)) return 'unavailable';
    
    const booking = bookings.find(b => 
      b.date === dateString && 
      b.time === slot && 
      b.status !== 'cancelled' &&
      b.sessionType === sessionType &&
      (sessionType === 'online' || (b.country === country && (sessionType !== 'in-center' || b.location === location)))
    );
    
    if (booking) {
      if (patientPhone && booking.phone === patientPhone) {
        return 'booked_by_you';
      }
      return 'booked';
    }
    
    return 'available';
  };

  const hasAnyAvailableSlots = (date: Date) => {
    return timeSlotsToUse.some((slot: string) => getSlotStatus(date, slot) === 'available');
  };

  const isNextDisabled = !selectedDate || !selectedTime;

  const handlePrevMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    if (!isBefore(endOfMonth(prevMonth), today)) {
      setCurrentMonth(prevMonth);
    }
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل المواعيد المتاحة...</p>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">1</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">اختر اليوم</h2>
            </div>
            
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={handlePrevMonth} 
                  disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), today)}
                  className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {format(currentMonth, 'MMMM yyyy', { locale: ar })}
                </h3>
                <button 
                  onClick={handleNextMonth}
                  className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-3">
                {['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'].map(day => (
                  <div key={day} className="text-center text-sm font-bold text-gray-400 dark:text-gray-500 pb-2 border-b border-gray-50 dark:border-gray-800">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {blanks.map(blank => (
                  <div key={`blank-${blank}`} className="aspect-square"></div>
                ))}
                {monthDays.map(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isSelected = selectedDate === dateStr;
                  const isPast = isBefore(date, today);
                  const hasSlots = !isPast && hasAnyAvailableSlots(date);
                  const isToday = isSameDay(date, today);

                  return (
                    <button
                      key={dateStr}
                      disabled={isPast || !hasSlots}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedTime('');
                      }}
                      className={`aspect-square rounded-2xl flex items-center justify-center text-lg font-bold transition-all duration-200 ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20 scale-105' 
                          : isPast 
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : hasSlots
                              ? 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-50/50 dark:bg-gray-800/50'
                      } ${isToday && !isSelected ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-gray-900 text-blue-600 dark:text-blue-400' : ''}`}
                    >
                      {format(date, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedDate && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500 pt-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">2</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">اختر الوقت</h2>
              </div>
              
              {country === 'qatar' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-5 rounded-2xl text-sm font-medium border border-blue-100 dark:border-blue-800/50 flex items-start gap-3">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>
                    المواعيد المعروضة بتوقيت قطر 
                  </p>
                </div>
              )}

                            {country === 'egypt' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-5 rounded-2xl text-sm font-medium border border-blue-100 dark:border-blue-800/50 flex items-start gap-3">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>
                    المواعيد المعروضة بتوقيت مصر 
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {timeSlotsToUse.map((time: string) => {
                  const status = getSlotStatus(parseISO(selectedDate), time);
                  const isSelected = selectedTime === time;
                  const isDisabled = status !== 'available';
                  const displayTime = country === 'qatar' ? (qatarTimeMap[time] || time) : time;
                  
                  let buttonClass = '';
                  let label = displayTime;
                  
                  if (status === 'booked_by_you') {
                    buttonClass = 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 cursor-not-allowed opacity-80';
                    label = 'تم حجزها لك';
                  } else if (isSelected) {
                    buttonClass = 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20 scale-105';
                  } else if (isDisabled) {
                    buttonClass = 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60';
                  } else {
                    buttonClass = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-gray-700 dark:text-gray-300';
                  }

                  return (
                    <button
                      key={time}
                      disabled={isDisabled}
                      onClick={() => setSelectedTime(time)}
                      className={`p-4 rounded-2xl border-2 font-bold text-lg transition-all duration-200 ${buttonClass}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              
              {!hasAnyAvailableSlots(parseISO(selectedDate)) && (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <p className="text-gray-500 dark:text-gray-400 font-medium">عذراً، لا توجد مواعيد متاحة في هذا اليوم.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="pt-8 flex flex-col sm:flex-row gap-4">
        <button
          onClick={onBack}
          className="w-full sm:flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
        >
          {backLabel}
        </button>
        <button
          onClick={onNext}
          disabled={isNextDisabled}
          className="w-full sm:flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
