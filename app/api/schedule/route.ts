import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

const defaultSchedule = {
  egyptCenter: {},
  qatarCenter: {},
  online: {}
};

export async function GET() {
  try {
    const docRef = doc(db, 'system', 'schedule');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return NextResponse.json({ schedule: docSnap.data() });
    } else {
      // Initialize with default if it doesn't exist
      await setDoc(docRef, defaultSchedule);
      return NextResponse.json({ schedule: defaultSchedule });
    }
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ schedule: defaultSchedule });
  }
}

export async function POST(request: Request) {
  try {
    const newSchedule = await request.json();
    await setDoc(doc(db, 'system', 'schedule'), newSchedule);
    return NextResponse.json({ schedule: newSchedule });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
