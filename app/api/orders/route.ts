import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { pusherServer } from '@/lib/pusher';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get('tableId');
  
  const client = await clientPromise;
  const db = client.db('restaurant_app');

  if (tableId) {
    const activeOrder = await db.collection('orders').findOne({
      tableId,
      status: { $nin: ['completed', 'cancelled'] }
    });
    if (!activeOrder) return NextResponse.json({ error: 'No active order' }, { status: 404 });
    return NextResponse.json({ ...activeOrder, id: activeOrder._id.toString() });
  }

  const orders = await db.collection('orders').find({
    status: { $nin: ['completed', 'cancelled'] }
  }).toArray();
  const formattedOrders = orders.map(o => ({ ...o, id: o._id.toString() }));
  
  return NextResponse.json(formattedOrders);
}

export async function POST(request: Request) {
  const { tableId, items, sessionToken } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');

  try {
    const table = await db.collection('tables').findOne({ _id: new ObjectId(tableId) });
    if (!table || table.sessionToken !== sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const total = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    const existingOrder = await db.collection('orders').findOne({
      tableId,
      status: { $nin: ['completed', 'cancelled', 'paid'] }
    });

    if (existingOrder) {
      const updatedItems = [...existingOrder.items];
      items.forEach((newItem: any) => {
        const existing = updatedItems.find(i => i.id === newItem.id);
        if (existing) {
          existing.quantity += newItem.quantity;
        } else {
          updatedItems.push(newItem);
        }
      });

      const newTotal = existingOrder.total + total;
      await db.collection('orders').updateOne(
        { _id: existingOrder._id },
        { $set: { items: updatedItems, total: newTotal, status: 'pending' } }
      );
      
      await pusherServer.trigger('restaurant', 'orders-updated', {});
      return NextResponse.json({ success: true, id: existingOrder._id.toString() });
    }

    const newOrder = { tableId, sessionToken, items, status: 'pending', total, timestamp: new Date().toISOString() };
    const result = await db.collection('orders').insertOne(newOrder);
    
    await pusherServer.trigger('restaurant', 'orders-updated', {});
    return NextResponse.json({ ...newOrder, id: result.insertedId.toString() });
  } catch (e: any) {
    console.error('Order POST Error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { orderId, status } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  try {
    await db.collection('orders').updateOne({ _id: new ObjectId(orderId) }, { $set: { status } });
    await pusherServer.trigger('restaurant', 'orders-updated', {});
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
}