import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { phone, name } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }

    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('phone', '==', phone));
    const snapshot = await getDocs(q);

    let token;
    
    if (snapshot.empty) {
      // Generate a new token if patient doesn't exist
      token = crypto.randomUUID();
      await setDoc(doc(db, 'patients', token), {
        phone,
        name: name || '',
        token,
        createdAt: new Date().toISOString()
      });
    } else {
      // Return existing token
      token = snapshot.docs[0].data().token;
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
