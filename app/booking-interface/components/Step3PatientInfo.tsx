import React from 'react';
import { User, Phone, FileText } from 'lucide-react';

interface Props {
  patientName: string;
  setPatientName: (n: string) => void;
  phoneCode: string;
  setPhoneCode: (c: string) => void;
  phone: string;
  setPhone: (p: string) => void;
  notes: string;
  setNotes: (n: string) => void;
  country: string;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3PatientInfo({
  patientName, setPatientName, phoneCode, setPhoneCode, phone, setPhone, notes, setNotes, country, onNext, onBack
}: Props) {
  const isPhoneValid = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (phoneCode === '+20') {
      return cleanPhone.length === 11;
    } else if (phoneCode === '+974') {
      return cleanPhone.length === 8;
    }
    return cleanPhone.length >= 8;
  };

  const isValid = patientName.trim().length > 2 && isPhoneValid();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          الاسم بالكامل
        </label>
        <input
          type="text"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="أدخل اسمك الثلاثي"
          className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          رقم الهاتف
        </label>
        <div className="flex gap-2" dir="ltr">
          <select
            value={phoneCode}
            onChange={(e) => setPhoneCode(e.target.value)}
            className="w-28 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center font-bold"
          >
            <option value="+20">+20 (مصر)</option>
            <option value="+974">+974 (قطر)</option>
          </select>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder={phoneCode === '+20' ? "0100 123 4567" : "1234 5678"}
            className="flex-1 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors outline-none text-left"
          />
        </div>
        {!isPhoneValid() && phone.length > 0 && (
          <p className="text-red-500 dark:text-red-400 text-xs mt-2 font-bold">
            {phoneCode === '+20' ? 'رقم الهاتف المصري يجب أن يتكون من 11 رقم' : 'رقم الهاتف القطري يجب أن يتكون من 8 أرقام'}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          ملاحظات إضافية (اختياري)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي معلومات تود إضافتها للأخصائي..."
          rows={3}
          className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors outline-none resize-none"
        ></textarea>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <button
          onClick={onBack}
          className="w-full sm:w-1/3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-4 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          رجوع
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="w-full sm:w-2/3 bg-blue-600 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
