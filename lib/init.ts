/**
 * Application Initialization
 * This file should be imported at the application entry point
 * to ensure all models are registered before any database operations
 */

import { registerAllModels } from './model-registry';

let initialized = false;

/**
 * Initialize the application
 * - Registers all model schemas
 * - Sets up any global configurations
 */
export function initializeApp() {
  if (initialized) {
    return;
  }

  console.log('🚀 Initializing application...');

  // Register all model schemas
  registerAllModels();

  // Mark as initialized
  initialized = true;

  console.log('✅ Application initialized successfully');
}

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  initializeApp();
}

export default initializeApp;
