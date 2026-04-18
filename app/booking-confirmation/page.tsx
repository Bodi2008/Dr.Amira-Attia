'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Calendar, MapPin, Phone, User, Copy, Share2, Image as ImageIcon } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { toast, Toaster } from 'sonner';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';

interface BookingData {
  id: string;
  patientName: string;
  phone: string;
  country: string;
  sessionType: string;
  location?: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  referenceNumber: string;
  createdAt: string;
  notes?: string;
}

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

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const defaultSettings = {
  countries: [
    { id: 'egypt', name: 'مصر', flag: '🇪🇬', isActive: true, whatsappNumber: '201228168170' },
    { id: 'qatar', name: 'قطر', flag: '🇶🇦', isActive: true, whatsappNumber: '97477331874' }
  ],
  sessionTypes: [
    { id: 'online', name: 'أونلاين', icon: 'Video', isActive: true, availableIn: ['egypt', 'qatar'] },
    { id: 'in-center', name: 'في المركز', icon: 'Building', isActive: true, availableIn: ['egypt', 'qatar'] }
  ],
  branches: [
    { id: 'new-cairo', name: 'التجمع الخامس', countryId: 'egypt', isActive: true },
    { id: 'madinaty', name: 'مدينتي', countryId: 'egypt', isActive: true },
    { id: 'doha', name: 'الدوحة', countryId: 'qatar', isActive: true }
  ],
  timeSlots: [
    '08:00 ص', '09:00 ص', '10:00 ص', '11:00 ص', 
    '12:00 م', '01:00 م', '02:00 م', '03:00 م', 
    '04:00 م', '05:00 م', '06:00 م', '07:00 م'
  ]
};

export default function BookingConfirmationPage() {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedBooking = sessionStorage.getItem('lastBooking');
    if (savedBooking) {
      setBooking(JSON.parse(savedBooking));
      // Trigger confetti
      const duration = 1.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
    } else {
      router.push('/booking-interface');
    }

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'system', 'settings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const mergedSettings = { ...defaultSettings, ...data };
          if (!mergedSettings.timeSlots) mergedSettings.timeSlots = defaultSettings.timeSlots;
          setSettings(mergedSettings);
        } else {
          setSettings(defaultSettings);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [router]);

  const getCountryName = (c: string) => settings?.countries.find((x: any) => x.id === c)?.name || c;
  const getSessionTypeName = (s: string) => settings?.sessionTypes.find((x: any) => x.id === s)?.name || s;
  const getLocationName = (l: string) => settings?.branches.find((x: any) => x.id === l)?.name || l;

  const handleCopyData = async () => {
    if (!booking) return;

    const displayTime = booking.country === 'qatar' ? qatarTimeMap[booking.time] : booking.time;
    const countryName = getCountryName(booking.country);
    const locationName = getLocationName(booking.location || '');
      
    let message = `مرحباً د. أميرة، قمت بحجز موعد جديد: ✅\n\n`;
    message += `👤 الاسم: ${booking.patientName}\n`;
    message += `🌍 الدولة: ${countryName}\n`;
    message += `📅 التاريخ: ${booking.date}\n`;
    message += `⏰ الموعد: ${displayTime}\n`;

    if (booking.sessionType === 'online') {
      message += `💻 نوع الجلسة: فيديو (أونلاين)\n`;
      message += `📱 الهاتف: ${booking.phone}\n`;
      if (booking.notes) message += `📝 ملاحظات: ${booking.notes}\n`;
      message += `\nبانتظار تأكيدكِ النهائي وتفاصيل رابط الجلسة 🔗✅`;
    } else {
      message += `📍 الفرع: ${locationName} (بالمركز)\n`;
      message += `📱 الهاتف: ${booking.phone}\n`;
      if (booking.notes) message += `📝 ملاحظات: ${booking.notes}\n`;
      message += `\nبانتظار تأكيدكِ النهائي وتفاصيل العنوان (اللوكيشن) 📍✨`;
    }

    try {
      await navigator.clipboard.writeText(message);
      toast.success('تم نسخ وتجهيز بيانات الحجز');
    } catch (error) {
      console.log('Error copying data:', error);
      toast.error('تعذر النسخ');
    }
  };

  const handleDownload = async () => {
    if (!booking || !cardRef.current) return;

    try {
      const isDarkMode = document.documentElement.classList.contains('dark');
      const originalBg = cardRef.current.style.backgroundColor;
      cardRef.current.style.backgroundColor = isDarkMode ? '#111827' : '#f8fafc';
      cardRef.current.style.padding = '24px';
      cardRef.current.style.borderRadius = '24px';
      cardRef.current.style.margin = '-24px';

      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: isDarkMode ? '#111827' : '#f8fafc',
      });
      
      // Restore original styles
      cardRef.current.style.backgroundColor = originalBg;
      cardRef.current.style.padding = '';
      cardRef.current.style.borderRadius = '';
      cardRef.current.style.margin = '';

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `تأكيد-حجز-${booking.referenceNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success('تم حفظ الصورة بنجاح');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('حدث خطأ أثناء حفظ الصورة');
    }
  };

  const handleNewBooking = () => {
    sessionStorage.removeItem('lastBooking');
    router.push('/booking-interface');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">جاري تحميل تأكيد الحجز...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!booking) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم العثور على بيانات الحجز</p>
            <button
              onClick={() => router.push('/booking-interface')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              حجز جديد
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const displayTime = booking.country === 'qatar' ? qatarTimeMap[booking.time] : booking.time;

  return (
    <AppLayout>
      <Toaster position="bottom-center" richColors />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 transition-colors duration-300">
        <div className="max-w-2xl mx-auto">
          <div ref={cardRef} className="pb-4 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 shadow-sm bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
                تم تأكيد حجزك بنجاح!
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                شكراً لك {booking.patientName}، تم استلام حجزك وجاري معالجته
              </p>
            </div>

            <div className="rounded-3xl shadow-lg p-6 sm:p-8 mb-6 border bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 transition-colors duration-300">
              <div className="text-center mb-8">
                <div className="inline-block px-6 py-3 rounded-full text-sm font-bold border bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50">
                  رقم المرجع: <span className="text-lg ml-2 tracking-wider">{booking.referenceNumber}</span>
                </div>
              </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent dark:border-gray-800 transition-colors duration-300">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">الاسم</p>
                  <p className="font-bold text-gray-900 dark:text-white">{booking.patientName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent dark:border-gray-800 transition-colors duration-300">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">التاريخ والوقت</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {booking.date} الساعة {displayTime}
                    {booking.country === 'qatar' && (
                      <span className="text-sm block mt-1 font-normal text-blue-600 dark:text-blue-400">
                        (بتوقيت قطر)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent dark:border-gray-800 transition-colors duration-300">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">نوع الجلسة</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {getSessionTypeName(booking.sessionType)}
                    {booking.sessionType === 'in-center' && booking.location ? ` - ${getLocationName(booking.location)}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent dark:border-gray-800 transition-colors duration-300">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">رقم الهاتف</p>
                  <p className="font-bold text-gray-900 dark:text-white" dir="ltr">{booking.phone}</p>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="flex flex-col gap-4 mb-4">
            <button
              onClick={() => {
                const url = sessionStorage.getItem('lastWhatsappUrl');
                if (url) {
                  // Direct URL scheme works best for mobile PWAs, but standard href allows launching apps 
                  // and bypassing Safari blocker since this is a direct user click
                  const a = document.createElement('a');
                  a.href = url;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  
                  // Fallback
                  setTimeout(() => {
                    if (document.hasFocus()) window.location.href = url.replace('whatsapp://send?phone=', 'https://wa.me/').replace('&text=', '?text=');
                  }, 800);
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 px-4 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 dark:shadow-green-900/20"
            >
              <Phone className="w-5 h-5" />
              إرسال رسالة تأكيد عبر الواتس
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleCopyData}
              className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-4 px-4 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy className="w-5 h-5" />
              نسخ البيانات
            </button>
            
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-4 px-4 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
              حفظ كصورة
            </button>
            
            <button
              onClick={handleNewBooking}
              className="flex-1 bg-blue-600 text-white py-4 px-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
            >
              حجز جديد
            </button>
          </div>

          <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-2xl p-6 transition-colors duration-300">
            <h3 className="font-bold text-yellow-800 dark:text-yellow-500 mb-3 text-lg">ملاحظات هامة</h3>
            <ul className="space-y-3 text-sm text-yellow-700 dark:text-yellow-600">
              <li className="flex gap-2">
                <span className="font-bold">•</span>
                <span>سيتم التواصل معك قريباً لتأكيد الموعد النهائي.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">•</span>
                <span>يرجى الحضور قبل 10 دقائق من الموعد المحدد في حالة الجلسات الحضورية.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">•</span>
                <span>في حالة عدم القدرة على الحضور، يرجى إلغاء الموعد قبل 24 ساعة.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

