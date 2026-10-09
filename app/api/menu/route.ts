import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb'; // To handle MongoDB's unique _id

export async function GET() {
  const client = await clientPromise;
  const db = client.db('restaurant_app'); // The name of your database
  
  // Fetch all menu items and map _id to id so your frontend doesn't break
  const menu = await db.collection('menu').find({}).toArray();
  const formattedMenu = menu.map(item => ({ ...item, id: item._id.toString() }));
  
  return NextResponse.json(formattedMenu);
}

export async function POST(request: Request) {
  const body = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  const newItem = {
    name: body.name,
    category: body.category,
    price: parseFloat(body.price),
    isSoldOut: false,
  };
  
  const result = await db.collection('menu').insertOne(newItem);
  
  return NextResponse.json({ ...newItem, id: result.insertedId });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  const { id, ...updateData } = body;
  
  await db.collection('menu').updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );
  
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const client = await clientPromise;
  const db = client.db('restaurant_app');
  
  await db.collection('menu').deleteOne({ _id: new ObjectId(id as string) });
  
  return NextResponse.json({ success: true });
}