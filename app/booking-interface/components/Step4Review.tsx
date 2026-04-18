import React from 'react';
import { CheckCircle, MapPin, Video, Calendar, Clock, User, Phone } from 'lucide-react';
import { Country, SessionType, Location } from '../types';

interface Props {
  country: Country;
  sessionType: SessionType;
  location: Location;
  selectedDate: string;
  selectedTime: string;
  patientName: string;
  phone: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
  settings: any;
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

export default function Step4Review({
  country, sessionType, location, selectedDate, selectedTime, patientName, phone, isSubmitting, onConfirm, onBack, settings
}: Props) {
  const getCountryName = (c: Country) => settings?.countries.find((x: any) => x.id === c)?.name || c;
  const getSessionTypeName = (s: SessionType) => settings?.sessionTypes.find((x: any) => x.id === s)?.name || s;
  const getLocationName = (l: Location) => settings?.branches.find((x: any) => x.id === l)?.name || l;

  const displayTime = country === 'qatar' ? qatarTimeMap[selectedTime] : selectedTime;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">مراجعة بيانات الحجز</h2>
        <p className="text-gray-500 dark:text-gray-400">يرجى التأكد من صحة البيانات قبل التأكيد</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">الاسم</p>
            <p className="font-bold text-gray-900 dark:text-white">{patientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">رقم الهاتف</p>
            <p className="font-bold text-gray-900 dark:text-white" dir="ltr">{phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          {sessionType === 'online' ? <Video className="w-5 h-5 text-gray-400 dark:text-gray-500" /> : <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">نوع الجلسة</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {getSessionTypeName(sessionType)}
              {sessionType === 'in-center' && ` - ${getLocationName(location)}`}
              <span className="text-gray-500 dark:text-gray-400 font-normal text-sm mr-2">({getCountryName(country)})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">التاريخ</p>
            <p className="font-bold text-gray-900 dark:text-white">{selectedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">الوقت</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {displayTime}
              {country === 'qatar' && (
                <span className="text-blue-600 dark:text-blue-400 text-sm mr-2">
                  (بتوقيت قطر)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full sm:w-1/3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-4 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          تعديل
        </button>
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="w-full sm:w-2/3 bg-blue-600 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
        >
          {isSubmitting ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              تأكيد الحجز
              <CheckCircle className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
