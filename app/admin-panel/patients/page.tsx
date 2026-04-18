'use client';
import React, { useState, useEffect } from 'react';
import PatientProfiles from '../components/PatientProfiles';
import ManualBookingModal from '../components/ManualBookingModal';
import DeleteBookingModal from '../components/DeleteBookingModal';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function PatientsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialBookingData, setInitialBookingData] = useState<{patientName?: string, phone?: string}>({});
  const [bookingToEdit, setBookingToEdit] = useState<any>(null);
  const [deleteModalConfig, setDeleteModalConfig] = useState<{ isOpen: boolean; booking: any | null }>({
    isOpen: false,
    booking: null,
  });

  const loadData = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'bookings'));
      const fetchedBookings = snapshot.docs.map(doc => doc.data());
      setBookings(fetchedBookings || []);
    } catch (error: any) {
      console.error('Error loading patients data:', error);
      toast.error(`حدث خطأ أثناء تحميل البيانات: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePaymentStatusChange = async (id: string, paymentStatus: 'paid' | 'unpaid', isBulk = false) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, paymentStatus }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setBookings(prev => prev.map((b) => b.id === id ? { ...b, paymentStatus } : b));
      if (!isBulk) toast.success('تم تحديث حالة الدفع');
    } catch (error) {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const handleStatusChange = async (id: string, status: string, isBulk = false) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setBookings(prev => prev.map((b) => b.id === id ? { ...b, status } : b));
      if (!isBulk) toast.success('تم تحديث حالة الحجز');
    } catch (error) {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const handleNewBooking = (patientName?: string, phone?: string) => {
    setBookingToEdit(null);
    setInitialBookingData({ patientName, phone });
    setIsModalOpen(true);
  };

  const handleEditBooking = (booking: any) => {
    setBookingToEdit(booking);
    setIsModalOpen(true);
  };

  const handleDeleteBooking = async (booking: any) => {
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
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      toast.success('تم الحذف بنجاح');
      loadData();
    } catch (error) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PatientProfiles 
        bookings={bookings} 
        onStatusChange={handleStatusChange}
        onPaymentStatusChange={handlePaymentStatusChange}
        onRefresh={loadData}
        onNewBooking={handleNewBooking}
        onEditBooking={handleEditBooking}
        onDeleteBooking={handleDeleteBooking}
      />

      <ManualBookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setBookingToEdit(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setBookingToEdit(null);
          loadData();
        }}
        initialData={initialBookingData}
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
