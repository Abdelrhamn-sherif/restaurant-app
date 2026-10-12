import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  const { orderId, tableId, sessionToken, method } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');

  try {
    const table = await db.collection('tables').findOne({ _id: new ObjectId(tableId) });
    if (!table || table.sessionToken !== sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Set status based on the payment method
    const newStatus = method === 'cash' ? 'cash-requested' : 'paid';

    await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status: newStatus } }
    );

    await pusherServer.trigger('restaurant', 'orders-updated', {});
    return NextResponse.json({ success: true });

  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}