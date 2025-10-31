export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Liquor POS System
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 text-center">
            Multi-Tenant Point of Sale Solution
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-blue-50 dark:bg-gray-700 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-300 mb-3">
                Features
              </h2>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>✓ Multi-tenant architecture</li>
                <li>✓ MongoDB database</li>
                <li>✓ TypeScript support</li>
                <li>✓ Modern UI with Tailwind</li>
              </ul>
            </div>
            
            <div className="bg-indigo-50 dark:bg-gray-700 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-indigo-900 dark:text-indigo-300 mb-3">
                Tech Stack
              </h2>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• Next.js 14 (App Router)</li>
                <li>• TypeScript</li>
                <li>• Tailwind CSS</li>
                <li>• MongoDB + Mongoose</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure your MongoDB connection in .env file to get started
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
