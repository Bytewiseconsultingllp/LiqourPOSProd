'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/dashboard/components/ui/card';
import { Input } from '@/app/dashboard/components/ui/input';
import { Button } from '@/app/dashboard/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/dashboard/components/ui/table';
import { Search, Eye, Wallet, History, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CustomerSalesDialog } from './CustomerSalesDialog';
import { CollectPaymentDialog } from './CollectPaymentDialog';
import { PaymentHistoryDialog } from './PaymentHistoryDialog';

interface Customer {
  _id: string;
  name: string;
  type: string;
  contactInfo: {
    phone?: string;
    email?: string;
  };
  creditLimit: number;
  outstandingBalance: number;
  walletBalance: number;
}

export default function CustomerLedgerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const orgData = localStorage.getItem('organization');

      if (!token || !orgData) {
        toast.error('Please login again');
        return;
      }

      const organization = JSON.parse(orgData);
      const orgId = organization._id || organization.id;

      const response = await fetch('/api/customers', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch customers');

      const result = await response.json();
      setCustomers(result.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSales = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSalesDialogOpen(true);
  };

  const handleCollectPayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentDialogOpen(true);
  };

  const handleViewHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setHistoryDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    fetchCustomers();
    setPaymentDialogOpen(false);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.contactInfo.phone?.includes(searchQuery) ||
      customer.contactInfo.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate customers with outstanding balance
  const customersWithBalance = filteredCustomers.filter(
    (c) => c.outstandingBalance > 0
  );
  const customersWithoutBalance = filteredCustomers.filter(
    (c) => c.outstandingBalance <= 0
  );

  const totalOutstanding = customersWithBalance.reduce(
    (sum, c) => sum + c.outstandingBalance,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer Ledger</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer payments and view transaction history
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredCustomers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customers with Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {customersWithBalance.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              ₹{totalOutstanding.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-lg h-12"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Customers with Outstanding Balance */}
      {customersWithBalance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-orange-600">
              Customers with Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersWithBalance.map((customer, index) => (
                    <TableRow key={customer._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {customer._id.slice(-6)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {customer.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.contactInfo.phone && (
                            <p>{customer.contactInfo.phone}</p>
                          )}
                          {customer.contactInfo.email && (
                            <p className="text-xs text-muted-foreground">
                              {customer.contactInfo.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{customer.creditLimit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-red-600">
                          ₹{customer.outstandingBalance.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewSales(customer)}
                            className="h-9 w-9 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleCollectPayment(customer)}
                            className="h-9 gap-1 bg-green-600 hover:bg-green-700"
                          >
                            <Wallet className="h-4 w-4" />
                            <span className="hidden sm:inline">Collect</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewHistory(customer)}
                            className="h-9 w-9 p-0"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Customers */}
      {customersWithoutBalance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Other Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Wallet Balance</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersWithoutBalance.map((customer, index) => (
                    <TableRow key={customer._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {customer._id.slice(-6)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {customer.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.contactInfo.phone && (
                            <p>{customer.contactInfo.phone}</p>
                          )}
                          {customer.contactInfo.email && (
                            <p className="text-xs text-muted-foreground">
                              {customer.contactInfo.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        ₹{customer.walletBalance.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewSales(customer)}
                            className="h-9 gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewHistory(customer)}
                            className="h-9 w-9 p-0"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {selectedCustomer && (  
        <>
          <CustomerSalesDialog
            customer={selectedCustomer}
            open={salesDialogOpen}
            onClose={() => setSalesDialogOpen(false)}
          />
          <CollectPaymentDialog
            customer={selectedCustomer}
            open={paymentDialogOpen}
            onClose={() => setPaymentDialogOpen(false)}
            onSuccess={handlePaymentSuccess}
          />
          <PaymentHistoryDialog
            customer={selectedCustomer}
            open={historyDialogOpen}
            onClose={() => setHistoryDialogOpen(false)}
            onPaymentReverted={fetchCustomers}
          />
        </>
      )}
    </div>
  );
}
