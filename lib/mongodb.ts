import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env file');
}

const uri = process.env.MONGODB_URI;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value across module reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, also use a global variable to reuse the connection
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
}

export default clientPromise;

/**
 * Get database connection for a specific tenant
 * @param tenantId - The unique identifier for the tenant
 * @returns Database instance for the tenant
 */
export async function getTenantDb(tenantId: string): Promise<Db> {
  const client = await clientPromise;
  // Each tenant gets their own database with a prefixed name
  const dbName = `tenant_${tenantId}`;
  return client.db(dbName);
}

/**
 * Get the main application database (for shared data like tenant registry)
 * @returns Main database instance
 */
export async function getMainDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db('liquor_pos_main');
}
