import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const phone = searchParams.get('phone');
    const referenceNumber = searchParams.get('referenceNumber');

    if (!token && !phone && !referenceNumber) {
      return NextResponse.json({ error: 'Token, phone, or reference number is required' }, { status: 400 });
    }

    let userPhone = phone;
    let patientData = null;

    if (token) {
      // Verify token in database
      const patientDoc = await getDoc(doc(db, 'patients', token));
      
      if (!patientDoc.exists()) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }

      patientData = patientDoc.data();
      userPhone = patientData.phone;
    }

    let userBookings: any[] = [];
    const bookingsRef = collection(db, 'bookings');

    if (referenceNumber) {
      const q = query(bookingsRef, where('referenceNumber', '==', referenceNumber));
      const snapshot = await getDocs(q);
      userBookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (userBookings.length > 0 && !patientData) {
        patientData = {
          name: userBookings[0].patientName,
          phone: userBookings[0].phone
        };
      }
    } else if (userPhone) {
      const snapshot = await getDocs(bookingsRef);
      const allBookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      userBookings = allBookings.filter((b: any) => b.phone === userPhone);
      
      if (userBookings.length > 0 && !patientData) {
        patientData = {
          name: userBookings[0].patientName,
          phone: userBookings[0].phone
        };
      }
    }

    if (!patientData) {
      patientData = { name: 'زائر', phone: userPhone || '' };
    }

    return NextResponse.json({ 
      bookings: userBookings, 
      patient: patientData 
    });
  } catch (error) {
    console.error('Error fetching secure bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}
