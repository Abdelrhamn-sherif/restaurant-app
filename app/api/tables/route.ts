import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { pusherServer } from '@/lib/pusher';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const client = await clientPromise;
  const db = client.db('restaurant_app');

  if (id) {
    try {
      const table = await db.collection('tables').findOne({ _id: new ObjectId(id) });
      if (!table) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ ...table, id: table._id.toString() });
    } catch (e) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
  }

  const tables = await db.collection('tables').find({}).toArray();
  const formattedTables = tables.map(t => ({ ...t, id: t._id.toString() }));
  return NextResponse.json(formattedTables);
}

export async function POST(request: Request) {
  const body = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  if (body.name && body.seats) {
    const newTable = { name: body.name, seats: parseInt(body.seats), sessionToken: null, needsHelp: false };
    const result = await db.collection('tables').insertOne(newTable);
    
    await pusherServer.trigger('restaurant', 'tables-updated', {});
    return NextResponse.json({ ...newTable, id: result.insertedId.toString() });
  }
  return NextResponse.json({ error: 'Name and seats required' }, { status: 400 });
}

export async function PUT(request: Request) {
  const { tableId, action } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  try {
    if (action === 'checkin') {
      const table = await db.collection('tables').findOne({ _id: new ObjectId(tableId) });
      if (table?.sessionToken) return NextResponse.json({ error: 'Table already occupied' }, { status: 403 });

      const sessionToken = crypto.randomUUID();
      await db.collection('tables').updateOne(
        { _id: new ObjectId(tableId) },
        { $set: { sessionToken, needsHelp: false } }
      );
      
      await pusherServer.trigger('restaurant', 'tables-updated', {});
      return NextResponse.json({ sessionToken });
    } 
    
    if (action === 'clear') {
      await db.collection('tables').updateOne(
        { _id: new ObjectId(tableId) },
        { $set: { sessionToken: null, needsHelp: false } }
      );
      await db.collection('orders').updateMany(
        { tableId, status: { $nin: ['completed', 'cancelled'] } },
        { $set: { status: 'cancelled' } }
      );
      
      await pusherServer.trigger('restaurant', 'orders-updated', {});
      await pusherServer.trigger('restaurant', 'tables-updated', {});
      return NextResponse.json({ success: true });
    }

    if (action === 'resolve-help') {
      await db.collection('tables').updateOne(
        { _id: new ObjectId(tableId) },
        { $set: { needsHelp: false } }
      );
      await pusherServer.trigger('restaurant', 'tables-updated', {});
      return NextResponse.json({ success: true });
    }
  } catch (e: any) {
    console.error("Table PUT Error:", e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  if (id) {
    await db.collection('tables').deleteOne({ _id: new ObjectId(id) });
    await pusherServer.trigger('restaurant', 'tables-updated', {});
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'ID required' }, { status: 400 });
}