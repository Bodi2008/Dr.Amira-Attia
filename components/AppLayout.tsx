import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Phone, Facebook, Twitter, Instagram, } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { TbHealthRecognition } from "react-icons/tb";
import { ThemeToggle } from './ThemeToggle';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.jpg" alt="Dr. Amira Attia Logo" width={48} height={48} className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-full" />
              <span className="font-bold text-sm sm:text-xl text-gray-900 dark:text-white">Dr.Amira Attia</span>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-4">
              <Link 
                href="/" 
                className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-700 dark:hover:text-blue-400 font-bold transition-all text-sm sm:text-base shadow-sm"
              >
                الرئيسية
              </Link>
              <Link 
                href="/my-bookings" 
                className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-700 dark:hover:text-blue-400 font-bold transition-all text-sm sm:text-base shadow-sm"
              >
                حجوزاتي
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                سرية تامة
              </h3>
              <p className="text-gray-400 text-sm">نحن نضمن سرية جميع بياناتك وجلساتك العلاجية.</p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-400" />
                تواصل معنا
              </h3>
<a href="https://wa.me/201228168170"
  target="_blank" 
  className="text-gray-400 text-sm block">
  مصر : <span dir="ltr" className="whitespace-nowrap">+20 122 816 8170</span>
</a>

<a href="https://wa.me/97477331874"
  target="_blank" 
  className="text-gray-400 text-sm block">
  قطر: <span dir="ltr" className="whitespace-nowrap">+974 7733 1874</span>
</a>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">تابعنا على</h3>
              <div className="flex items-center gap-4">
                <a href="https://www.facebook.com/amiraattiatrainer" 
                  target="_blank" 
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://www.instagram.com/dr.amira_attia/"
                  target="_blank" 
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-600 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Dr.Amira Attia. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
}