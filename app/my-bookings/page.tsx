'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Calendar, Clock, MapPin, Video, CheckCircle, XCircle, Phone, LogOut, Edit2, CreditCard, ShieldAlert } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Step2DateTime from '../booking-interface/components/Step2DateTime';
import ConfirmModal from '../admin-panel/components/ConfirmModal';
import { motion } from 'motion/react';

export default function MyBookingsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [patientName, setPatientName] = useState('');
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceInput, setReferenceInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Reschedule Modal State
  const [rescheduleModal, setRescheduleModal] = useState<{ isOpen: boolean; bookingId: string | null }>({ isOpen: false, bookingId: null });
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const initializeAuth = async () => {
      // Check URL for token first
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      
      let tokenToUse = urlToken;

      if (urlToken) {
        // Save token to localStorage
        localStorage.setItem('patientToken', urlToken);
        // Clean URL (optional, but good for UX)
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        // Check localStorage for existing token
        tokenToUse = localStorage.getItem('patientToken');
      }

      if (tokenToUse) {
        await fetchBookings({ token: tokenToUse });
      } else {
        // Check for saved profile
        const profileStr = localStorage.getItem('patientProfile');
        if (profileStr) {
          try {
            const profile = JSON.parse(profileStr);
            if (profile.phone) {
              await fetchBookings({ phone: profile.phone });
              return;
            }
          } catch (e) {
            console.error('Error parsing profile', e);
          }
        }
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const fetchBookings = async (params: { token?: string, phone?: string, referenceNumber?: string }) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (params.token) queryParams.append('token', params.token);
      if (params.phone) queryParams.append('phone', params.phone);
      if (params.referenceNumber) queryParams.append('referenceNumber', params.referenceNumber);

      const res = await fetch(`/api/my-bookings?${queryParams.toString()}`);
      if (!res.ok) {
        if (res.status === 401 && params.token) {
          localStorage.removeItem('patientToken');
          setIsLoggedIn(false);
          throw new Error('الرابط غير صالح أو منتهي الصلاحية');
        }
        if (res.status === 404) {
          throw new Error('لم يتم العثور على حجوزات');
        }
        throw new Error('فشل تحميل الحجوزات');
      }
      
      const data = await res.json();
      
      if (data.bookings.length === 0 && params.referenceNumber) {
        throw new Error('لم يتم العثور على حجز بهذا الكود');
      }

      setUserPhone(data.patient?.phone || '');
      setPatientName(data.patient?.name || 'زائر');
      setIsLoggedIn(true);
      
      // Sort by date descending initially
      const userBookings = data.bookings || [];
      userBookings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const filteredBookings = userBookings.filter((b: any, index: number, array: any[]) => {
        if (!b.seriesId) return true;
        
        const today = new Date().toISOString().split('T')[0];
        if (b.date < today) return true; // Show all past bookings
        
        // For future bookings in a series, only show the *closest* one
        const futureBookingsInSeries = array.filter(
          (fb: any) => fb.seriesId === b.seriesId && fb.date >= today
        ).sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
        
        // Only keep it if it's the first one in the sorted future bookings
        return futureBookingsInSeries.length > 0 && futureBookingsInSeries[0].id === b.id;
      });
      
      setBookings(filteredBookings);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('patientToken');
    localStorage.removeItem('patientProfile');
    setIsLoggedIn(false);
    setUserPhone('');
    setPatientName('');
    setBookings([]);
  };

  const handleSearchByReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceInput.trim()) {
      toast.error('يرجى إدخال كود الحجز');
      return;
    }
    
    setIsSearching(true);
    try {
      await fetchBookings({ referenceNumber: referenceInput.trim() });
    } catch (error) {
      // Error is handled in fetchBookings
    } finally {
      setIsSearching(false);
    }
  };

  const handleContactWhatsApp = async () => {
    let waWindow: Window | null = null;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
      waWindow = window.open('about:blank', '_blank');
    }

    try {
      setLoading(true);
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      const countryCode = data.country_code;
      
      let phone = '201228168170'; // Default Egypt
      if (countryCode === 'QA') {
        phone = '97477331874'; // Qatar
      }
      
      const message = 'مرحباً، لقد فقدت كود الحجز الخاص بي وأريد الاستعلام عن حجوزاتي.';
      const waUrl = isMobile 
        ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`
        : `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        
      if (isMobile) {
        const a = document.createElement('a');
        a.href = waUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => {
          if (document.hasFocus()) window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        }, 800);
      } else if (waWindow) {
        waWindow.location.href = waUrl;
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      // Fallback to Egypt
      const fallbackUrl = 'https://wa.me/201228168170?text=' + encodeURIComponent('مرحباً، لقد فقدت كود الحجز الخاص بي وأريد الاستعلام عن حجوزاتي.');
      if (waWindow) waWindow.location.href = fallbackUrl;
      else if (isMobile) window.location.href = fallbackUrl;
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'إلغاء الحجز',
      message: 'هل أنت متأكد من رغبتك في إلغاء هذا الحجز؟',
      type: 'danger',
      onConfirm: async () => {
        try {
          const bookingToUpdate = bookings.find(b => b.id === id);
          if (!bookingToUpdate) return;
          
          const updatedBooking = { ...bookingToUpdate, status: 'cancelled', notes: (bookingToUpdate.notes || '') + '\n[تم الإلغاء من قبل المريض]' };
          
          const res = await fetch('/api/bookings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedBooking),
          });

          if (!res.ok) throw new Error('فشل إلغاء الحجز');

          setBookings(bookings.map(b => b.id === id ? updatedBooking : b));
          toast.success('تم إلغاء الحجز بنجاح');
        } catch (error) {
          toast.error('حدث خطأ أثناء الإلغاء');
        }
      }
    });
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      toast.error('يرجى اختيار التاريخ والوقت الجديد');
      return;
    }

    try {
      const bookingToUpdate = bookings.find(b => b.id === rescheduleModal.bookingId);
      if (!bookingToUpdate) return;
      
      const updatedBooking = { 
        ...bookingToUpdate, 
        status: 'pending', 
        date: newDate,
        time: newTime,
        isRescheduleRequest: true,
        originalDateTime: { date: bookingToUpdate.date, time: bookingToUpdate.time },
        notes: (bookingToUpdate.notes || '') + `\n[طلب تعديل موعد: من ${bookingToUpdate.date} ${bookingToUpdate.time} إلى ${newDate} ${newTime}]` 
      };
      
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBooking),
      });

      if (!res.ok) throw new Error('فشل إرسال طلب التعديل');

      setBookings(bookings.map(b => b.id === rescheduleModal.bookingId ? updatedBooking : b));
      toast.success('تم إرسال طلب تعديل الموعد بنجاح، سيتم مراجعته من قبل الإدارة');
      setRescheduleModal({ isOpen: false, bookingId: null });
      setNewDate('');
      setNewTime('');
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال الطلب');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </AppLayout>
    );
  }

  if (!isLoggedIn) {
    return (
      <AppLayout>
        <Toaster position="bottom-center" richColors />
        <div className="min-h-[80vh] bg-gray-50 dark:bg-gray-950 py-12 px-4 flex flex-col items-center justify-center transition-colors duration-300">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full"
          >
            <div className="text-center mb-8">
              <motion.div 
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"
              >
                <Calendar className="w-10 h-10" />
              </motion.div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                الاستعلام عن حجوزاتي
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                أدخل كود الحجز الخاص بك لعرض تفاصيل حجوزاتك
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 transition-colors duration-300">
              <form onSubmit={handleSearchByReference} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    كود الحجز
                  </label>
                  <input
                    type="text"
                    value={referenceInput}
                    onChange={(e) => setReferenceInput(e.target.value)}
                    placeholder="مثال: REF-123456"
                    className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors outline-none text-left"
                    dir="ltr"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !referenceInput.trim()}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  {isSearching ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'بحث'
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  هل فقدت كود الحجز أو لم تستلم رابط الدخول؟
                </p>
                <button
                  onClick={handleContactWhatsApp}
                  className="w-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/50 py-3 rounded-xl font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  تواصل معنا عبر الواتساب
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Toaster position="bottom-center" richColors />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">أهلاً بك، {patientName} ✨</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2" dir="ltr">
                <Phone className="w-4 h-4" />
                {userPhone}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl font-bold transition-colors shadow-sm"
            >
              <LogOut className="w-5 h-5" />
              تسجيل خروج
            </motion.button>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : bookings.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300"
            >
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد حجوزات</h3>
              <p className="text-gray-500 dark:text-gray-400">لم نتمكن من العثور على أي حجوزات مسجلة برقم الهاتف هذا.</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={booking.id} 
                  className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* Card Header */}
                  <div className="bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                        {booking.patientName?.charAt(0) || patientName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{booking.patientName || patientName}</h3>
                        <div className="text-sm font-mono text-gray-500 dark:text-gray-400">
                          رقم الحجز: {booking.referenceNumber}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                        booking.status === 'confirmed' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800' :
                        booking.status === 'cancelled' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800' :
                        booking.status === 'completed' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800' :
                        'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800'
                      }`}>
                        {booking.status === 'confirmed' && <CheckCircle className="w-3.5 h-3.5" />}
                        {booking.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                        {booking.status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                        {booking.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                        {booking.status === 'confirmed' ? 'مؤكد' : 
                         booking.status === 'cancelled' ? 'ملغي' : 
                         booking.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
                      </div>
                      
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                        booking.paymentStatus === 'paid' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'
                      }`}>
                        <CreditCard className="w-3.5 h-3.5" />
                        {booking.paymentStatus === 'paid' ? 'تم الدفع' : 'لم يتم الدفع'}
                      </div>
                      
                      {booking.seriesId && (
                        <div className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                          حجز مستمر
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Session Details */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-xl ${
                            booking.sessionType === 'online' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }`}>
                            {booking.sessionType === 'online' ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">نوع الجلسة والمكان</p>
                            <p className="font-bold text-gray-900 dark:text-white">
                              {booking.sessionType === 'online' ? 'جلسة أونلاين' : 'جلسة بالمركز'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                              {booking.country === 'egypt' ? 'مصر' : 'قطر'} {booking.location ? `- ${booking.location === 'new-cairo' ? 'التجمع' : booking.location === 'madinaty' ? 'مدينتي' : booking.location}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">الموعد</p>
  <p className="font-bold text-gray-900 dark:text-white">
    {/* استخراج اسم اليوم */}
    {new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date(booking.date))}
    {!booking.seriesId && (
       <span className="text-sm font-normal text-gray-500 mr-2">({booking.date})</span>
    )}
  </p>
  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5" dir="ltr">{booking.time}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer (Actions) */}
                  {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                    <div className="bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-3">
                      <button
                        onClick={() => setRescheduleModal({ isOpen: true, bookingId: booking.id })}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl font-bold transition-colors text-sm shadow-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        طلب تغيير الموعد
                      </button>
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-bold transition-colors text-sm shadow-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        إلغاء الحجز
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">طلب تغيير الموعد</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">اختر التاريخ والوقت الجديد الذي يناسبك. سيتم مراجعة طلبك وتأكيده من قبل الإدارة.</p>
            
            {(() => {
              const bookingToUpdate = bookings.find(b => b.id === rescheduleModal.bookingId);
              if (!bookingToUpdate) return null;

              return (
                <Step2DateTime
                  selectedDate={newDate}
                  setSelectedDate={setNewDate}
                  selectedTime={newTime}
                  setSelectedTime={setNewTime}
                  country={bookingToUpdate.country}
                  sessionType={bookingToUpdate.sessionType}
                  location={bookingToUpdate.location}
                  patientPhone={bookingToUpdate.phone}
                  onNext={handleReschedule}
                  onBack={() => setRescheduleModal({ isOpen: false, bookingId: null })}
                  nextLabel="إرسال الطلب"
                  backLabel="إلغاء"
                />
              );
            })()}
          </motion.div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </AppLayout>
  );
}
