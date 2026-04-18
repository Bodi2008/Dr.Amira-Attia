'use client';
import React, { useState, useEffect } from 'react';
import { Lock, LogOut, LayoutDashboard, Settings, Users, Bell, Download } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';

export default function AdminClientLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasRescheduleRequests, setHasRescheduleRequests] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('adminAuth');
    if (auth === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAuthenticated(true);
      
      // Fetch bookings to check for reschedule requests
      getDocs(collection(db, 'bookings'))
        .then(snapshot => {
          const bookings = snapshot.docs.map(doc => doc.data());
          const hasRequests = bookings.some((b: any) => b.isRescheduleRequest && b.status === 'pending');
          setHasRescheduleRequests(hasRequests);
        })
        .catch(err => console.error('Error fetching bookings for notifications:', err));

      // Real-time listener for new bookings
      const now = new Date().toISOString();
      const q = query(collection(db, 'bookings'), where('createdAt', '>', now));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const booking = change.doc.data();
            if (!booking.seriesId || booking.isFirstInSeries) {
              toast.success(
                <div className="flex flex-col gap-1">
                  <span className="font-bold">حجز جديد! 🎉</span>
                  <span className="text-sm">{booking.patientName} - {booking.date} {booking.time}</span>
                </div>, 
                { duration: 8000, icon: <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" /> }
              );
            }
          }
        });
      }, (error) => {
        console.error("Error listening to new bookings:", error);
      });

      setLoading(false);
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBtn(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Amira' && password === '1871982') {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
    } else {
      toast.error('بيانات الدخول غير صحيحة');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
    router.push('/admin-panel');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <Toaster position="bottom-center" richColors />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-800 transition-colors duration-300"
          >
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6"
            >
              <Lock className="w-8 h-8" />
            </motion.div>
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">تسجيل الدخول للإدارة</h2>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم المستخدم</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent text-right transition-colors duration-300"
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent text-right transition-colors duration-300"
                  dir="ltr"
                  required
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-blue-600 dark:bg-blue-500 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
              >
                دخول
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Toaster position="bottom-center" richColors />
      <div className="pb-12">
        <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">الإدارة</h1>
                <nav className="flex items-center gap-2 min-w-max">
                  <Link 
                    href="/admin-panel" 
                    className={`px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${pathname === '/admin-panel' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <LayoutDashboard size={18} />
                    <span className="hidden sm:inline">الرئيسية</span>
                  </Link>
                  <Link 
                    href="/admin-panel/patients" 
                    className={`px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 relative ${pathname === '/admin-panel/patients' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <Users size={18} />
                    <span className="hidden sm:inline">ملفات المرضى</span>
                    {hasRescheduleRequests && (
                      <span className="absolute top-2 left-2 w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse"></span>
                    )}
                  </Link>
                  <Link 
                    href="/admin-panel/settings" 
                    className={`px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${pathname === '/admin-panel/settings' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <Settings size={18} />
                    <span className="hidden sm:inline">الإعدادات</span>
                  </Link>
                </nav>
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                {showInstallBtn && (
                  <button 
                    onClick={handleInstallClick}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">تثبيت التطبيق</span>
                  </button>
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full hidden sm:block">
                  آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold flex items-center gap-1"
                >
                  <LogOut size={16} />
                  تسجيل خروج
                </button>
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
