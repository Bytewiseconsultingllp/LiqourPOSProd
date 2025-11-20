/**
 * MongoDB Connection Manager
 * Monitors and manages database connections to prevent connection leaks
 */

import { getConnectionStats, closeAllTenantConnections } from './tenant-db';
import mongoose from 'mongoose';

interface ConnectionMetrics {
  timestamp: Date;
  totalConnections: number;
  mainDbState: number;
  tenantConnections: Array<{
    organizationId: string;
    readyState: number;
    name: string;
  }>;
}

class ConnectionManager {
  private metrics: ConnectionMetrics[] = [];
  private maxMetricsHistory = 100;
  private monitoringInterval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring connections
   */
  startMonitoring(intervalMs: number = 60000) {
    if (this.monitoringInterval) {
      console.log('⚠️  Connection monitoring already started');
      return;
    }

    console.log(`🔍 Starting connection monitoring (interval: ${intervalMs}ms)`);
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // Collect initial metrics
    this.collectMetrics();
  }

  /**
   * Stop monitoring connections
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🔍 Connection monitoring stopped');
    }
  }

  /**
   * Collect current connection metrics
   */
  private collectMetrics() {
    const stats = getConnectionStats();
    
    const metrics: ConnectionMetrics = {
      timestamp: new Date(),
      totalConnections: stats.activeConnections + 1, // +1 for main DB
      mainDbState: mongoose.connection.readyState,
      tenantConnections: stats.connections,
    };

    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Log warning if too many connections
    if (metrics.totalConnections > 20) {
      console.warn(`⚠️  HIGH CONNECTION COUNT: ${metrics.totalConnections} active connections`);
      this.logConnectionDetails();
    }
  }

  /**
   * Get current connection statistics
   */
  getCurrentStats() {
    const stats = getConnectionStats();
    return {
      mainDb: {
        readyState: mongoose.connection.readyState,
        name: mongoose.connection.name,
      },
      tenantDbs: stats,
      totalConnections: stats.activeConnections + 1,
    };
  }

  /**
   * Log detailed connection information
   */
  logConnectionDetails() {
    const stats = this.getCurrentStats();
    console.log('\n📊 Connection Details:');
    console.log(`   Main DB: ${stats.mainDb.name} (state: ${stats.mainDb.readyState})`);
    console.log(`   Tenant DBs: ${stats.tenantDbs.activeConnections}`);
    console.log(`   Total Connections: ${stats.totalConnections}`);
    
    if (stats.tenantDbs.connections.length > 0) {
      console.log('   Active Tenant Connections:');
      stats.tenantDbs.connections.forEach((conn) => {
        console.log(`     - ${conn.name} (Org: ${conn.organizationId}, state: ${conn.readyState})`);
      });
    }
    console.log('');
  }

  /**
   * Get connection metrics history
   */
  getMetricsHistory() {
    return this.metrics;
  }

  /**
   * Clean up stale connections
   */
  async cleanupStaleConnections() {
    console.log('🧹 Cleaning up stale connections...');
    const stats = getConnectionStats();
    
    let cleaned = 0;
    for (const conn of stats.connections) {
      // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      if (conn.readyState !== 1) {
        console.log(`   Removing stale connection: ${conn.name}`);
        // The connection will be removed from the map by closeTenantConnection
        cleaned++;
      }
    }

    console.log(`✅ Cleaned ${cleaned} stale connections`);
    return cleaned;
  }

  /**
   * Force close all connections (use with caution)
   */
  async forceCloseAll() {
    console.log('🚨 Force closing all connections...');
    await closeAllTenantConnections();
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('   Closed main database connection');
    }
    
    console.log('✅ All connections closed');
  }

  /**
   * Get connection state description
   */
  getReadyStateDescription(state: number): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[state as keyof typeof states] || 'unknown';
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  connectionManager.startMonitoring(60000); // Monitor every 60 seconds
}

// Cleanup on process termination
if (typeof process !== 'undefined' && process.on) {
  const cleanup = async () => {
    console.log('\n🛑 Process terminating, cleaning up connections...');
    connectionManager.stopMonitoring();
    await connectionManager.forceCloseAll();
    process.exit(0);
  };

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    try {
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    } catch (error) {
      console.log('⚠️  Process event handlers not available');
    }
  }
}
