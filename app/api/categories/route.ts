import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  const items = await db.collection('menu').find({}).toArray();
  return NextResponse.json(items.map(item => ({ ...item, id: item._id.toString() })));
}

export async function POST(request: Request) {
  const body = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  const newItem = {
    name: body.name,
    category: body.category,
    price: parseFloat(body.price),
    description: body.description || '', // NEW
    image: body.image || '', // NEW
    isSoldOut: false
  };
  
  const result = await db.collection('menu').insertOne(newItem);
  return NextResponse.json({ ...newItem, id: result.insertedId.toString() });
}

export async function PUT(request: Request) {
  const { id, isSoldOut } = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  await db.collection('menu').updateOne(
    { _id: new ObjectId(id) },
    { $set: { isSoldOut } }
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  await db.collection('menu').deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}