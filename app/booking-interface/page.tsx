'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import AppLayout from '@/components/AppLayout';
import StepIndicator from './components/StepIndicator';
import Step1SessionType from './components/Step1SessionType';
import Step2DateTime from './components/Step2DateTime';
import Step3PatientInfo from './components/Step3PatientInfo';
import Step4Review from './components/Step4Review';
import WelcomeBackModal from './components/WelcomeBackModal';
import { Country, SessionType, Location } from './types';
import { motion, AnimatePresence } from 'motion/react';

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

export default function BookingInterfacePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [savedProfile, setSavedProfile] = useState<any>(null);

  useEffect(() => {
    // Check for saved profile
    const profile = localStorage.getItem('patientProfile');
    if (profile) {
      try {
        const parsed = JSON.parse(profile);
        setSavedProfile(parsed);
        setShowWelcomeBack(true);
      } catch (e) {
        console.error('Error parsing profile', e);
      }
    } else {
      // If new user, fetch IP location to restrict country
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          if (data && data.country_code) {
            if (data.country_code === 'EG') {
              setCountry('egypt');
              setIsCountryLocked(true);
            } else if (data.country_code === 'QA') {
              setCountry('qatar');
              setIsCountryLocked(true);
            }
            // Add other logical country mapping if required. 
            // Currently, if not EG or QA, user might choose what fits best or they might be restricted.
            // Based on prompt: "لو دخل جديد مينفعش يحجز في دولة غير اللي فيها"
            // For now locking EG and QA. If they are in UAE, maybe they can book online, so we don't lock if not EG/QA?
            // Actually, we can lock them to empty? No, let's just lock EG to egypt and QA to qatar.
          }
        })
        .catch(err => {
          console.error('Error fetching IP location:', err);
        });
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
  }, []);

  // Step 1
  const [country, setCountry] = useState<Country>('');
  const [sessionType, setSessionType] = useState<SessionType>('');
  const [location, setLocation] = useState<Location>('');
  const [isCountryLocked, setIsCountryLocked] = useState(false);

  // Step 2
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Step 3
  const [patientName, setPatientName] = useState('');
  const [phoneCode, setPhoneCode] = useState('+20');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Update phone code when country changes
  useEffect(() => {
    if (country === 'qatar') {
      setPhoneCode('+974');
    } else if (country === 'egypt') {
      setPhoneCode('+20');
    }
  }, [country]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
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

      let adjustedTime = selectedTime;
      if (country === 'qatar') {
        adjustedTime = qatarTimeMap[selectedTime] || selectedTime;
      }

      const bookingData = {
        patientName,
        phone: `${phoneCode} ${phone}`,
        notes,
        country,
        sessionType,
        location,
        date: selectedDate,
        time: selectedTime,
        adjustedTime: country === 'qatar' ? adjustedTime : undefined,
      };

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء الحجز');
      }

      sessionStorage.setItem('lastBooking', JSON.stringify(data.booking));
      
      // Save profile to local storage for future visits
      localStorage.setItem('patientProfile', JSON.stringify({
        patientName,
        phone,
        phoneCode,
        country
      }));

      toast.success('تم الحجز بنجاح!');

      // Construct WhatsApp Message
      const countrySettings = settings?.countries?.find((c: any) => c.id === country);
      const targetNumber = countrySettings?.whatsappNumber || (country === 'qatar' ? '97477331874' : '201228168170');
      const locationName = settings?.branches?.find((b: any) => b.id === location)?.name || location;
      const countryName = countrySettings?.name || country;
      const displayTime = country === 'qatar' ? adjustedTime : selectedTime;
      
      let message = `مرحباً د. أميرة، قمت بحجز موعد جديد: ✅\n\n`;
      message += `👤 الاسم: ${patientName}\n`;
      message += `🌍 الدولة: ${countryName}\n`;
      message += `📅 التاريخ: ${selectedDate}\n`;
      message += `⏰ الموعد: ${displayTime}\n`;

      if (sessionType === 'online') {
        message += `💻 نوع الجلسة: فيديو (أونلاين)\n`;
        message += `📱 الهاتف: ${phoneCode} ${phone}\n`;
        if (notes) message += `📝 ملاحظات: ${notes}\n`;
        message += `\nبانتظار تأكيدكِ النهائي وتفاصيل رابط الجلسة 🔗✅`;
      } else {
        message += `📍 الفرع: ${locationName} (بالمركز)\n`;
        message += `📱 الهاتف: ${phoneCode} ${phone}\n`;
        if (notes) message += `📝 ملاحظات: ${notes}\n`;
        message += `\nبانتظار تأكيدكِ النهائي وتفاصيل العنوان (اللوكيشن) 📍✨`;
      }

      // Using URL schemes to allow seamless transition directly on mobile without blocking
      const cleanTarget = targetNumber.replace(/\D/g, '');
      const whatsappUrl = `whatsapp://send?phone=${cleanTarget}&text=${encodeURIComponent(message)}`;
      
      // Save the WhatsApp URL for the confirmation page button
      sessionStorage.setItem('lastWhatsappUrl', whatsappUrl);

      // Go to confirmation page first
      router.push('/booking-confirmation');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">جاري التحميل...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!settings) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          <div className="text-center text-red-500 dark:text-red-400">حدث خطأ في تحميل الإعدادات</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {showWelcomeBack && savedProfile && (
        <WelcomeBackModal
          patientName={savedProfile.patientName}
          onConfirm={() => {
            setPatientName(savedProfile.patientName);
            setPhone(savedProfile.phone);
            setPhoneCode(savedProfile.phoneCode || '+20');
            if (savedProfile.country) {
              setCountry(savedProfile.country);
              setIsCountryLocked(true);
            }
            setShowWelcomeBack(false);
          }}
          onDecline={() => {
            localStorage.removeItem('patientProfile');
            setShowWelcomeBack(false);
          }}
        />
      )}
      <Toaster position="bottom-center" richColors />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 transition-colors duration-300">
        <div className="max-w-xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              ابدأ رحلتك نحو الصحة النفسية
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-base">
              خطوات بسيطة لحجز جلستك مع معالجينا المتخصصين
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 transition-colors duration-300"
          >
            <StepIndicator currentStep={step} totalSteps={4} />

            <div className="mt-8 relative overflow-hidden min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {step === 1 && (
                <Step1SessionType
                  country={country}
                  setCountry={setCountry}
                  sessionType={sessionType}
                  setSessionType={setSessionType}
                  location={location}
                  setLocation={setLocation}
                  onNext={() => setStep(2)}
                  settings={settings}
                  isCountryLocked={isCountryLocked}
                />
              )}
              {step === 2 && (
                <Step2DateTime
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  selectedTime={selectedTime}
                  setSelectedTime={setSelectedTime}
                  country={country}
                  sessionType={sessionType}
                  location={location}
                  patientPhone={phone ? `${phoneCode} ${phone}` : undefined}
                  onNext={() => setStep(3)}
                  onBack={() => setStep(1)}
                  settings={settings}
                />
              )}
              {step === 3 && (
                <Step3PatientInfo
                  patientName={patientName}
                  setPatientName={setPatientName}
                  phoneCode={phoneCode}
                  setPhoneCode={setPhoneCode}
                  phone={phone}
                  setPhone={setPhone}
                  notes={notes}
                  setNotes={setNotes}
                  country={country}
                  onNext={() => setStep(4)}
                  onBack={() => setStep(2)}
                />
              )}
              {step === 4 && (
                <Step4Review
                  country={country}
                  sessionType={sessionType}
                  location={location}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  patientName={patientName}
                  phone={`${phoneCode} ${phone}`}
                  isSubmitting={isSubmitting}
                  onConfirm={handleConfirm}
                  onBack={() => setStep(3)}
                  settings={settings}
                />
              )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
