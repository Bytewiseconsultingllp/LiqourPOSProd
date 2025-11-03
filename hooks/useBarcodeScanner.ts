'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxLength?: number;
  timeout?: number; // Time between keypresses to consider as scanner input (ms)
  preventDefault?: boolean;
  enabled?: boolean;
}

/**
 * Universal Barcode Scanner Hook
 * Works with all types of barcode scanners:
 * - USB scanners (keyboard emulation)
 * - Bluetooth scanners
 * - Handheld scanners
 * - Area imagers
 * - 2D barcode scanners
 */
export function useBarcodeScanner({
  onScan,
  minLength = 3,
  maxLength = 100,
  timeout = 100,
  preventDefault = true,
  enabled = true,
}: UseBarcodeScannerOptions) {
  const barcodeBuffer = useRef('');
  const lastKeypressTime = useRef(0);
  const keypressTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeypressTime.current;

      // If more than timeout ms between keypresses, start new barcode
      if (timeDiff > timeout) {
        barcodeBuffer.current = '';
      }

      lastKeypressTime.current = currentTime;

      // Handle Enter key (barcode complete)
      if (e.key === 'Enter' || e.keyCode === 13) {
        if (preventDefault) {
          e.preventDefault();
        }

        const barcode = barcodeBuffer.current.trim();
        if (barcode.length >= minLength && barcode.length <= maxLength) {
          onScan(barcode);
        }
        barcodeBuffer.current = '';
        return;
      }

      // Ignore special keys
      if (e.key.length > 1 && e.key !== 'Enter') {
        return;
      }

      // Add character to buffer
      barcodeBuffer.current += e.key;

      // Clear existing timeout
      if (keypressTimeout.current) {
        clearTimeout(keypressTimeout.current);
      }

      // Auto-submit after timeout if buffer has valid length
      keypressTimeout.current = setTimeout(() => {
        const barcode = barcodeBuffer.current.trim();
        if (barcode.length >= minLength && barcode.length <= maxLength) {
          onScan(barcode);
          barcodeBuffer.current = '';
        }
      }, timeout);
    },
    [enabled, minLength, maxLength, timeout, preventDefault, onScan]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keypress', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      if (keypressTimeout.current) {
        clearTimeout(keypressTimeout.current);
      }
    };
  }, [enabled, handleKeyPress]);

  return {
    reset: () => {
      barcodeBuffer.current = '';
    },
  };
}
