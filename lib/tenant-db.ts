import mongoose, { Connection, Model } from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env file');
}

const MONGODB_URI = process.env.MONGODB_URI;

// Store tenant connections
const tenantConnections = new Map<string, Connection>();

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
    const conn = tenantConnections.get(organizationId)!;
    if (conn.readyState === 1) {
      return conn;
    }
    // Connection is stale, remove it
    tenantConnections.delete(organizationId);
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

    // Store the connection
    tenantConnections.set(organizationId, connection);

    // Register all models for this tenant connection
    registerModelsForTenant(connection);

    console.log(`✅ Tenant database connected: ${dbName}`);
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
 * Close a specific tenant connection
 */
export async function closeTenantConnection(organizationId: string): Promise<void> {
  const connection = tenantConnections.get(organizationId);
  if (connection) {
    await connection.close();
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
    connections: Array.from(tenantConnections.entries()).map(([orgId, conn]) => ({
      organizationId: orgId,
      readyState: conn.readyState,
      name: conn.name,
    })),
  };
}

// Cleanup on process termination
// Only register cleanup handlers in Node.js environment (not in Edge runtime)
if (typeof process !== 'undefined' && process.on) {
  const cleanup = async () => {
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
