import { NextRequest, NextResponse } from 'next/server';
import { connectionManager } from '@/lib/connection-manager';

/**
 * GET /api/health/connections - Get connection statistics
 * Useful for monitoring and debugging connection issues
 */
export async function GET(request: NextRequest) {
  try {
    const stats = connectionManager.getCurrentStats();
    const history = connectionManager.getMetricsHistory();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      recentMetrics: history.slice(-10), // Last 10 metrics
      warnings: stats.totalConnections > 20 ? ['High connection count detected'] : [],
    });
  } catch (error: any) {
    console.error('Error fetching connection stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection statistics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/connections - Cleanup stale connections
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'cleanup') {
      const cleaned = await connectionManager.cleanupStaleConnections();
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${cleaned} stale connections`,
        cleaned,
      });
    }

    if (action === 'details') {
      connectionManager.logConnectionDetails();
      return NextResponse.json({
        success: true,
        message: 'Connection details logged to console',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "cleanup" or "details"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error managing connections:', error);
    return NextResponse.json(
      { error: 'Failed to manage connections' },
      { status: 500 }
    );
  }
}
