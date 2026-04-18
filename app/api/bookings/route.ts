import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(db, 'bookings'));
    const bookings = querySnapshot.docs.map(doc => doc.data());
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ bookings: [] });
  }
}

export async function POST(request: Request) {
  try {
    const booking = await request.json();
    
    // Fetch existing bookings to check for double booking
    const querySnapshot = await getDocs(collection(db, 'bookings'));
    const bookings = querySnapshot.docs.map(doc => doc.data());
    
    // Check for double booking
    const isTaken = bookings.some(
      (b: any) => 
        b.date === booking.date && 
        b.time === booking.time && 
        b.status !== 'cancelled' &&
        b.sessionType === booking.sessionType &&
        (booking.sessionType === 'online' || (b.country === booking.country && (booking.sessionType !== 'in-center' || b.location === booking.location)))
    );
    
    if (isTaken) {
      return NextResponse.json({ error: 'This time slot is already booked.' }, { status: 400 });
    }
    
    const newBooking = {
      ...booking,
      id: Math.random().toString(36).substring(2, 9),
      referenceNumber: Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      status: booking.status || 'pending',
    };
    
    await setDoc(doc(db, 'bookings', newBooking.id), newBooking);
    return NextResponse.json({ booking: newBooking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedData = await request.json();
    if (!updatedData.id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }
    
    if (updatedData.editSeries && updatedData.seriesId) {
      // Update all future bookings in the series
      const today = new Date().toISOString().split('T')[0];
      const querySnapshot = await getDocs(collection(db, 'bookings'));
      const futureBookings = querySnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.seriesId === updatedData.seriesId && data.date >= today;
      });
      
      const { editSeries, ...dataToUpdate } = updatedData;
      
      await Promise.all(futureBookings.map(doc => {
        const data = doc.data();
        // Keep the original date for each booking in the series, but update time and other fields
        // If the user changed the date, we only apply the time change to the series,
        // or we could shift all dates. For simplicity, we just update time, sessionType, etc.
        // Actually, if they change the date, it's tricky for a series.
        // Let's assume they only change time/location/etc for the series.
        // To be safe, we update everything EXCEPT the date, unless we want to shift dates.
        // Let's just update the time, sessionType, country, location, notes.
        return updateDoc(doc.ref, {
          time: dataToUpdate.time,
          sessionType: dataToUpdate.sessionType,
          country: dataToUpdate.country,
          location: dataToUpdate.location,
          notes: dataToUpdate.notes,
          patientName: dataToUpdate.patientName,
          phone: dataToUpdate.phone
        });
      }));
      
      // Also update the specific one if it's in the past (just in case)
      const bookingRef = doc(db, 'bookings', updatedData.id);
      await updateDoc(bookingRef, dataToUpdate);
      
      return NextResponse.json({ booking: dataToUpdate });
    }
    
    const { editSeries, ...dataToUpdate } = updatedData;
    const bookingRef = doc(db, 'bookings', updatedData.id);
    await updateDoc(bookingRef, dataToUpdate);
    
    return NextResponse.json({ booking: dataToUpdate });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const seriesId = searchParams.get('seriesId');
    
    if (seriesId) {
      // Delete all bookings in the series
      const querySnapshot = await getDocs(collection(db, 'bookings'));
      const bookingsToDelete = querySnapshot.docs.filter(doc => doc.data().seriesId === seriesId);
      
      await Promise.all(bookingsToDelete.map(doc => deleteDoc(doc.ref)));
      return NextResponse.json({ success: true, deletedCount: bookingsToDelete.length });
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Booking ID or Series ID is required' }, { status: 400 });
    }
    
    await deleteDoc(doc(db, 'bookings', id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}
