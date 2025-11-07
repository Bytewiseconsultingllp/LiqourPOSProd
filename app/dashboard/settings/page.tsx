'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/app/dashboard/components/ui/card';
import { Button } from '@/app/dashboard/components/ui/button';
import { Checkbox } from '@/app/dashboard/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/dashboard/components/ui/tabs';
import { Printer, RotateCcw, Save, FileText, Receipt, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  PrintSettings,
  BillFieldSettings,
  FIELD_LABELS,
  FIELD_CATEGORIES,
  DEFAULT_PRINT_SETTINGS,
} from '@/types/print-settings';
import { getPrintSettings, savePrintSettings, resetPrintSettings } from '@/lib/print-settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const loadedSettings = await getPrintSettings();
        setSettings(loadedSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error('Failed to load print settings');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleFieldToggle = (
    billType: 'mainBill' | 'subBill',
    field: keyof BillFieldSettings
  ) => {
    setSettings((prev) => ({
      ...prev,
      [billType]: {
        ...prev[billType],
        [field]: !prev[billType][field],
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await savePrintSettings(settings);
      setHasChanges(false);
      toast.success('Print settings saved successfully!');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.message || 'Failed to save print settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all print settings to default?')) {
      try {
        setSaving(true);
        await resetPrintSettings();
        const defaultSettings = await getPrintSettings();
        setSettings(defaultSettings);
        setHasChanges(false);
        toast.success('Print settings reset to default');
      } catch (error: any) {
        console.error('Failed to reset settings:', error);
        toast.error(error.message || 'Failed to reset print settings');
      } finally {
        setSaving(false);
      }
    }
  };

  const renderFieldCheckboxes = (billType: 'mainBill' | 'subBill') => {
    return (
      <div className="space-y-6">
        {Object.entries(FIELD_CATEGORIES).map(([category, fields]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
              {category.replace(/([A-Z])/g, ' $1').trim()}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {fields.map((field) => {
                const fieldKey = field as keyof BillFieldSettings;
                const isEnabled = settings[billType][fieldKey];
                
                // Hide sub-bill number for main bill
                if (billType === 'mainBill' && fieldKey === 'subBillNumber') {
                  return null;
                }

                return (
                  <div
                    key={field}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                      isEnabled
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Checkbox
                      id={`${billType}-${field}`}
                      checked={isEnabled}
                      onCheckedChange={() => handleFieldToggle(billType, fieldKey)}
                      className="h-5 w-5"
                    />
                    <label
                      htmlFor={`${billType}-${field}`}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {FIELD_LABELS[fieldKey]}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading print settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Printer className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Print Settings</h1>
              <p className="text-gray-600 mt-1">
                Customize which fields appear on your printed bills and sub-bills (applies to entire organization)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="gap-2"
            size="lg"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="gap-2"
            size="lg"
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Reset to Default
          </Button>
        </div>

        {/* Settings Tabs */}
        <Card className="p-6">
          <Tabs defaultValue="mainBill" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="mainBill" className="gap-2">
                <FileText className="h-4 w-4" />
                Main Bill
              </TabsTrigger>
              <TabsTrigger value="subBill" className="gap-2">
                <Receipt className="h-4 w-4" />
                Sub-Bill
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mainBill" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Main Bill:</strong> Configure which fields appear on the primary bill
                  printed for customers. These settings apply to all regular sales transactions.
                </p>
              </div>
              {renderFieldCheckboxes('mainBill')}
            </TabsContent>

            <TabsContent value="subBill" className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-purple-800">
                  <strong>Sub-Bill:</strong> Configure which fields appear on sub-bills. Sub-bills
                  are automatically created when the total volume exceeds 2.5 liters.
                </p>
              </div>
              {renderFieldCheckboxes('subBill')}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Preview Info */}
        <Card className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Printer className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Preview Your Changes</h3>
              <p className="text-sm text-gray-700">
                After saving your settings, go to the Sales page and create a test bill to see how
                your customized print layout looks. The bill preview will match the exact structure
                of the printed PDF.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
