import React from 'react';
import { Users, Video, Building } from 'lucide-react';

interface Props {
  bookings: any[];
}

export default function Statistics({ bookings }: Props) {
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  
  const uniqueBookingsMap = new Map();
  
  confirmedBookings.forEach(b => {
    if (b.seriesId) {
      if (!uniqueBookingsMap.has(b.seriesId)) {
        uniqueBookingsMap.set(b.seriesId, b);
      }
    } else {
      uniqueBookingsMap.set(b.id, b);
    }
  });

  const uniqueBookings = Array.from(uniqueBookingsMap.values());
  const totalBookings = uniqueBookings.length;
  const onlineBookings = uniqueBookings.filter(b => b.sessionType === 'online').length;
  const inCenterBookings = uniqueBookings.filter(b => b.sessionType === 'in-center').length;

  const stats = [
    {
      label: 'إجمالي الحجوزات',
      value: totalBookings,
      icon: Users,
      colorClass: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
    },
    {
      label: 'جلسات أونلاين',
      value: onlineBookings,
      icon: Video,
      colorClass: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
    },
    {
      label: 'جلسات في المركز',
      value: inCenterBookings,
      icon: Building,
      colorClass: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.colorClass}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{stat.label}</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
