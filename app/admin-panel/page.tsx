'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, BarChart3, CalendarDays } from 'lucide-react';
import WorkHoursManager from './components/WorkHoursManager';
import Statistics from './components/Statistics';
import MonthlyCalendar from './components/MonthlyCalendar';
import BookingsTable from './components/BookingsTable';
import ManualBookingModal from './components/ManualBookingModal';
import DeleteBookingModal from './components/DeleteBookingModal';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export default function AdminPanelPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<any>(null);
  const [deleteModalConfig, setDeleteModalConfig] = useState<{ isOpen: boolean; booking: any | null }>({
    isOpen: false,
    booking: null,
  });

  const loadData = async () => {
    try {
      const [bookingsSnapshot, scheduleSnapshot] = await Promise.all([
        getDocs(collection(db, 'bookings')),
        getDoc(doc(db, 'system', 'schedule'))
      ]);
      
      const fetchedBookings = bookingsSnapshot.docs.map(d => d.data());
      const fetchedSchedule = scheduleSnapshot.exists() ? scheduleSnapshot.data() : { egyptCenter: {}, qatarCenter: {}, online: {} };
      
      setBookings(fetchedBookings || []);
      setSchedule(fetchedSchedule || []);
    } catch (error: any) {
      console.error('Error loading admin data:', error);
      toast.error(`حدث خطأ أثناء تحميل البيانات: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePaymentStatusChange = async (id: string, paymentStatus: 'paid' | 'unpaid') => {
    try {
      const bookingToUpdate = bookings.find(b => b.id === id);
      if (!bookingToUpdate) return;
      
      const updatedBooking = { ...bookingToUpdate, paymentStatus };
      
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBooking),
      });

      if (!res.ok) throw new Error('Failed to update');

      setBookings(prev => prev.map((b) => b.id === id ? updatedBooking : b));
      toast.success('تم تحديث حالة الدفع');
    } catch (error) {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const bookingToUpdate = bookings.find(b => b.id === id);
      if (!bookingToUpdate) return;
      
      const updatedBooking = { ...bookingToUpdate, status };
      
      // If resolving a reschedule request, clear the flag
      if (status !== 'pending' && updatedBooking.isRescheduleRequest) {
        updatedBooking.isRescheduleRequest = false;
      }
      
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBooking),
      });

      if (!res.ok) throw new Error('Failed to update');

      setBookings(prev => prev.map((b) => b.id === id ? updatedBooking : b));
      toast.success('تم تحديث حالة الحجز');
    } catch (error) {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const handleDeleteBooking = async (id: string) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    setDeleteModalConfig({ isOpen: true, booking });
  };

  const confirmDelete = async (deleteSeries: boolean) => {
    const booking = deleteModalConfig.booking;
    if (!booking) return;

    let url = `/api/bookings?id=${booking.id}`;
    if (booking.seriesId && deleteSeries) {
      url = `/api/bookings?seriesId=${booking.seriesId}`;
    }

    try {
      const res = await fetch(url, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      if (url.includes('seriesId')) {
        setBookings(prev => prev.filter((b) => b.seriesId !== booking.seriesId));
      } else {
        setBookings(prev => prev.filter((b) => b.id !== booking.id));
      }
      
      toast.success('تم حذف الحجز بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 relative">
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BarChart3 className="text-blue-600 dark:text-blue-400" />
          الإحصائيات
        </h2>
        <Statistics bookings={bookings} />
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Calendar className="text-blue-600 dark:text-blue-400" />
          إدارة المواعيد
        </h2>
        <WorkHoursManager 
          schedule={schedule}
          bookings={bookings}
          onUpdate={setSchedule}
        />
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <CalendarDays className="text-blue-600 dark:text-blue-400" />
          التقويم الشهري
        </h2>
        <MonthlyCalendar 
          bookings={bookings}
          onUpdate={setBookings}
          schedule={schedule}
        />
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <CalendarDays className="text-blue-600 dark:text-blue-400" />
          جدول الحجوزات
        </h2>
        <BookingsTable 
          bookings={bookings}
          onPaymentStatusChange={handlePaymentStatusChange}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteBooking}
          onEdit={(booking) => {
            setBookingToEdit(booking);
            setIsModalOpen(true);
          }}
        />
      </section>

      <ManualBookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setBookingToEdit(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setBookingToEdit(null);
          // reload data
          fetch('/api/bookings')
            .then(res => res.json())
            .then(data => setBookings(data.bookings || []));
        }}
        bookingToEdit={bookingToEdit}
      />

      <DeleteBookingModal
        isOpen={deleteModalConfig.isOpen}
        booking={deleteModalConfig.booking}
        onClose={() => setDeleteModalConfig({ isOpen: false, booking: null })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
