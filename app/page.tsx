'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

export default function Home() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    console.log('🔍 PWA Install Check Started');
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ App already installed');
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🎉 beforeinstallprompt event fired!');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    console.log('👂 Listening for beforeinstallprompt event...');

    // Check PWA requirements
    setTimeout(() => {
      console.log('📋 PWA Status Check:');
      console.log('  - HTTPS:', window.location.protocol === 'https:' || window.location.hostname === 'localhost');
      console.log('  - Service Worker:', 'serviceWorker' in navigator);
      console.log('  - Manifest:', document.querySelector('link[rel="manifest"]') !== null);
    }, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert('Install prompt not available. Please use your browser\'s install option from the menu.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ User accepted install');
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

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

          {/* Install Button */}
          {!isInstalled && (
            <div className="mb-8 flex justify-center">
              <button
                onClick={handleInstall}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                {isInstallable ? (
                  <>
                    <Download className="w-6 h-6" />
                    Install App
                  </>
                ) : (
                  <>
                    <Smartphone className="w-6 h-6" />
                    Install as PWA
                  </>
                )}
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="mb-8 flex justify-center">
              <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-6 py-3 rounded-lg">
                <Smartphone className="w-5 h-5" />
                <span className="font-medium">App Installed ✓</span>
              </div>
            </div>
          )}
          
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
          
          <div className="mt-8 space-y-4">
            {/* PWA Info */}
            {!isInstalled && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Install as Progressive Web App
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                  Install this app on your device for:
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 ml-4">
                  <li>• Quick access from home screen</li>
                  <li>• Offline functionality</li>
                  <li>• Native app-like experience</li>
                  <li>• Push notifications</li>
                </ul>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-3">
                  <strong>Note:</strong> If the install button doesn't work, use your browser's menu (⋮) → "Install app" or "Add to Home Screen"
                </p>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure your MongoDB connection in .env file to get started
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
