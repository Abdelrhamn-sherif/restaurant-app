import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  const { orderId, tableId, sessionToken } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');

  try {
    // 1. Verify session is still active and valid for this table
    const table = await db.collection('tables').findOne({ _id: new ObjectId(tableId) });

    if (!table || table.sessionToken !== sessionToken) {
      return NextResponse.json({ error: 'Unauthorized or expired session' }, { status: 403 });
    }

    // 2. Find order and check current status
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId), tableId });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'completed') {
      return NextResponse.json({ error: 'Order already completed' }, { status: 400 });
    }

    // 3. Update status to paid
    await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status: 'paid' } }
    );

    return NextResponse.json({ success: true, order: { ...order, status: 'paid', id: orderId } });

  } catch (e) {
    return NextResponse.json({ error: 'Server error processing payment' }, { status: 500 });
  }
}