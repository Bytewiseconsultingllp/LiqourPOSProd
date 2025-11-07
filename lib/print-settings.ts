/**
 * Print Settings Utility Functions
 * Handles loading and saving print settings from the database via API
 * Uses localStorage as a cache for performance
 */

import { PrintSettings, DEFAULT_PRINT_SETTINGS } from '@/types/print-settings';
import { apiFetch } from './api-client';

const STORAGE_KEY = 'printSettings';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_TIMESTAMP_KEY = 'printSettingsTimestamp';

/**
 * Get print settings from API with localStorage cache
 */
export const getPrintSettings = async (): Promise<PrintSettings> => {
  if (typeof window === 'undefined') {
    return DEFAULT_PRINT_SETTINGS;
  }

  try {
    // Check cache first
    const cached = localStorage.getItem(STORAGE_KEY);
    const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (cached && cacheTimestamp) {
      const age = Date.now() - parseInt(cacheTimestamp);
      if (age < CACHE_DURATION) {
        const parsed = JSON.parse(cached);
        return {
          mainBill: { ...DEFAULT_PRINT_SETTINGS.mainBill, ...parsed.mainBill },
          subBill: { ...DEFAULT_PRINT_SETTINGS.subBill, ...parsed.subBill },
        };
      }
    }

    // Fetch from API
    const response = await apiFetch('/api/print-settings');
    const data = await response.json();

    if (data.success && data.data) {
      const settings = {
        mainBill: { ...DEFAULT_PRINT_SETTINGS.mainBill, ...data.data.mainBill },
        subBill: { ...DEFAULT_PRINT_SETTINGS.subBill, ...data.data.subBill },
      };
      
      // Update cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      return settings;
    }
  } catch (error) {
    console.error('Error loading print settings from API:', error);
    
    // Fallback to cached data if API fails
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          mainBill: { ...DEFAULT_PRINT_SETTINGS.mainBill, ...parsed.mainBill },
          subBill: { ...DEFAULT_PRINT_SETTINGS.subBill, ...parsed.subBill },
        };
      }
    } catch (cacheError) {
      console.error('Error loading cached print settings:', cacheError);
    }
  }

  return DEFAULT_PRINT_SETTINGS;
};

/**
 * Synchronous version for immediate use (uses cache only)
 */
export const getPrintSettingsSync = (): PrintSettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_PRINT_SETTINGS;
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        mainBill: { ...DEFAULT_PRINT_SETTINGS.mainBill, ...parsed.mainBill },
        subBill: { ...DEFAULT_PRINT_SETTINGS.subBill, ...parsed.subBill },
      };
    }
  } catch (error) {
    console.error('Error loading cached print settings:', error);
  }

  return DEFAULT_PRINT_SETTINGS;
};

/**
 * Save print settings to database via API
 */
export const savePrintSettings = async (settings: PrintSettings): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const response = await apiFetch('/api/print-settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    const data = await response.json();

    if (data.success) {
      // Update cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      return true;
    } else {
      throw new Error(data.error || 'Failed to save settings');
    }
  } catch (error) {
    console.error('Error saving print settings:', error);
    throw error;
  }
};

/**
 * Reset print settings to default
 */
export const resetPrintSettings = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const response = await apiFetch('/api/print-settings', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      // Clear cache
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return true;
    } else {
      throw new Error(data.error || 'Failed to reset settings');
    }
  } catch (error) {
    console.error('Error resetting print settings:', error);
    throw error;
  }
};

/**
 * Invalidate cache to force refresh on next load
 */
export const invalidatePrintSettingsCache = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
};
