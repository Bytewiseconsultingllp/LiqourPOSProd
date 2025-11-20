import mongoose, { Connection, Model } from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env file');
}

const MONGODB_URI = process.env.MONGODB_URI;

// Store tenant connections with metadata
interface TenantConnectionInfo {
  connection: Connection;
  lastUsed: Date;
  useCount: number;
}

const tenantConnections = new Map<string, TenantConnectionInfo>();

// Configuration
const CONNECTION_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MAX_TENANT_CONNECTIONS = 50; // Maximum number of tenant connections

// Store model schemas for registration (persist on global to survive hot-reloads)
declare global {
  // eslint-disable-next-line no-var
  var _modelSchemas: Map<string, { schema: mongoose.Schema; options?: any }>|undefined;
}
const modelSchemas: Map<string, { schema: mongoose.Schema; options?: any }> =
  (global._modelSchemas = global._modelSchemas ?? new Map());

// Global flag to track if schemas have been registered
// This prevents duplicate registration across module reloads in Next.js
declare global {
  var _modelSchemasRegistered: boolean | undefined;
}

// Disable auto-indexing in production to prevent E11000 errors on cold starts
// Indexes should be created manually via migration scripts in production
if (process.env.NODE_ENV === 'production') {
  mongoose.set('autoIndex', false);
  console.log('⚙️  Auto-indexing disabled in production');
} else {
  mongoose.set('autoIndex', true);
  console.log('⚙️  Auto-indexing enabled in development');
}

/**
 * Register a model schema for later use with tenant databases
 * This should be called once at application startup for each model
 * Uses global flag to prevent duplicate registration in Next.js
 */
export function registerModelSchema(
  modelName: string,
  schema: mongoose.Schema,
  options?: any
) {
  // Only register if not already registered globally
  if (!modelSchemas.has(modelName)) {
    modelSchemas.set(modelName, { schema, options });
  }
}

/**
 * Get or create a tenant-specific database connection
 * Each organization gets its own isolated database
 * Automatically registers model schemas on first call
 */
export async function getTenantConnection(organizationId: string): Promise<Connection> {
  // Ensure schemas are registered (only happens once globally)
  ensureSchemasRegistered();
  
  // Check if connection already exists and is active
  if (tenantConnections.has(organizationId)) {
    const connInfo = tenantConnections.get(organizationId)!;
    if (connInfo.connection.readyState === 1) {
      // Update last used time and increment use count
      connInfo.lastUsed = new Date();
      connInfo.useCount++;
      return connInfo.connection;
    }
    // Connection is stale, remove it
    console.log(`🔄 Removing stale connection for tenant: ${organizationId}`);
    tenantConnections.delete(organizationId);
  }

  // Clean up old connections if we're at the limit
  if (tenantConnections.size >= MAX_TENANT_CONNECTIONS) {
    await cleanupIdleConnections();
  }

  // Create new connection for this tenant
  const dbName = `tenant_${organizationId}`;
  const tenantUri = MONGODB_URI.replace(/\/[^/]*(\?|$)/, `/${dbName}$1`);

  try {
    // Add SSL parameter to URI if not present
    let finalUri = tenantUri;
    if (!finalUri.includes('ssl=') && !finalUri.includes('tls=')) {
      const separator = finalUri.includes('?') ? '&' : '?';
      finalUri = `${finalUri}${separator}ssl=true&authSource=admin`;
    }

    const connection = mongoose.createConnection(finalUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      maxIdleTimeMS: 60000, // Close idle connections after 60 seconds
      // SSL/TLS Configuration
      ssl: true,
      retryWrites: true,
      retryReads: true,
      w: 'majority' as const,
      readPreference: 'primaryPreferred' as const,
    });

    // Wait for connection to be ready
    await new Promise<void>((resolve, reject) => {
      connection.once('open', () => resolve());
      connection.once('error', (err) => reject(err));
    });

    // Store the connection with metadata
    tenantConnections.set(organizationId, {
      connection,
      lastUsed: new Date(),
      useCount: 1,
    });

    // Register all models for this tenant connection
    registerModelsForTenant(connection);

    console.log(`✅ Tenant database connected: ${dbName} (Total connections: ${tenantConnections.size})`);
    return connection;
  } catch (error) {
    console.error(`❌ Failed to connect to tenant database: ${dbName}`, error);
    throw error;
  }
}

/**
 * Ensure model schemas are registered (called once globally)
 * This imports and registers all schemas from model-registry
 */
function ensureSchemasRegistered() {
  // In Next.js dev, module hot-reload can reset this module state while the global flag stays true.
  // Re-register if global flag is not set OR if local registry is empty.
  if (!global._modelSchemasRegistered || modelSchemas.size === 0) {
    // Dynamically import to avoid circular dependencies
    const { registerAllModels } = require('./model-registry');
    registerAllModels();
    global._modelSchemasRegistered = true;
    console.log('✅ Model schemas registered globally');
  }
}

/**
 * Register all models for a tenant connection
 * Each tenant connection gets its own model instances for isolation
 */
function registerModelsForTenant(connection: Connection) {
  console.log(`📋 Registering ${modelSchemas.size} models for tenant connection...`);
  
  modelSchemas.forEach(({ schema, options }, modelName) => {
    // Check if model is already registered on this connection
    if (!connection.models[modelName]) {
      connection.model(modelName, schema, options?.collection);
      console.log(`  ✅ Registered model: ${modelName}`);
    } else {
      console.log(`  ⏭️  Model already registered: ${modelName}`);
    }
  });
  
  console.log(`📋 Total models in connection: ${Object.keys(connection.models).length}`);
}

/**
 * Get a model from a tenant connection
 */
export function getTenantModel<T = any>(
  connection: Connection,
  modelName: string
): Model<T> {
  const model = connection.models[modelName];
  if (!model) {
    throw new Error(
      `Model "${modelName}" not found. Make sure it's registered with registerModelSchema().`
    );
  }
  return model as Model<T>;
}

/**
 * Clean up idle connections that haven't been used recently
 */
async function cleanupIdleConnections(): Promise<number> {
  const now = new Date().getTime();
  let cleanedCount = 0;

  for (const [orgId, connInfo] of tenantConnections.entries()) {
    const idleTime = now - connInfo.lastUsed.getTime();
    
    if (idleTime > CONNECTION_IDLE_TIMEOUT) {
      console.log(`🧹 Closing idle connection for tenant: ${orgId} (idle for ${Math.round(idleTime / 1000)}s)`);
      try {
        await connInfo.connection.close();
        tenantConnections.delete(orgId);
        cleanedCount++;
      } catch (error) {
        console.error(`Failed to close connection for tenant ${orgId}:`, error);
      }
    }
  }

  if (cleanedCount > 0) {
    console.log(`✅ Cleaned up ${cleanedCount} idle connections (${tenantConnections.size} remaining)`);
  }

  return cleanedCount;
}

/**
 * Close a specific tenant connection
 */
export async function closeTenantConnection(organizationId: string): Promise<void> {
  const connInfo = tenantConnections.get(organizationId);
  if (connInfo) {
    await connInfo.connection.close();
    tenantConnections.delete(organizationId);
    console.log(`🔌 Tenant database disconnected: tenant_${organizationId}`);
  }
}

/**
 * Close all tenant connections (useful for cleanup)
 */
export async function closeAllTenantConnections(): Promise<void> {
  const closePromises = Array.from(tenantConnections.keys()).map((orgId) =>
    closeTenantConnection(orgId)
  );
  await Promise.all(closePromises);
  console.log('🔌 All tenant databases disconnected');
}

/**
 * Get connection statistics
 */
export function getConnectionStats() {
  return {
    activeConnections: tenantConnections.size,
    registeredModels: modelSchemas.size,
    maxConnections: MAX_TENANT_CONNECTIONS,
    connections: Array.from(tenantConnections.entries()).map(([orgId, connInfo]) => ({
      organizationId: orgId,
      readyState: connInfo.connection.readyState,
      name: connInfo.connection.name,
      lastUsed: connInfo.lastUsed,
      useCount: connInfo.useCount,
      idleTime: Math.round((new Date().getTime() - connInfo.lastUsed.getTime()) / 1000), // in seconds
    })),
  };
}

// Periodic cleanup of idle connections
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic cleanup of idle connections
 */
export function startPeriodicCleanup(intervalMs: number = 2 * 60 * 1000) {
  if (cleanupInterval) {
    console.log('⚠️  Periodic cleanup already running');
    return;
  }

  console.log(`🔄 Starting periodic connection cleanup (interval: ${intervalMs}ms)`);
  cleanupInterval = setInterval(async () => {
    await cleanupIdleConnections();
  }, intervalMs);
}

/**
 * Stop periodic cleanup
 */
export function stopPeriodicCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('🔄 Periodic cleanup stopped');
  }
}

// Start periodic cleanup automatically
if (typeof process !== 'undefined') {
  // In development, run cleanup every 2 minutes
  // In production, run every 5 minutes
  const interval = process.env.NODE_ENV === 'development' ? 2 * 60 * 1000 : 5 * 60 * 1000;
  startPeriodicCleanup(interval);
}

// Cleanup on process termination
// Only register cleanup handlers in Node.js environment (not in Edge runtime)
if (typeof process !== 'undefined' && process.on) {
  const cleanup = async () => {
    stopPeriodicCleanup();
    await closeAllTenantConnections();
    process.exit(0);
  };

  // Check if we're not in a serverless/edge environment
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    try {
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    } catch (error) {
      // Ignore errors in environments that don't support process events
      console.log('⚠️  Process event handlers not available in this environment');
    }
  }
}
