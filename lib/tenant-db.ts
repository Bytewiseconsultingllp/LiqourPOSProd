import mongoose, { Connection, Model } from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env file');
}

const MONGODB_URI = process.env.MONGODB_URI;

// Store tenant connections
const tenantConnections = new Map<string, Connection>();

// Store model schemas for registration
const modelSchemas = new Map<string, { schema: mongoose.Schema; options?: any }>();

/**
 * Register a model schema for later use with tenant databases
 * This should be called once at application startup for each model
 */
export function registerModelSchema(
  modelName: string,
  schema: mongoose.Schema,
  options?: any
) {
  modelSchemas.set(modelName, { schema, options });
}

/**
 * Get or create a tenant-specific database connection
 * Each organization gets its own isolated database
 */
export async function getTenantConnection(organizationId: string): Promise<Connection> {
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
    const connection = mongoose.createConnection(tenantUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
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
 * Register all models for a tenant connection
 */
function registerModelsForTenant(connection: Connection) {
  console.log(`📋 Registering ${modelSchemas.size} models for tenant connection...`);
  
  modelSchemas.forEach(({ schema, options }, modelName) => {
    // Check if model is already registered
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
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await closeAllTenantConnections();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await closeAllTenantConnections();
    process.exit(0);
  });
}
