import { Metadata } from 'next';
import AdminClientLayout from './AdminClientLayout';
import React from 'react';

export const metadata: Metadata = {
  title: 'الإدارة | Dr.Amira Attia',
  description: 'لوحة تحكم حجوزات د. أميرة عطية',
  manifest: '/manifest-admin.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Admin Panel', // This makes iOS save it as "Admin Panel"
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminClientLayout>{children}</AdminClientLayout>;
}
