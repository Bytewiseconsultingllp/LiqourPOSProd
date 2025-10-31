import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env file');
}

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * Connect to MongoDB using Mongoose
 * This is used for the main database connection
 */
export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Get or create a tenant-specific Mongoose connection
 * Each tenant has their own database
 */
const tenantConnections = new Map<string, typeof mongoose>();

export async function getTenantConnection(tenantId: string): Promise<typeof mongoose> {
  // Check if connection already exists
  if (tenantConnections.has(tenantId)) {
    const conn = tenantConnections.get(tenantId)!;
    if (conn.connection.readyState === 1) {
      return conn;
    }
  }

  // Create new connection for tenant
  const dbName = `tenant_${tenantId}`;
  const tenantUri = MONGODB_URI.replace(/\/[^/]*$/, `/${dbName}`);
  
  const connection = await mongoose.createConnection(tenantUri, {
    bufferCommands: false,
  }).asPromise();

  tenantConnections.set(tenantId, connection as unknown as typeof mongoose);
  return connection as unknown as typeof mongoose;
}

/**
 * Close a specific tenant connection
 */
export async function closeTenantConnection(tenantId: string): Promise<void> {
  const connection = tenantConnections.get(tenantId);
  if (connection) {
    await connection.connection.close();
    tenantConnections.delete(tenantId);
  }
}
