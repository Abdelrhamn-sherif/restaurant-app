import { Suspense } from 'react';
import MenuClient from './MenuClient';

export default function CustomerMenuPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500 font-medium">Loading Menu...</p>
        </div>
      }
    >
      <MenuClient />
    </Suspense>
  );
}