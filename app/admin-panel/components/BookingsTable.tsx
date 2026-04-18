'use client';
import React, { useState } from 'react';
import { Search, Filter, ChevronUp, ChevronDown, Trash2, Edit } from 'lucide-react';

export interface Booking {
  id: string;
  patientName: string;
  phone: string;
  country: string;
  sessionType: string;
  location?: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  paymentStatus?: 'paid' | 'unpaid';
  price?: number;
  currency?: string;
  referenceNumber: string;
  createdAt: string;
  adjustedTime?: string;
}

interface BookingsTableProps {
  bookings: Booking[];
  onPaymentStatusChange: (id: string, paymentStatus: 'paid' | 'unpaid') => void;
  onStatusChange: (id: string, status: Booking['status']) => void;
  onDelete: (id: string) => void;
  onEdit?: (booking: Booking) => void;
}

const statusConfig: Record<Booking['status'], { label: string; className: string }> = {
  confirmed: { label: 'مؤكد', className: 'bg-green-100 text-green-700' },
  pending: { label: 'قيد الانتظار', className: 'bg-amber-100 text-amber-700' },
  completed: { label: 'مكتمل', className: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'ملغي', className: 'bg-red-100 text-red-700' },
};

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: 'تم الدفع ✓', className: 'bg-green-100 text-green-700' },
  unpaid: { label: 'لم يتم الدفع ✕', className: 'bg-red-100 text-red-700' },
};

const locationLabels: Record<string, string> = {
  'new-cairo': 'التجمع',
  madinaty: 'مدينتي',
  online: 'أونلاين',
};

export default function BookingsTable({ bookings, onPaymentStatusChange, onStatusChange, onDelete, onEdit }: BookingsTableProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Booking>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);
  const [openPaymentMenu, setOpenPaymentMenu] = useState<string | null>(null);
  const perPage = 5;

  const filtered = bookings
    .filter((b) => {
      const matchSearch =
        !search ||
        b.patientName.toLowerCase().includes(search.toLowerCase()) ||
        b.phone.includes(search) ||
        b.referenceNumber.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || b.status === filterStatus;
      const matchType = filterType === 'all' || b.sessionType === filterType;
      const matchCountry = filterCountry === 'all' || b.country === filterCountry;
      const matchPayment = filterPayment === 'all' || (filterPayment === 'paid' ? b.paymentStatus === 'paid' : b.paymentStatus !== 'paid');
      const matchLocation = filterLocation === 'all' || (filterLocation === 'online' ? b.sessionType === 'online' : b.location === filterLocation);
      return matchSearch && matchStatus && matchType && matchCountry && matchPayment && matchLocation;
    })
    .filter((b: any) => !b.seriesId)
    .sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      const cmp = String(av).localeCompare(String(bv), 'ar');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleSort = (field: keyof Booking) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: keyof Booking }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-600" />
      : <ChevronDown size={12} className="text-blue-600" />;
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف أو رقم الحجز..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500 text-right transition-colors duration-300 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 text-right transition-colors duration-300"
        >
          <option value="all">كل الحالات</option>
          <option value="confirmed">مؤكد</option>
          <option value="pending">قيد الانتظار</option>
          <option value="completed">مكتمل</option>
          <option value="cancelled">ملغي</option>
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 text-right transition-colors duration-300"
        >
          <option value="all">كل الأنواع</option>
          <option value="online">أونلاين</option>
          <option value="in-center">في المركز</option>
        </select>

        {/* Country Filter */}
        <select
          value={filterCountry}
          onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 text-right transition-colors duration-300"
        >
          <option value="all">كل الدول</option>
          <option value="egypt">مصر 🇪🇬</option>
          <option value="qatar">قطر 🇶🇦</option>
        </select>

        {/* Payment Filter */}
        <select
          value={filterPayment}
          onChange={(e) => { setFilterPayment(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 text-right transition-colors duration-300"
        >
          <option value="all">حالة الدفع (الكل)</option>
          <option value="paid">تم الدفع</option>
          <option value="unpaid">لم يتم الدفع</option>
        </select>

        {/* Location Filter */}
        <select
          value={filterLocation}
          onChange={(e) => { setFilterLocation(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 text-right transition-colors duration-300"
        >
          <option value="all">المكان (الكل)</option>
          <option value="online">أونلاين</option>
          <option value="new-cairo">التجمع</option>
          <option value="madinaty">مدينتي</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
                {[
                  { key: 'referenceNumber' as keyof Booking, label: 'رقم الحجز' },
                  { key: 'patientName' as keyof Booking, label: 'الاسم' },
                  { key: 'phone' as keyof Booking, label: 'الهاتف' },
                  { key: 'country' as keyof Booking, label: 'الدولة' },
                  { key: 'sessionType' as keyof Booking, label: 'النوع' },
                  { key: 'date' as keyof Booking, label: 'التاريخ' },
                  { key: 'time' as keyof Booking, label: 'الوقت' },
                ].map((col) => (
                  <th
                    key={`th-${col.key}`}
                    className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5 justify-end">
                      <SortIcon field={col.key} />
                      {col.label}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center transition-colors duration-300">
                        <Search size={20} className="text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold">لا توجد حجوزات تطابق البحث</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs">جرّب تغيير كلمة البحث أو الفلتر</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((booking, idx) => (
                  <tr
                    key={booking.id}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-colors ${
                      idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/30 dark:bg-gray-800/30'
                    }`}
                  >
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                      {booking.referenceNumber}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {booking.patientName}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 font-mono text-xs whitespace-nowrap" dir="ltr">
                      {booking.phone}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-sm dark:text-gray-300">
                        {booking.country === 'egypt' ? '🇪🇬 مصر' : '🇶🇦 قطر'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        booking.sessionType === 'online' ?'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' :'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400'
                      }`}>
                        {booking.sessionType === 'online' ? '💻 أونلاين' : `📍 ${locationLabels[booking.location || ''] || 'في المركز'}`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap tabular-nums">
                      {booking.date}
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap tabular-nums" dir="ltr">
                      {booking.country === 'qatar' && booking.adjustedTime
                        ? `${booking.time} / ${booking.adjustedTime} 🕐`
                        : booking.time}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <select
                          value={booking.status}
                          onChange={(e) => onStatusChange(booking.id, e.target.value as Booking['status'])}
                          className={`text-xs font-bold rounded-lg px-2 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${statusConfig[booking.status]?.className || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                        >
                          <option value="confirmed">مؤكد</option>
                          <option value="pending">قيد الانتظار</option>
                          <option value="completed">مكتمل</option>
                          <option value="cancelled">ملغي</option>
                        </select>

                        <select
                          value={booking.paymentStatus || 'unpaid'}
                          onChange={(e) => onPaymentStatusChange(booking.id, e.target.value as 'paid' | 'unpaid')}
                          className={`text-xs font-bold rounded-lg px-2 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${paymentStatusConfig[booking.paymentStatus || 'unpaid']?.className || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                        >
                          <option value="paid">تم الدفع ✓</option>
                          <option value="unpaid">لم يتم الدفع ✕</option>
                        </select>

                        {onEdit && (
                          <button
                            type="button"
                            title="تعديل الموعد"
                            onClick={() => onEdit(booking)}
                            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-all duration-150"
                          >
                            <Edit size={15} />
                          </button>
                        )}

                        <button
                          type="button"
                          title="حذف الحجز"
                          onClick={() => onDelete(booking.id)}
                          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-all duration-150"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 transition-colors duration-300">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              عرض {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} من {total} حجز
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                السابق
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                    p === page
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
