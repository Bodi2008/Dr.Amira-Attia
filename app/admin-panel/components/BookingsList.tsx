import React, { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import ManualBookingModal from './ManualBookingModal';

interface Props {
  bookings: any[];
  onUpdate: (b: any[]) => void;
}

export default function BookingsList({ bookings, onUpdate }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      
      const newBookings = bookings.map(b => b.id === id ? data.booking : b);
      onUpdate(newBookings);
      toast.success('تم تحديث حالة الحجز');
    } catch (error) {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const handleManualBookingSuccess = (newBooking: any) => {
    onUpdate([...bookings, newBooking]);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors duration-300">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 transition-colors duration-300">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">قائمة الحجوزات</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          إضافة حجز يدوي
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
            <Clock className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد حجوزات</h3>
          <p className="text-gray-500 dark:text-gray-400">لم يقم أي شخص بالحجز بعد، يمكنك إضافة حجز يدوياً.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">رقم المرجع</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">المريض</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">التاريخ والوقت</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">النوع</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">الحالة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 transition-colors duration-300">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-gray-600 dark:text-gray-400 font-bold transition-colors duration-300">
                      {booking.referenceNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 dark:text-white">{booking.patientName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">{booking.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 dark:text-white">{booking.date}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-bold">{booking.time}</div>
                    {booking.isRescheduleRequest && booking.originalDateTime && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-through" title="الموعد الأصلي">
                        {booking.originalDateTime.date} - {booking.originalDateTime.time}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 dark:text-white">
                      {booking.sessionType === 'online' ? 'أونلاين' : 'في المركز'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {booking.country === 'egypt' ? 'مصر' : 'قطر'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors duration-300 ${
                        booking.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
                        booking.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' :
                        'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-600 dark:bg-green-500' :
                          booking.status === 'cancelled' ? 'bg-red-600 dark:bg-red-500' :
                          'bg-yellow-600 dark:bg-yellow-500'
                        }`}></div>
                        {booking.status === 'confirmed' ? 'مؤكد' :
                         booking.status === 'cancelled' ? 'ملغي' : 'في الانتظار'}
                      </span>
                      
                      {booking.isRescheduleRequest && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 transition-colors duration-300">
                          طلب تغيير موعد
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {booking.status !== 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(booking.id, 'confirmed')}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-xl transition-colors shadow-sm"
                          title={booking.isRescheduleRequest ? "تأكيد الموعد الجديد" : "تأكيد"}
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => handleStatusChange(booking.id, 'cancelled')}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition-colors shadow-sm"
                          title="إلغاء"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ManualBookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleManualBookingSuccess} 
      />
    </div>
  );
}
