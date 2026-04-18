'use client';
import React from 'react';
import { Settings } from 'lucide-react';
import SettingsManager from '../components/SettingsManager';

export default function SettingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Settings className="text-blue-600 dark:text-blue-400" />
          الإعدادات
        </h2>
        <SettingsManager />
      </section>
    </div>
  );
}
