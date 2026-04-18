import React, { useMemo, useState } from 'react';
import { Users, Phone, Calendar, Clock, MapPin, Video, CheckCircle, XCircle, MessageCircle, Copy, Repeat, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import ConfirmModal from './ConfirmModal';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

interface Props {
  bookings: any[];
  onStatusChange?: (id: string, status: string, isBulk?: boolean) => void;
  onPaymentStatusChange?: (id: string, paymentStatus: 'paid' | 'unpaid', isBulk?: boolean) => void;
  onRefresh?: () => void;
  onNewBooking?: (patientName?: string, phone?: string) => void;
  onEditBooking?: (booking: any) => void;
  onDeleteBooking?: (booking: any) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'مؤكد', className: 'bg-green-100 text-green-700' },
  pending: { label: 'قيد الانتظار', className: 'bg-amber-100 text-amber-700' },
  completed: { label: 'مكتمل', className: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'ملغي', className: 'bg-red-100 text-red-700' },
};

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: 'تم الدفع ✓', className: 'bg-green-100 text-green-700' },
  unpaid: { label: 'لم يتم الدفع ✕', className: 'bg-red-100 text-red-700' },
};

export default function PatientProfiles({ bookings, onStatusChange, onPaymentStatusChange, onRefresh, onNewBooking, onEditBooking, onDeleteBooking }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [isGeneratingToken, setIsGeneratingToken] = useState<string | null>(null);
  const [repeatModal, setRepeatModal] = useState<{isOpen: boolean, booking: any}>({isOpen: false, booking: null});
  const [repeatType, setRepeatType] = useState<'always' | 'custom'>('always');
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [isRepeating, setIsRepeating] = useState(false);
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

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "50%";
    textArea.style.left = "50%";
    textArea.style.opacity = "0";
    textArea.style.transform = "translate(-50%, -50%)";
    textArea.style.zIndex = "-9999";
    document.body.appendChild(textArea);
    
    // Select text using mobile-friendly method
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 999999);
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('تم نسخ رسالة الدخول بنجاح');
      } else {
        window.prompt('تعذر النسخ التلقائي. يرجى نسخ الرسالة التالية يدوياً:', text);
      }
    } catch (err) {
      window.prompt('تعذر النسخ التلقائي. يرجى نسخ الرسالة التالية يدوياً:', text);
    }
    document.body.removeChild(textArea);
  };

  const generateOrGetToken = async (phone: string, name: string) => {
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('phone', '==', phone));
    const snapshot = await getDocs(q);

    let token;
    if (snapshot.empty) {
      token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      await setDoc(doc(db, 'patients', token), {
        phone,
        name: name || '',
        token,
        createdAt: new Date().toISOString()
      });
    } else {
      token = snapshot.docs[0].data().token;
    }
    return token;
  };

  const handleSendWhatsApp = async (patient: any) => {
    // Open window synchronously to bypass Safari popup blocker
    let waWindow: Window | null = null;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
      waWindow = window.open('about:blank', '_blank');
    }

    try {
      setIsGeneratingToken(patient.phone);
      const token = await generateOrGetToken(patient.phone, patient.name);

      const magicLink = `${window.location.origin}/my-bookings?token=${token}`;
      const message = `مرحباً ${patient.name}،\nيمكنك متابعة حجوزاتك وإدارتها عبر الرابط التالي:\n${magicLink}`;
      
      const cleanPhone = patient.phone.replace(/\D/g, '');
      const waUrl = isMobile 
        ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
        : `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      
      if (isMobile) {
        // Direct URL scheme works best for mobile PWAs
        const a = document.createElement('a');
        a.href = waUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Fallback just in case
        setTimeout(() => {
          if (document.hasFocus()) window.location.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        }, 800);
      } else if (waWindow) {
        waWindow.location.href = waUrl;
      }
      
      toast.success('تم فتح الواتساب بنجاح');
    } catch (error) {
      if (waWindow) waWindow.close();
      toast.error('حدث خطأ أثناء إنشاء الرابط');
    } finally {
      setIsGeneratingToken(null);
    }
  };

  const handleCopyLink = async (patient: any) => {
    try {
      setIsGeneratingToken(patient.phone + '-copy');
      const token = await generateOrGetToken(patient.phone, patient.name);
      const magicLink = `${window.location.origin}/my-bookings?token=${token}`;
      const message = `مرحباً ${patient.name}،\nيمكنك متابعة حجوزاتك وإدارتها عبر الرابط التالي:\n${magicLink}`;

      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(message);
          toast.success('تم نسخ رسالة الدخول بنجاح');
        } catch (err) {
          fallbackCopyTextToClipboard(message);
        }
      } else {
        fallbackCopyTextToClipboard(message);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء أو نسخ الرابط');
    } finally {
      setIsGeneratingToken(null);
    }
  };

  const handleRepeatBooking = async () => {
    if (!repeatModal.booking) return;
    setIsRepeating(true);
    try {
      const originalBooking = repeatModal.booking;
      let successCount = 0;
      let failCount = 0;
      
      const seriesId = Math.random().toString(36).substring(2, 15);
      const weeksToBook = repeatType === 'always' ? 52 : repeatWeeks; // 52 weeks = 1 year for "always"

      // Update original booking with seriesId
      await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...originalBooking, seriesId }),
      });

      for (let i = 1; i <= weeksToBook; i++) {
        const nextDate = format(addDays(parseISO(originalBooking.date), i * 7), 'yyyy-MM-dd');

        // Check if already booked in current state to avoid unnecessary API calls
        const isTaken = bookings.some(
          (b: any) =>
            b.date === nextDate &&
            b.time === originalBooking.time &&
            b.status !== 'cancelled' &&
            b.sessionType === originalBooking.sessionType &&
            (originalBooking.sessionType === 'online' || (b.country === originalBooking.country && (originalBooking.sessionType !== 'in-center' || b.location === originalBooking.location)))
        );

        if (isTaken) {
          failCount++;
          continue;
        }

        const newBooking = {
          ...originalBooking,
          date: nextDate,
          status: 'confirmed',
          paymentStatus: 'unpaid',
          isRescheduleRequest: false,
          originalDateTime: null,
          seriesId,
          createdAt: new Date().toISOString(),
        };
        delete newBooking.id;
        delete newBooking.referenceNumber;

        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBooking),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(repeatType === 'always' ? `تم تثبيت الموعد بنجاح (${successCount} حجز قادم)` : `تم إضافة ${successCount} حجوزات بنجاح`);
      }
      if (failCount > 0) {
        toast.error(`تعذر حجز ${failCount} مواعيد لتعارضها مع حجوزات أخرى`);
      }

      setRepeatModal({ isOpen: false, booking: null });
      if (onRefresh) {
        onRefresh();
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تكرار الحجز');
    } finally {
      setIsRepeating(false);
    }
  };

  const handleConfirmAll = async (patientPhone: string) => {
    if (!onStatusChange) return;
    const patient = patients.find(p => p.phone === patientPhone);
    if (!patient) return;
    
    const pendingBookings = patient.bookings.filter((b: any) => b.status === 'pending');
    if (pendingBookings.length === 0) {
      toast.info('لا يوجد حجوزات قيد الانتظار لتأكيدها');
      return;
    }
    
    setConfirmConfig({
      isOpen: true,
      title: 'تأكيد الحجوزات',
      message: `هل أنت متأكد من تأكيد ${pendingBookings.length} حجز؟`,
      type: 'info',
      onConfirm: async () => {
        try {
          await Promise.all(pendingBookings.map((b: any) => onStatusChange(b.id, 'confirmed', true)));
          toast.success('تم تأكيد جميع الحجوزات بنجاح');
        } catch (error) {
          toast.error('حدث خطأ في تأكيد الحجوزات');
        }
      }
    });
  };

  const handlePayAll = async (patientPhone: string) => {
    if (!onPaymentStatusChange) return;
    const patient = patients.find(p => p.phone === patientPhone);
    if (!patient) return;
    
    const unpaidBookings = patient.bookings.filter((b: any) => b.paymentStatus !== 'paid');
    if (unpaidBookings.length === 0) {
      toast.info('جميع الحجوزات مدفوعة');
      return;
    }
    
    setConfirmConfig({
      isOpen: true,
      title: 'دفع الحجوزات',
      message: `هل أنت متأكد من دفع ${unpaidBookings.length} حجز؟`,
      type: 'info',
      onConfirm: async () => {
        try {
          await Promise.all(unpaidBookings.map((b: any) => onPaymentStatusChange(b.id, 'paid', true)));
          toast.success('تم دفع جميع الحجوزات بنجاح');
        } catch (error) {
          toast.error('حدث خطأ في دفع الحجوزات');
        }
      }
    });
  };

  const handleCancelSeries = async (seriesId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const futureBookingsInSeries = bookings.filter(b => b.seriesId === seriesId && b.date >= today && b.status !== 'cancelled');

    if (futureBookingsInSeries.length === 0) {
      toast.info('لا توجد حجوزات مستقبلية لإلغائها');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'إلغاء الحجز المستمر',
      message: 'هل أنت متأكد من إلغاء جميع المواعيد المستقبلية المرتبطة بهذا الحجز المستمر؟',
      type: 'danger',
      onConfirm: async () => {
        try {
          await Promise.all(futureBookingsInSeries.map(b =>
            fetch('/api/bookings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...b, status: 'cancelled' })
            })
          ));
          toast.success(`تم إلغاء ${futureBookingsInSeries.length} حجوزات مستقبلية بنجاح`);
          if (onRefresh) onRefresh();
        } catch (error) {
          toast.error('حدث خطأ أثناء الإلغاء');
        }
      }
    });
  };

  // Group bookings by phone number
  const patients = useMemo(() => {
    const grouped: Record<string, any> = {};
    
    bookings.forEach(booking => {
      const phone = booking.phone?.trim();
      if (!phone) return;
      
      if (!grouped[phone]) {
        grouped[phone] = {
          phone,
          name: booking.patientName, // Take the most recent name
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          bookings: [],
          seriesIds: new Set(),
          completedSeriesIds: new Set(),
          cancelledSeriesIds: new Set(),
          lastBookingDate: booking.createdAt,
        };
      }
      
      grouped[phone].bookings.push(booking);
      
      if (booking.seriesId) {
        if (!grouped[phone].seriesIds.has(booking.seriesId)) {
          grouped[phone].seriesIds.add(booking.seriesId);
          grouped[phone].totalBookings += 1;
        }
        
        if (booking.status === 'confirmed' && !grouped[phone].completedSeriesIds.has(booking.seriesId)) {
          grouped[phone].completedSeriesIds.add(booking.seriesId);
          grouped[phone].completedBookings += 1;
        }
        
        if (booking.status === 'cancelled' && !grouped[phone].cancelledSeriesIds.has(booking.seriesId)) {
          grouped[phone].cancelledSeriesIds.add(booking.seriesId);
          grouped[phone].cancelledBookings += 1;
        }
      } else {
        grouped[phone].totalBookings += 1;
        if (booking.status === 'confirmed') grouped[phone].completedBookings += 1;
        if (booking.status === 'cancelled') grouped[phone].cancelledBookings += 1;
      }
      
      // Update last booking date if this one is newer
      if (new Date(booking.createdAt) > new Date(grouped[phone].lastBookingDate)) {
        grouped[phone].lastBookingDate = booking.createdAt;
        grouped[phone].name = booking.patientName; // Update name to latest
      }
    });
    
    // Sort bookings for each patient by date descending
    Object.values(grouped).forEach(patient => {
      patient.bookings.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    
    return Object.values(grouped).sort((a: any, b: any) => new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime());
  }, [bookings]);

  const filteredPatients = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm);
    let matchFilter = true;
    if (patientFilter === 'has_unpaid') {
      matchFilter = p.bookings.some((b: any) => b.paymentStatus !== 'paid');
    } else if (patientFilter === 'has_pending') {
      matchFilter = p.bookings.some((b: any) => b.status === 'pending');
    }
    return matchSearch && matchFilter;
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors duration-300">
      <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">ملفات المرضى</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة سجلات المرضى وتاريخ حجوزاتهم</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {onNewBooking && (
              <button
                onClick={() => onNewBooking()}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                مريض جديد
              </button>
            )}
            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 text-right text-sm font-bold text-gray-700 dark:text-gray-300 transition-colors duration-300"
            >
              <option value="all">كل المرضى</option>
              <option value="has_unpaid">عليهم مدفوعات متأخرة</option>
              <option value="has_pending">لديهم حجوزات غير مؤكدة</option>
            </select>
            <div className="relative">
              <input
                type="text"
                placeholder="بحث بالاسم أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-72 pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
              <Users className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-gray-100 dark:divide-gray-800 transition-colors duration-300">
        {/* Patients List */}
        <div className="lg:col-span-1 h-[600px] overflow-y-auto bg-gray-50/50 dark:bg-gray-800/30 transition-colors duration-300">
          {filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              لا يوجد مرضى مطابقين للبحث
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 transition-colors duration-300">
              {filteredPatients.map((patient: any) => (
                <button
                  key={patient.phone}
                  onClick={() => setSelectedPatient(patient.phone)}
                  className={`w-full text-right p-6 transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/20 ${
                    selectedPatient === patient.phone ? 'bg-blue-50 dark:bg-blue-900/40 border-r-4 border-blue-600 dark:border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                      <span className="text-blue-700 dark:text-blue-400 font-bold text-lg">
                        {patient.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{patient.name}</h4>
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm mt-1" dir="ltr">
                        <Phone className="w-3 h-3" />
                        <span>{patient.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm mt-2">
                    <span className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs transition-colors duration-300">
                      {patient.totalBookings} حجوزات
                    </span>
                    {patient.bookings.some((b: any) => b.paymentStatus !== 'paid') && (
                      <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full text-xs font-bold border border-red-100 dark:border-red-900/50 transition-colors duration-300">
                        غير مدفوع
                      </span>
                    )}
                    {patient.bookings.some((b: any) => b.status === 'pending') && (
                      <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-900/50 transition-colors duration-300">
                        غير مؤكد
                      </span>
                    )}
                    {patient.bookings.some((b: any) => b.isRescheduleRequest && b.status === 'pending') && (
                      <span className="relative flex h-3 w-3 mr-auto">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 dark:bg-purple-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-600 dark:bg-purple-500"></span>
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 dark:text-gray-500 text-xs mt-2 text-right">
                    آخر حجز: {new Date(patient.lastBookingDate).toLocaleDateString('ar-EG')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Patient Details */}
        <div className="lg:col-span-2 h-[600px] overflow-y-auto bg-white dark:bg-gray-900 p-6 sm:p-8 transition-colors duration-300">
          {!selectedPatient ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <Users className="w-16 h-16 mb-4 opacity-20" />
              <p>اختر مريضاً لعرض ملفه وتاريخ حجوزاته</p>
            </div>
          ) : (
            (() => {
              const patient = patients.find(p => p.phone === selectedPatient);
              if (!patient) return null;

              return (
                <div className="animate-in fade-in duration-300">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-500 dark:to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-colors duration-300">
                        <span className="text-white font-bold text-3xl">
                          {patient.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{patient.name}</h2>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400" dir="ltr">
                          <Phone className="w-4 h-4" />
                          <span className="font-medium text-lg">{patient.phone}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {onStatusChange && patient.bookings.some((b: any) => b.status === 'pending') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleConfirmAll(patient.phone); }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-xl font-bold transition-colors text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            تأكيد الكل
                          </button>
                        )}
                        {onPaymentStatusChange && patient.bookings.some((b: any) => b.paymentStatus !== 'paid') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePayAll(patient.phone); }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold transition-colors text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            دفع الكل
                          </button>
                        )}
                      </div>
                      {onNewBooking && (
                        <button
                          onClick={() => onNewBooking(patient.name, patient.phone)}
                          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold transition-colors w-full sm:w-auto"
                        >
                          <Plus className="w-5 h-5" />
                          إضافة موعد
                        </button>
                      )}
                      <button
                        onClick={() => handleSendWhatsApp(patient)}
                        disabled={isGeneratingToken === patient.phone}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl font-bold transition-colors disabled:opacity-50 w-full sm:w-auto"
                      >
                        {isGeneratingToken === patient.phone ? (
                          <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MessageCircle className="w-5 h-5" />
                        )}
                        إرسال رابط الدخول
                      </button>
                      <button
                        onClick={() => handleCopyLink(patient)}
                        disabled={isGeneratingToken === patient.phone + '-copy'}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold transition-colors disabled:opacity-50 w-full sm:w-auto"
                      >
                        {isGeneratingToken === patient.phone + '-copy' ? (
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                        نسخ الرابط
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                      <div className="text-3xl font-bold text-gray-900 mb-1">{patient.totalBookings}</div>
                      <div className="text-sm text-gray-500">إجمالي الحجوزات</div>
                    </div>
                    <div className="bg-green-50 rounded-2xl p-4 text-center">
                      <div className="text-3xl font-bold text-green-700 mb-1">{patient.completedBookings}</div>
                      <div className="text-sm text-green-600">مؤكدة</div>
                    </div>
                    <div className="bg-red-50 rounded-2xl p-4 text-center">
                      <div className="text-3xl font-bold text-red-700 mb-1">{patient.cancelledBookings}</div>
                      <div className="text-sm text-red-600">ملغاة</div>
                    </div>
                  </div>

                  {/* Booking History */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        سجل الحجوزات
                      </h3>
                      
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 text-right transition-colors duration-300"
                        >
                          <option value="all">كل الحالات</option>
                          <option value="confirmed">مؤكد</option>
                          <option value="pending">قيد الانتظار</option>
                          <option value="completed">مكتمل</option>
                          <option value="cancelled">ملغي</option>
                        </select>

                        <select
                          value={filterPayment}
                          onChange={(e) => setFilterPayment(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 text-right transition-colors duration-300"
                        >
                          <option value="all">حالة الدفع (الكل)</option>
                          <option value="paid">تم الدفع</option>
                          <option value="unpaid">لم يتم الدفع</option>
                        </select>

                        <select
                          value={filterLocation}
                          onChange={(e) => setFilterLocation(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 text-right transition-colors duration-300"
                        >
                          <option value="all">المكان (الكل)</option>
                          <option value="online">أونلاين</option>
                          <option value="new-cairo">التجمع</option>
                          <option value="madinaty">مدينتي</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {patient.bookings
                        .filter((b: any) => {
                          const matchStatus = filterStatus === 'all' || b.status === filterStatus;
                          const matchPayment = filterPayment === 'all' || (filterPayment === 'paid' ? b.paymentStatus === 'paid' : b.paymentStatus !== 'paid');
                          const matchLocation = filterLocation === 'all' || (filterLocation === 'online' ? b.sessionType === 'online' : b.location === filterLocation);
                          return matchStatus && matchPayment && matchLocation;
                        })
                        .filter((b: any, index: number, array: any[]) => {
                          if (!b.seriesId) return true;
                          
                          const today = new Date().toISOString().split('T')[0];
                          if (b.date < today) return true; // Show all past bookings
                          
                          // For future bookings in a series, only show the *closest* one
                          const futureBookingsInSeries = array.filter(
                            (fb: any) => fb.seriesId === b.seriesId && fb.date >= today
                          ).sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
                          
                          // Only keep it if it's the first one in the sorted future bookings
                          return futureBookingsInSeries.length > 0 && futureBookingsInSeries[0].id === b.id;
                        })
                        .map((booking: any) => (
                          <div key={booking.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 hover:shadow-md transition-all duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                              {/* الجزء العلوي: نوع الجلسة والمكان */}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl transition-colors duration-300 ${
          booking.sessionType === 'online' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        }`}>
          {booking.sessionType === 'online' ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
        </div>
        <div>
          <div className="font-bold text-gray-900 dark:text-white">
            {booking.sessionType === 'online' ? 'جلسة أونلاين' : 'جلسة بالمركز'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {booking.country === 'egypt' ? 'مصر' : 'قطر'} {booking.location ? `- ${booking.location}` : ''}
          </div>
        </div>
      </div>
      
      {/* الحالة والدفع */}
      <div className="flex flex-col gap-2 items-end">
        <div className="flex items-center gap-2">
          {onStatusChange ? (
            <select
              value={booking.status}
              onChange={(e) => onStatusChange(booking.id, e.target.value)}
              className={`text-xs font-bold rounded-lg px-2 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${statusConfig[booking.status]?.className || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              <option value="confirmed">مؤكد</option>
              <option value="pending">قيد الانتظار</option>
              <option value="completed">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>
          ) : (
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 w-fit transition-colors duration-300 ${statusConfig[booking.status]?.className || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
              {booking.status === 'confirmed' && <CheckCircle className="w-4 h-4" />}
              {booking.status === 'cancelled' && <XCircle className="w-4 h-4" />}
              {booking.status === 'pending' && <Clock className="w-4 h-4" />}
              {statusConfig[booking.status]?.label || booking.status}
            </div>
          )}

          {onPaymentStatusChange && (
            <select
              value={booking.paymentStatus || 'unpaid'}
              onChange={(e) => onPaymentStatusChange(booking.id, e.target.value as 'paid' | 'unpaid')}
              className={`text-xs font-bold rounded-lg px-2 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${paymentStatusConfig[booking.paymentStatus || 'unpaid']?.className || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              <option value="paid">تم الدفع ✓</option>
              <option value="unpaid">لم يتم الدفع ✕</option>
            </select>
          )}
        </div>
      </div>
    </div>

    {/* حاوية التاريخ والوقت المحدثة */}
    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl flex-wrap transition-colors duration-300">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
          {booking.date ? new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date(booking.date)) : 'تاريخ غير محدد'}
        </span>
        {!booking.seriesId && (
          <span className="text-gray-400 dark:text-gray-500">({booking.date})</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        {booking.time}
      </div>

      {booking.isRescheduleRequest && booking.originalDateTime?.date && (
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 line-through" title="الموعد الأصلي">
          <Calendar className="w-4 h-4" />
          <span>
            {new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(new Date(booking.originalDateTime.date))}
          </span>
          {!booking.seriesId && ` - ${booking.originalDateTime.date}`} - {booking.originalDateTime.time}
        </div>
      )}
    </div>

    {/* منطقة الأزرار (Actions) */}
    <div className="mr-auto flex flex-wrap gap-2 justify-end mt-4">
      {onEditBooking && (
        <button
          onClick={() => onEditBooking(booking)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition-colors"
          title="تعديل الموعد"
        >
          <Edit className="w-4 h-4" />
          تعديل
        </button>
      )}
      {onDeleteBooking && (
        <button
          onClick={() => onDeleteBooking(booking)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg text-xs font-bold transition-colors"
          title="حذف الحجز"
        >
          <Trash2 className="w-4 h-4" />
          حذف
        </button>
      )}
      {booking.seriesId && booking.status !== 'cancelled' && (
        <button
          onClick={(e) => { e.stopPropagation(); handleCancelSeries(booking.seriesId); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-lg text-xs font-bold transition-colors"
          title="إلغاء التثبيت"
        >
          <XCircle className="w-4 h-4" />
          إلغاء التثبيت
        </button>
      )}
      {!booking.seriesId && (
        <button
          onClick={() => setRepeatModal({ isOpen: true, booking })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-bold transition-colors"
          title="تثبيت الموعد أسبوعياً"
        >
          <Repeat className="w-4 h-4" />
          تثبيت أسبوعي
        </button>
      )}
    </div>

    {booking.notes && (
      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-xl text-sm whitespace-pre-wrap border border-yellow-100 dark:border-yellow-900/50 transition-colors duration-300">
        <span className="font-bold block mb-1">ملاحظات:</span>
        {booking.notes}
      </div>
    )}
  </div>
))}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Repeat Booking Modal */}
      {repeatModal.isOpen && repeatModal.booking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl transition-colors duration-300">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">تثبيت الموعد أسبوعياً</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              سيتم حجز نفس الموعد ({repeatModal.booking.time}) يوم ({format(parseISO(repeatModal.booking.date), 'EEEE', { locale: ar })}) للأسابيع القادمة.
            </p>

            <div className="mb-6 space-y-3">
              <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="repeatType"
                  checked={repeatType === 'always'}
                  onChange={() => setRepeatType('always')}
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">دائماً (مستمر)</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">يتم الحجز تلقائياً حتى تقوم بإلغائه</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="repeatType"
                  checked={repeatType === 'custom'}
                  onChange={() => setRepeatType('custom')}
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">عدد محدد من الأسابيع</div>
                </div>
              </label>
            </div>

            {repeatType === 'custom' && (
              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">عدد الأسابيع</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={repeatWeeks}
                  onChange={(e) => setRepeatWeeks(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                />
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setRepeatModal({ isOpen: false, booking: null })}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                disabled={isRepeating}
              >
                إلغاء
              </button>
              <button
                onClick={handleRepeatBooking}
                disabled={isRepeating}
                className="flex-1 px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                {isRepeating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
                تأكيد الحجز
              </button>
            </div>
          </div>
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
    </div>
  );
}
