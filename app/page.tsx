import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-100">
        <div className="text-4xl mb-4">🍽️</div>
        <h1 className="text-3xl font-bold mb-2">Restaurant App</h1>
        <p className="text-gray-600 mb-8">Next.js Prototype Environment</p>
        
        <div className="space-y-4">
          <Link 
            href="/admin" 
            className="block w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Open Admin Dashboard
          </Link>
          <Link 
            href="/admin/menu" 
            className="block w-full bg-white text-blue-600 border-2 border-blue-600 py-3 rounded-xl font-medium hover:bg-blue-50 transition-colors"
          >
            Manage Menu
          </Link>
        </div>
      </div>
    </div>
  );
}