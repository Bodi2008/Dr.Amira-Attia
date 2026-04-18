import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

const defaultSettings = {
  countries: [
    { id: 'egypt', name: 'مصر', flag: '🇪🇬', isActive: true, whatsappNumber: '201228168170' },
    { id: 'qatar', name: 'قطر', flag: '🇶🇦', isActive: true, whatsappNumber: '97477331874' }
  ],
  sessionTypes: [
    { id: 'online', name: 'أونلاين', icon: 'Video', isActive: true, availableIn: ['egypt', 'qatar'] },
    { id: 'in-center', name: 'في المركز', icon: 'Building', isActive: true, availableIn: ['egypt', 'qatar'] }
  ],
  branches: [
    { id: 'new-cairo', name: 'التجمع الخامس', countryId: 'egypt', isActive: true },
    { id: 'madinaty', name: 'مدينتي', countryId: 'egypt', isActive: true },
    { id: 'doha', name: 'الدوحة', countryId: 'qatar', isActive: true }
  ],
  timeSlots: [
    '08:00 ص', '09:00 ص', '10:00 ص', '11:00 ص', 
    '12:00 م', '01:00 م', '02:00 م', '03:00 م', 
    '04:00 م', '05:00 م', '06:00 م', '07:00 م'
  ]
};

export async function GET() {
  try {
    const docRef = doc(db, 'system', 'settings');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const settings = { ...defaultSettings, ...data };
      if (!settings.timeSlots) settings.timeSlots = defaultSettings.timeSlots;
      return NextResponse.json({ settings });
    } else {
      // Initialize with default if it doesn't exist
      await setDoc(docRef, defaultSettings);
      return NextResponse.json({ settings: defaultSettings });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ settings: defaultSettings });
  }
}

export async function POST(request: Request) {
  try {
    const newSettings = await request.json();
    await setDoc(doc(db, 'system', 'settings'), newSettings);
    return NextResponse.json({ settings: newSettings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
