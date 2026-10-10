import MenuClient from './MenuClient';

// This is a Server Component, so it can safely await the dynamic params
export default async function CustomerMenuPage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await params;
  
  return <MenuClient tableId={tableId} />;
}