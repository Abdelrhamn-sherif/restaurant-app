import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  const { tableId, tableName } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');

  try {
    // 1. Mark the table in the database as needing help
    await db.collection('tables').updateOne(
      { _id: new ObjectId(tableId) },
      { $set: { needsHelp: true } }
    );

    // 2. Fire Pusher events to wake up the Admin Dashboard instantly!
    await pusherServer.trigger('restaurant', 'help-requested', { tableId, tableName });
    await pusherServer.trigger('restaurant', 'tables-updated', {});

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Help API Error:', e);
    return NextResponse.json({ error: 'Failed to call waiter' }, { status: 500 });
  }
}