'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '@/app/dashboard/components/ui/button';
import { Input } from '@/app/dashboard/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { 
  Calendar, 
  Download, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  Package,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

export function TodayReport() {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const downloadReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await apiFetch(`/api/reports/quick-report?date=${selectedDate}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download report');
      }
      
      // Get PDF blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Today_Report_${selectedDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Report downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading report:', error);
      toast.error(error.message || 'Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-2xl">Today's Report</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Daily sales, expenses, and cash flow summary
              </p>
            </div>
            <Button
              onClick={downloadReport}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF Report
                </>
              )}
            </Button>
          </div>

          {/* Date Selector */}
          <div className="mt-4 max-w-xs">
            <label className="text-sm font-medium mb-2 block">Report Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Period: {selectedDate} 4:00 AM to {new Date(new Date(selectedDate).getTime() + 24*60*60*1000).toISOString().split('T')[0]} 3:59 AM
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Sales Summary</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Total bills, amounts, and payment modes
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500 rounded-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">Credit Tracking</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Credit given and collected details
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500 rounded-lg">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">Expenses & Cash</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Daily expenses and cash flow
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Report Sections Preview */}
          <div className="mt-6 space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold text-sm">1. Sales Overview</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Total bills, quantity, volume, average bill value, and complete financial breakdown with payment modes
              </p>
            </div>

            <div className="border-l-4 border-red-500 pl-4 py-2">
              <h3 className="font-semibold text-sm">2. Credit Given</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Customer-wise credit details with amounts for each customer
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="font-semibold text-sm">3. Credit Collected</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Customer-wise credit collection with cash and online breakdowns
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-semibold text-sm">4. Expenses</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Category-wise expense breakdown with payment mode details
              </p>
            </div>

            <div className="border-l-4 border-gray-700 pl-4 py-2">
              <h3 className="font-semibold text-sm">5. Cash Summary & Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Complete cash flow analysis with inflows, outflows, and closing cash
              </p>
            </div>
          </div>

          {/* Action Section */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Download className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">Download Complete Report</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the "Download PDF Report" button above to generate and download a detailed PDF report 
                  with all sections including tables for credit given, credit collected, and expenses.
                  All customer and transaction details will be included.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
