'use client';

import { useState } from 'react';
import UniversalBarcodeScanner from '@/components/UniversalBarcodeScanner';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Input } from '@/app/dashboard/components/ui/input';

/**
 * Example 1: Basic Scanner with Dialog
 */
export function BasicScannerExample() {
  const [showScanner, setShowScanner] = useState(false);
  const [lastScanned, setLastScanned] = useState('');

  const handleScan = (barcode: string) => {
    console.log('Scanned:', barcode);
    setLastScanned(barcode);
    setShowScanner(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Basic Scanner Example</h2>
      
      <button
        onClick={() => setShowScanner(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Open Scanner
      </button>

      {lastScanned && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="font-semibold">Last Scanned:</p>
          <p className="font-mono text-lg">{lastScanned}</p>
        </div>
      )}

      {showScanner && (
        <UniversalBarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

/**
 * Example 2: Auto-Confirm Scanner (No Dialog)
 */
export function AutoConfirmScannerExample() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedItems, setScannedItems] = useState<string[]>([]);

  const handleScan = (barcode: string) => {
    setScannedItems(prev => [...prev, barcode]);
    // Scanner closes automatically with autoConfirm
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Auto-Confirm Scanner</h2>
      
      <button
        onClick={() => setShowScanner(true)}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Quick Scan
      </button>

      <div className="mt-4">
        <h3 className="font-semibold mb-2">Scanned Items ({scannedItems.length}):</h3>
        <ul className="space-y-1">
          {scannedItems.map((item, index) => (
            <li key={index} className="p-2 bg-gray-50 rounded font-mono">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {showScanner && (
        <UniversalBarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          autoConfirm={true}  // No confirmation dialog
          title="Quick Scan"
          description="Scan will be added automatically"
        />
      )}
    </div>
  );
}

/**
 * Example 3: Background Scanner (Always Active)
 */
export function BackgroundScannerExample() {
  const [scannedItems, setScannedItems] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Scanner is always active in the background
  useBarcodeScanner({
    onScan: (barcode) => {
      setScannedItems(prev => [...prev, barcode]);
      // Play beep sound
      playBeep();
    },
    minLength: 8,
    maxLength: 50,
    enabled: isActive,
  });

  const playBeep = () => {
    const audio = new Audio('/sounds/beep.mp3');
    audio.play().catch(() => {});
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Background Scanner</h2>
      
      <div className="mb-4">
        <label className="flex items-center gap-2">
          <Input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Scanner Active</span>
        </label>
      </div>

      <div className={`p-4 rounded ${isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border`}>
        <p className="font-semibold mb-2">
          Status: {isActive ? '🟢 Ready to Scan' : '🔴 Inactive'}
        </p>
        <p className="text-sm text-gray-600">
          {isActive ? 'Scan anywhere on this page' : 'Enable scanner to start scanning'}
        </p>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold mb-2">Scanned Items:</h3>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {scannedItems.map((item, index) => (
            <div key={index} className="p-2 bg-blue-50 rounded flex items-center justify-between">
              <span className="font-mono">{item}</span>
              <span className="text-xs text-gray-500">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Example 4: Product Lookup Scanner
 */
export function ProductLookupExample() {
  const [showScanner, setShowScanner] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScan = async (barcode: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/products/by-barcode/${barcode}`);
      if (!response.ok) throw new Error('Product not found');
      
      const data = await response.json();
      setProduct(data.product);
      setShowScanner(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Product Lookup</h2>
      
      <button
        onClick={() => setShowScanner(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Scan Product
      </button>

      {loading && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <p>Looking up product...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {product && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded shadow">
          <h3 className="font-bold text-lg mb-2">{product.name}</h3>
          <p className="text-gray-600 mb-2">{product.brand}</p>
          <p className="text-2xl font-bold text-green-600">₹{product.pricePerUnit}</p>
          <p className="text-sm text-gray-500 mt-2">Stock: {product.currentStock}</p>
        </div>
      )}

      {showScanner && (
        <UniversalBarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title="Scan Product Barcode"
          description="Scan to view product details"
        />
      )}
    </div>
  );
}

/**
 * Example 5: Inventory Check Scanner
 */
export function InventoryCheckExample() {
  const [showScanner, setShowScanner] = useState(false);
  const [items, setItems] = useState<Array<{barcode: string, status: 'checking' | 'found' | 'not-found', product?: any}>>([]);

  const handleScan = async (barcode: string) => {
    // Add item as "checking"
    setItems(prev => [...prev, { barcode, status: 'checking' }]);

    // Check inventory
    try {
      const response = await fetch(`/api/inventory/check/${barcode}`);
      const data = await response.json();
      
      setItems(prev => prev.map(item => 
        item.barcode === barcode 
          ? { ...item, status: 'found', product: data.product }
          : item
      ));
    } catch (err) {
      setItems(prev => prev.map(item => 
        item.barcode === barcode 
          ? { ...item, status: 'not-found' }
          : item
      ));
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Inventory Check</h2>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowScanner(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Start Scanning
        </button>
        <button
          onClick={() => setItems([])}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={`p-3 rounded border ${
              item.status === 'checking' ? 'bg-yellow-50 border-yellow-200' :
              item.status === 'found' ? 'bg-green-50 border-green-200' :
              'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono">{item.barcode}</span>
              <span className={`text-sm font-semibold ${
                item.status === 'checking' ? 'text-yellow-600' :
                item.status === 'found' ? 'text-green-600' :
                'text-red-600'
              }`}>
                {item.status === 'checking' ? 'Checking...' :
                 item.status === 'found' ? '✓ Found' :
                 '✗ Not Found'}
              </span>
            </div>
            {item.product && (
              <p className="text-sm text-gray-600 mt-1">
                {item.product.name} - Stock: {item.product.currentStock}
              </p>
            )}
          </div>
        ))}
      </div>

      {showScanner && (
        <UniversalBarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title="Inventory Check"
          description="Scan items to check inventory"
          autoConfirm={true}  // Fast scanning
        />
      )}
    </div>
  );
}

/**
 * Example 6: Camera-Only Scanner
 */
export function CameraOnlyScannerExample() {
  const [showScanner, setShowScanner] = useState(false);
  const [qrCodes, setQrCodes] = useState<string[]>([]);

  const handleScan = (code: string) => {
    setQrCodes(prev => [...prev, code]);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Camera Scanner (QR Codes)</h2>
      
      <button
        onClick={() => setShowScanner(true)}
        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
      >
        Scan QR Code
      </button>

      <div className="mt-4 space-y-2">
        {qrCodes.map((code, index) => (
          <div key={index} className="p-3 bg-teal-50 border border-teal-200 rounded">
            <p className="font-mono text-sm break-all">{code}</p>
          </div>
        ))}
      </div>

      {showScanner && (
        <UniversalBarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title="Scan QR Code"
          description="Use your camera to scan QR codes"
          scannerType="camera"  // Force camera mode
          allowManualEntry={false}  // Camera only
        />
      )}
    </div>
  );
}
