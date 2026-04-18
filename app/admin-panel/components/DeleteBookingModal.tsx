import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteBookingModalProps {
  isOpen: boolean;
  booking: any;
  onClose: () => void;
  onConfirm: (deleteSeries: boolean) => void;
}

export default function DeleteBookingModal({ isOpen, booking, onClose, onConfirm }: DeleteBookingModalProps) {
  const [deleteSeries, setDeleteSeries] = useState(false);

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-red-600 bg-red-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">حذف الحجز</h3>
              <p className="text-gray-600 mb-4">
                هل أنت متأكد من حذف حجز المريض <strong>{booking.patientName}</strong>؟
              </p>
              
              {booking.seriesId && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mt-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteSeries}
                      onChange={(e) => setDeleteSeries(e.target.checked)}
                      className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    />
                    <div>
                      <div className="font-bold text-red-900">حذف جميع الحجوزات المستقبلية</div>
                      <div className="text-sm text-red-700 mt-1">
                        هذا الحجز جزء من حجز مستمر. بتفعيل هذا الخيار، سيتم حذف هذا الحجز وجميع الحجوزات القادمة المرتبطة به.
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-xl transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onConfirm(deleteSeries);
              onClose();
            }}
            className="px-5 py-2.5 text-white font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-red-600 hover:bg-red-700 focus:ring-red-500 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}
