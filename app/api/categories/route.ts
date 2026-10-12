import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  const categories = await db.collection('categories').find({}).toArray();
  return NextResponse.json(categories.map(c => ({ ...c, id: c._id.toString() })));
}

export async function POST(request: Request) {
  const { name } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  
  const newCat = { name };
  const result = await db.collection('categories').insertOne(newCat);
  return NextResponse.json({ ...newCat, id: result.insertedId.toString() });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  // TypeScript Fix: Ensure ID exists before calling MongoDB
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  await db.collection('categories').deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}