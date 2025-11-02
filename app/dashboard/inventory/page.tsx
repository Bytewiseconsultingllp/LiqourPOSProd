'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/dashboard/components/ui/tabs';
import { ClipboardCheck, Package } from 'lucide-react';
import { useState } from 'react';
import { ClosingStockUpdateTable } from './ClosingStockUpdateTable';
import { StockOverview } from './StockOverview';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Inventory Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor stock levels and update closing inventory
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Stock Overview
            </TabsTrigger>
            <TabsTrigger value="closing" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Closing Stock Update
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <StockOverview />
          </TabsContent>

          <TabsContent value="closing">
            <ClosingStockUpdateTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
