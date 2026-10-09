import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  const tables = await db.collection('tables').find({}).toArray();
  const formattedTables = tables.map(t => ({ ...t, id: t._id.toString() }));
  
  return NextResponse.json(formattedTables);
}

export async function POST(request: Request) {
  const body = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  // Create a new table
  if (body.name) {
    const newTable = { name: body.name, sessionToken: null };
    const result = await db.collection('tables').insertOne(newTable);
    return NextResponse.json({ ...newTable, id: result.insertedId.toString() });
  }

  // Generate new session token for an existing table
  if (body.tableId) {
    try {
      const sessionToken = crypto.randomUUID();
      await db.collection('tables').updateOne(
        { _id: new ObjectId(body.tableId) },
        { $set: { sessionToken } }
      );
      
      const updatedTable = await db.collection('tables').findOne({ _id: new ObjectId(body.tableId) });
      return NextResponse.json({ ...updatedTable, id: body.tableId });
    } catch (e) {
      return NextResponse.json({ error: 'Invalid table ID format' }, { status: 400 });
    }
  }
  
  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}

export async function PUT(request: Request) {
  const { tableId } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  try {
    await db.collection('tables').updateOne(
      { _id: new ObjectId(tableId) },
      { $set: { sessionToken: null } }
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  try {
    await db.collection('tables').deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }
}