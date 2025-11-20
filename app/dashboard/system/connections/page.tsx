'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/dashboard/components/ui/card';
import { Button } from '@/app/dashboard/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { 
  Database, 
  Loader2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Server
} from 'lucide-react';
import { toast } from 'sonner';

interface ConnectionInfo {
  organizationId: string;
  readyState: number;
  name: string;
  lastUsed: Date;
  useCount: number;
  idleTime: number;
}

interface ConnectionStats {
  totalConnections: number;
  mainDb: {
    readyState: number;
    name: string;
  };
  tenantDbs: {
    activeConnections: number;
    registeredModels: number;
    maxConnections: number;
    connections: ConnectionInfo[];
  };
}

export default function ConnectionsPage() {
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchStats = async (showLoading = true) => {
    try {
      if (showLoading) setRefreshing(true);
      
      const response = await apiFetch('/api/health/connections');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        
        // Show warning if high connection count
        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach((warning: string) => {
            toast.warning(warning);
          });
        }
      } else {
        toast.error('Failed to fetch connection statistics');
      }
    } catch (error: any) {
      console.error('Error fetching connection stats:', error);
      toast.error(error.message || 'Failed to load connection statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCleanup = async () => {
    try {
      setRefreshing(true);
      
      const response = await apiFetch('/api/health/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        // Refresh stats after cleanup
        await fetchStats(false);
      } else {
        toast.error('Failed to cleanup connections');
      }
    } catch (error: any) {
      console.error('Error cleaning up connections:', error);
      toast.error(error.message || 'Failed to cleanup connections');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchStats(false);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getReadyStateColor = (state: number) => {
    switch (state) {
      case 0: return 'text-red-500'; // disconnected
      case 1: return 'text-green-500'; // connected
      case 2: return 'text-yellow-500'; // connecting
      case 3: return 'text-orange-500'; // disconnecting
      default: return 'text-gray-500';
    }
  };

  const getReadyStateText = (state: number) => {
    switch (state) {
      case 0: return 'Disconnected';
      case 1: return 'Connected';
      case 2: return 'Connecting';
      case 3: return 'Disconnecting';
      default: return 'Unknown';
    }
  };

  const getConnectionHealthStatus = () => {
    if (!stats) return { color: 'gray', icon: Activity, text: 'Unknown' };
    
    if (stats.totalConnections > 40) {
      return { color: 'red', icon: XCircle, text: 'Critical' };
    } else if (stats.totalConnections > 20) {
      return { color: 'yellow', icon: AlertTriangle, text: 'Warning' };
    } else {
      return { color: 'green', icon: CheckCircle, text: 'Healthy' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const healthStatus = getConnectionHealthStatus();
  const HealthIcon = healthStatus.icon;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Connections</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage MongoDB connections
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          
          <Button
            onClick={() => fetchStats()}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={handleCleanup}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            Cleanup Idle
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <HealthIcon className={`h-6 w-6 text-${healthStatus.color}-500`} />
              <span className={`text-2xl font-bold text-${healthStatus.color}-500`}>
                {healthStatus.text}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-blue-500" />
              <span className="text-2xl font-bold">{stats?.totalConnections || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tenant Databases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Server className="h-6 w-6 text-purple-500" />
              <span className="text-2xl font-bold">{stats?.tenantDbs.activeConnections || 0}</span>
              <span className="text-sm text-muted-foreground">
                / {stats?.tenantDbs.maxConnections || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Main Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${stats?.mainDb.readyState === 1 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {stats ? getReadyStateText(stats.mainDb.readyState) : 'Unknown'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.mainDb.name || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tenant Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats || stats.tenantDbs.connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active tenant connections
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Organization ID</th>
                    <th className="text-left p-3 font-medium">Database Name</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Use Count</th>
                    <th className="text-right p-3 font-medium">Idle Time</th>
                    <th className="text-left p-3 font-medium">Last Used</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.tenantDbs.connections.map((conn, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm">{conn.organizationId}</td>
                      <td className="p-3 text-sm">{conn.name}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 text-sm ${getReadyStateColor(conn.readyState)}`}>
                          <div className={`h-2 w-2 rounded-full ${conn.readyState === 1 ? 'bg-green-500' : 'bg-red-500'}`} />
                          {getReadyStateText(conn.readyState)}
                        </span>
                      </td>
                      <td className="p-3 text-right text-sm">{conn.useCount}</td>
                      <td className="p-3 text-right text-sm">
                        <span className={conn.idleTime > 240 ? 'text-orange-500' : ''}>
                          {conn.idleTime}s
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(conn.lastUsed).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connection Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Max Tenant Connections:</span>
              <span className="font-mono">{stats?.tenantDbs.maxConnections || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Current Usage:</span>
              <span className="font-mono">
                {stats?.tenantDbs.activeConnections || 0} ({Math.round(((stats?.tenantDbs.activeConnections || 0) / (stats?.tenantDbs.maxConnections || 1)) * 100)}%)
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Registered Models:</span>
              <span className="font-mono">{stats?.tenantDbs.registeredModels || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Auto-cleanup:</span>
              <span className="text-green-500 font-medium">Enabled</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Cleanup Interval:</span>
              <span className="font-mono">2-5 minutes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Idle Timeout:</span>
              <span className="font-mono">5 minutes</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
