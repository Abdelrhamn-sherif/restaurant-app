import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  const orders = await db.collection('orders').find({}).toArray();
  const formattedOrders = orders.map(o => ({ ...o, id: o._id.toString() }));
  
  return NextResponse.json(formattedOrders);
}

export async function POST(request: Request) {
  const { tableId, items, sessionToken } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');

  try {
    // 1. Verify table and session token
    const table = await db.collection('tables').findOne({ _id: new ObjectId(tableId) });

    if (!table || table.sessionToken !== sessionToken) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    // 2. Create the order
    const total = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const newOrder = {
      tableId,
      items,
      status: 'pending',
      total,
      timestamp: new Date().toISOString()
    };

    const result = await db.collection('orders').insertOne(newOrder);
    return NextResponse.json({ ...newOrder, id: result.insertedId.toString() });

  } catch (e) {
    return NextResponse.json({ error: 'Server error placing order' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { orderId, status } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  try {
    await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status } }
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
}