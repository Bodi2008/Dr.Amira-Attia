import React from 'react';
import { User, ArrowRight, UserPlus } from 'lucide-react';

interface Props {
  patientName: string;
  onConfirm: () => void;
  onDecline: () => void;
}

export default function WelcomeBackModal({ patientName, onConfirm, onDecline }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 transform transition-all scale-100 animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 mb-6 shadow-inner">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3 font-serif">أهلاً بك مجدداً ✨</h2>
          <p className="text-xl text-blue-600 font-semibold mb-2">{patientName}</p>
          <p className="text-gray-500">هل تود الحجز بنفس بياناتك السابقة لتوفير الوقت؟</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={onConfirm}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5"
          >
            نعم، أكمل ببياناتي
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={onDecline}
            className="w-full flex items-center justify-center gap-3 bg-gray-50 text-gray-700 py-4 px-6 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all border-2 border-gray-100 hover:border-gray-200"
          >
            <UserPlus className="w-5 h-5" />
            لا، حجز لمريض جديد
          </button>
        </div>
      </div>
    </div>
  );
}
