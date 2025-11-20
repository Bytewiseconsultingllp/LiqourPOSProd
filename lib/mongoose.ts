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
    // Ensure URI has ssl=true parameter
    let connectionUri = MONGODB_URI;
    if (!connectionUri.includes('ssl=') && !connectionUri.includes('tls=')) {
      const separator = connectionUri.includes('?') ? '&' : '?';
      connectionUri = `${connectionUri}${separator}ssl=true&authSource=admin`;
    }

    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
      connectTimeoutMS: 30000,
      maxIdleTimeMS: 60000, // Close idle connections after 60 seconds
      // SSL/TLS Configuration - Try with less strict validation for Atlas
      ssl: true,
      retryWrites: true,
      retryReads: true,
      w: 'majority' as const,
      readPreference: 'primaryPreferred' as const,
    };

    cached.promise = mongoose.connect(connectionUri);
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
  let tenantUri = MONGODB_URI.replace(/\/[^/]*(\?|$)/, `/${dbName}$1`);
  
  // Ensure URI has ssl=true parameter
  if (!tenantUri.includes('ssl=') && !tenantUri.includes('tls=')) {
    const separator = tenantUri.includes('?') ? '&' : '?';
    tenantUri = `${tenantUri}${separator}ssl=true&authSource=admin`;
  }
  
  const connection = await mongoose.createConnection(tenantUri, {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    maxIdleTimeMS: 60000,
    // SSL/TLS Configuration
    ssl: true,
    retryWrites: true,
    retryReads: true,
    w: 'majority' as const,
    readPreference: 'primaryPreferred' as const,
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
