import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const stepLabels = ['نوع الجلسة', 'الموعد', 'البيانات', 'المراجعة'];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative mb-2">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 bg-gray-100 dark:bg-gray-800 -z-10 -translate-y-1/2 rounded-full"></div>
        <div 
          className="absolute right-0 top-1/2 h-1.5 bg-blue-600 -z-10 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        ></div>
        
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          
          return (
            <div 
              key={stepNum} 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20 scale-110 ring-4 ring-white dark:ring-gray-900' : 
                isCompleted ? 'bg-blue-600 text-white ring-4 ring-white dark:ring-gray-900' : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-700'
              }`}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-1">
        {stepLabels.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          return (
            <div 
              key={index} 
              className={`text-xs font-bold transition-colors duration-300 ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 
                isCompleted ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
              }`}
              style={{ width: '40px', textAlign: 'center' }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
