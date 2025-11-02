'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/dashboard/components/ui/tabs';
import { 
  TrendingUp, 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3,
  Layers,
  Droplet
} from 'lucide-react';
import { useState } from 'react';
import { VendorWiseReport } from './VendorWiseReport';
import { ProductWiseReport } from './ProductWiseReport';
import { CategoryWiseReport } from './CategoryWiseReport';
import { BrandWiseReport } from './BrandWiseReport';
import { VolumeWiseReport } from './VolumeWiseReport';
import { SalesSummaryReport } from './SalesSummaryReport';
import { PurchaseSummaryReport } from './PurchaseSummaryReport';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('vendor');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive sales and purchase reports with detailed analytics
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="vendor" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Vendor
            </TabsTrigger>
            <TabsTrigger value="product" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Product
            </TabsTrigger>
            <TabsTrigger value="category" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Category
            </TabsTrigger>
            <TabsTrigger value="brand" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Brand
            </TabsTrigger>
            <TabsTrigger value="volume" className="flex items-center gap-2">
              <Droplet className="h-4 w-4" />
              Volume
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sales
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Purchases
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendor">
            <VendorWiseReport />
          </TabsContent>

          <TabsContent value="product">
            <ProductWiseReport />
          </TabsContent>

          <TabsContent value="category">
            <CategoryWiseReport />
          </TabsContent>

          <TabsContent value="brand">
            <BrandWiseReport />
          </TabsContent>

          <TabsContent value="volume">
            <VolumeWiseReport />
          </TabsContent>

          <TabsContent value="sales">
            <SalesSummaryReport />
          </TabsContent>

          <TabsContent value="purchases">
            <PurchaseSummaryReport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
