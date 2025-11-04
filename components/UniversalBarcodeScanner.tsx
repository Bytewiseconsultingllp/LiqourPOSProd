'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Barcode, Camera, X, Check, AlertCircle, Scan } from 'lucide-react';
import { Input } from '@/app/dashboard/components/ui/input';

interface UniversalBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
  autoConfirm?: boolean; // Auto-confirm without showing confirmation dialog
  allowManualEntry?: boolean; // Allow manual barcode entry
  scannerType?: 'auto' | 'keyboard' | 'camera'; // Scanner type preference
}

export default function UniversalBarcodeScanner({
  onScan,
  onClose,
  title = 'Scan Barcode',
  description = 'Use your barcode scanner or camera to scan',
  autoConfirm = false,
  allowManualEntry = true,
  scannerType = 'auto',
}: UniversalBarcodeScannerProps) {
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [useCameraScanner, setUseCameraScanner] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const barcodeBuffer = useRef('');
  const lastKeypressTime = useRef(0);
  const keypressTimeout = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard/USB Scanner Handler
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input field (except our scanner input)
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && target.id !== 'barcode-scanner-input') {
      return;
    }

    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeypressTime.current;

    // If more than 100ms between keypresses, start new barcode
    if (timeDiff > 100) {
      barcodeBuffer.current = '';
    }

    lastKeypressTime.current = currentTime;

    // Handle Enter key (barcode complete)
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      if (barcodeBuffer.current.trim().length > 0) {
        handleBarcodeScanned(barcodeBuffer.current.trim());
        barcodeBuffer.current = '';
      }
      return;
    }

    // Ignore special keys
    if (e.key.length > 1 && e.key !== 'Enter') {
      return;
    }

    // Add character to buffer
    barcodeBuffer.current += e.key;

    // Clear timeout if exists
    if (keypressTimeout.current) {
      clearTimeout(keypressTimeout.current);
    }

    // Set timeout to auto-submit after 50ms of no input (fast scanner)
    keypressTimeout.current = setTimeout(() => {
      if (barcodeBuffer.current.length >= 8) { // Minimum barcode length
        handleBarcodeScanned(barcodeBuffer.current.trim());
        barcodeBuffer.current = '';
      }
    }, 50);
  }, []);

  // Handle scanned barcode
  const handleBarcodeScanned = (code: string) => {
    if (!code || code.length < 3) {
      setError('Invalid barcode. Please try again.');
      return;
    }

    setScannedCode(code);
    setScannerActive(false);

    if (autoConfirm) {
      onScan(code);
      onClose();
    } else {
      setShowConfirmation(true);
    }
  };

  // Camera Scanner Setup
  const startCameraScanner = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCameraStream(stream);
      setUseCameraScanner(true);

      // Start scanning loop
      scanIntervalRef.current = setInterval(() => {
        scanBarcodeFromCamera();
      }, 500); // Scan every 500ms
    } catch (err: any) {
      setError('Camera access denied. Please use a handheld scanner or enter manually.');
      console.error('Camera error:', err);
    }
  };

  // Scan barcode from camera using canvas
  const scanBarcodeFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Try to decode barcode using a library (you'll need to install jsQR or similar)
    // For now, this is a placeholder - you'll need to integrate a barcode library
    try {
      // @ts-ignore - jsQR library integration
      if (typeof jsQR !== 'undefined') {
        // @ts-ignore
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleBarcodeScanned(code.data);
          stopCameraScanner();
        }
      }
    } catch (err) {
      // Library not loaded or error in scanning
    }
  };

  // Stop camera scanner
  const stopCameraScanner = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setUseCameraScanner(false);
  };

  // Confirm scanned barcode
  const confirmBarcode = () => {
    if (scannedCode) {
      onScan(scannedCode);
      onClose();
    }
  };

  // Manual entry submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleBarcodeScanned(manualCode.trim());
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    if (scannerType === 'keyboard' || scannerType === 'auto') {
      setScannerActive(true);
      document.addEventListener('keypress', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      stopCameraScanner();
      if (keypressTimeout.current) {
        clearTimeout(keypressTimeout.current);
      }
    };
  }, [handleKeyPress, scannerType]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <button
            onClick={() => {
              stopCameraScanner();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmation ? (
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h4 className="text-lg font-semibold text-center text-gray-900 mb-2">
                Barcode Scanned Successfully
              </h4>
              <div className="bg-white border border-green-300 rounded-lg p-4 mt-4">
                <p className="text-xs text-gray-500 text-center mb-2">Scanned Code:</p>
                <p className="text-3xl font-mono font-bold text-center text-gray-900 break-all">
                  {scannedCode}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmBarcode}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Confirm & Use
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setScannedCode('');
                  setScannerActive(true);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Scan Again
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Scanner Type Selection */}
            {scannerType === 'auto' && !useCameraScanner && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setScannerActive(true)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    scannerActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <Barcode className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="font-semibold text-sm">Handheld Scanner</p>
                  <p className="text-xs text-gray-600 mt-1">USB / Keyboard</p>
                </button>

                <button
                  onClick={startCameraScanner}
                  className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-300 transition-all"
                >
                  <Camera className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="font-semibold text-sm">Camera Scanner</p>
                  <p className="text-xs text-gray-600 mt-1">2D / QR Codes</p>
                </button>
              </div>
            )}

            {/* Handheld Scanner Interface */}
            {scannerActive && !useCameraScanner && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <Barcode className="w-20 h-20 text-blue-600 animate-pulse" />
                    <div className="absolute -inset-2 border-4 border-blue-400 rounded-lg animate-ping opacity-75"></div>
                  </div>
                </div>
                <h4 className="text-xl font-semibold text-center text-gray-900 mb-2">
                  Ready to Scan
                </h4>
                <p className="text-center text-gray-600 mb-4">
                  Point your barcode scanner at the product barcode
                </p>
                <div className="bg-white rounded-lg p-4 border border-blue-300">
                  <p className="text-xs text-gray-500 text-center mb-2">
                    Supports all scanner types:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">USB</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Bluetooth</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Keyboard</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Handheld</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Area Imager</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">2D Scanner</span>
                  </div>
                </div>
                {barcodeBuffer.current && (
                  <div className="mt-4 p-3 bg-white rounded border border-blue-300">
                    <p className="text-xs text-gray-500 mb-1">Scanning...</p>
                    <p className="text-lg font-mono font-bold text-blue-600">
                      {barcodeBuffer.current}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Camera Scanner Interface */}
            {useCameraScanner && (
              <div className="mb-6">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-32 border-4 border-green-500 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Scan className="w-12 h-12 text-green-400 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-gray-600 mt-3">
                  Position the barcode within the frame
                </p>
                <button
                  onClick={stopCameraScanner}
                  className="w-full mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Stop Camera
                </button>
              </div>
            )}

            {/* Manual Entry */}
            {allowManualEntry && !useCameraScanner && (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Or enter barcode manually:
                </p>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <Input
                    type="text"
                    id="barcode-scanner-input"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter barcode number"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Submit
                  </button>
                </form>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-sm text-gray-900 mb-2">Scanner Instructions:</h5>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• <strong>Handheld/USB:</strong> Simply scan the barcode - it will be captured automatically</li>
                <li>• <strong>Camera:</strong> Click "Camera Scanner" and position barcode in frame</li>
                <li>• <strong>Manual:</strong> Type or paste the barcode number and click Submit</li>
                <li>• <strong>All Types:</strong> Works with 1D, 2D, QR codes, and area imagers</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
