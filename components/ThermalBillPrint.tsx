'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/app/dashboard/components/ui/button';
import { getPrintSettings, getPrintSettingsSync } from '@/lib/print-settings';
import { BillFieldSettings } from '@/types/print-settings';

interface BillItem {
  productName: string;
  brand?: string;
  quantity: number;
  rate: number;
  discountAmount?: number;
  finalAmount: number;
  volumePerUnitML?: number;
}

interface BillData {
  totalBillId?: string;
  subBillId?: string;
  billNumber?: string;
  customerName: string;
  customerPhone?: string;
  items: BillItem[];
  totalAmount: number;
  itemDiscountAmount?: number;
  billDiscountAmount?: number;
  promotionDiscountAmount?: number;
  payment?: {
    mode: string;
    cashAmount?: number;
    onlineAmount?: number;
    creditAmount?: number;
  };
  saleDate?: string;
  createdAt?: string;
  organizationName?: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationGSTIN?: string;
}

interface ThermalBillPrintProps {
  billData: BillData;
  onClose: () => void;
  billType?: 'main' | 'sub';
}

export const ThermalBillPrint: React.FC<ThermalBillPrintProps> = ({
  billData,
  onClose,
  billType = 'main',
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<BillFieldSettings | null>(null);

  // Load print settings on mount
  useEffect(() => {
    // Use sync version for immediate render
    const syncSettings = getPrintSettingsSync();
    setSettings(billType === 'main' ? syncSettings.mainBill : syncSettings.subBill);
    
    // Then fetch fresh settings from API
    const loadSettings = async () => {
      try {
        const freshSettings = await getPrintSettings();
        setSettings(billType === 'main' ? freshSettings.mainBill : freshSettings.subBill);
      } catch (error) {
        console.error('Failed to load fresh print settings:', error);
      }
    };
    
    loadSettings();
  }, [billType]);

  // Get organization info from localStorage
  const getOrgInfo = () => {
    try {
      const orgData = localStorage.getItem('organization');
      if (orgData) {
        const org = JSON.parse(orgData);
        return {
          name: org.name || billData.organizationName || 'LIQUOR POS',
          address: org.address || billData.organizationAddress || '',
          phone: org.phone || billData.organizationPhone || '',
          gstin: org.gstin || org.gstNumber || billData.organizationGSTIN || '',
        };
      }
    } catch (error) {
      console.error('Error parsing organization data:', error);
    }
    return {
      name: billData.organizationName || 'LIQUOR POS',
      address: billData.organizationAddress || '',
      phone: billData.organizationPhone || '',
      gstin: billData.organizationGSTIN || '',
    };
  };

  const orgInfo = getOrgInfo();

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=302,height=500');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${billType === 'main' ? 'Bill' : 'Sub Bill'} - ${billData.totalBillId || billData.billNumber}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 8px;
              width: 80mm;
              background: white;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .org-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .org-details {
              font-size: 10px;
              margin: 2px 0;
            }
            .bill-type {
              font-size: 14px;
              font-weight: bold;
              margin: 8px 0;
              text-transform: uppercase;
            }
            .section {
              margin: 8px 0;
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .label {
              font-weight: bold;
            }
            .items-table {
              width: 100%;
              margin: 8px 0;
            }
            .item-row {
              margin: 4px 0;
              padding: 4px 0;
              border-bottom: 1px dotted #ccc;
            }
            .item-name {
              font-weight: bold;
              margin-bottom: 2px;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .totals {
              margin-top: 8px;
              border-top: 2px solid #000;
              padding-top: 8px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
              font-size: 13px;
            }
            .grand-total {
              font-size: 16px;
              font-weight: bold;
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              padding: 4px 0;
              margin-top: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 12px;
              font-size: 10px;
              border-top: 2px dashed #000;
              padding-top: 8px;
            }
            .center {
              text-align: center;
            }
            .right {
              text-align: right;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const totalQuantity = billData.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalVolume = billData.items.reduce(
    (sum, item) => sum + (item.volumePerUnitML || 0) * item.quantity,
    0
  );
  const subtotal = billData.items.reduce((sum, item) => sum + item.rate * item.quantity, 0);
  const totalDiscount =
    (billData.itemDiscountAmount || 0) +
    (billData.billDiscountAmount || 0) +
    (billData.promotionDiscountAmount || 0);

  // Don't render until settings are loaded
  if (!settings) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">
            {billType === 'main' ? 'Bill Preview' : 'Sub Bill Preview'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Bill Preview - Scrollable - Matches PDF exactly */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div
            ref={printRef}
            className="bg-white p-4 mx-auto"
            style={{ width: '80mm', fontFamily: 'Courier New, monospace', fontSize: '12px' }}
          >
            {/* Header */}
            <div className="header">
              {settings.organizationName && (
                <div className="org-name">{orgInfo.name}</div>
              )}
              {settings.organizationAddress && orgInfo.address && (
                <div className="org-details">{orgInfo.address}</div>
              )}
              {settings.organizationPhone && orgInfo.phone && (
                <div className="org-details">Ph: {orgInfo.phone}</div>
              )}
              {settings.organizationGSTIN && orgInfo.gstin && (
                <div className="org-details">GSTIN: {orgInfo.gstin}</div>
              )}
              <div className="bill-type">
                {billType === 'main' ? '--- BILL ---' : '--- SUB BILL ---'}
              </div>
            </div>

            {/* Bill Info */}
            <div className="section">
              {settings.billNumber && (
                <div className="row">
                  <span className="label">Bill No:</span>
                  <span>{billData.totalBillId || billData.billNumber || 'N/A'}</span>
                </div>
              )}
              {settings.subBillNumber && billType === 'sub' && billData.subBillId && (
                <div className="row">
                  <span className="label">Sub Bill:</span>
                  <span>{billData.subBillId}</span>
                </div>
              )}
              {settings.date && (
                <div className="row">
                  <span className="label">Date:</span>
                  <span>
                    {new Date(billData.saleDate || billData.createdAt || new Date()).toLocaleString(
                      'en-IN',
                      {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </span>
                </div>
              )}
              {settings.customerName && (
                <div className="row">
                  <span className="label">Customer:</span>
                  <span>{billData.customerName}</span>
                </div>
              )}
              {settings.customerPhone && billData.customerPhone && (
                <div className="row">
                  <span className="label">Phone:</span>
                  <span>{billData.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="items-table">
              {billData.items.map((item, index) => (
                <div key={index} className="item-row">
                  {settings.productName && (
                    <div className="item-name">
                      {item.productName}
                      {settings.brand && item.brand && ` - ${item.brand}`}
                    </div>
                  )}
                  <div className="item-details">
                    <span>
                      {settings.quantity && `${item.quantity} x `}
                      {settings.rate && `₹${item.rate.toFixed(2)}`}
                      {settings.volume && item.volumePerUnitML && ` (${item.volumePerUnitML}ml)`}
                    </span>
                    {settings.itemSubtotal && (
                      <span>₹{(item.rate * item.quantity).toFixed(2)}</span>
                    )}
                  </div>
                  {settings.itemDiscount && item.discountAmount && item.discountAmount > 0 && (
                    <div className="item-details" style={{ fontSize: '10px', color: '#666' }}>
                      <span>Discount</span>
                      <span>-₹{item.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary */}
            {(settings.totalItems || settings.totalQuantity || settings.totalVolume) && (
              <div className="section">
                {settings.totalItems && (
                  <div className="row">
                    <span>Total Items:</span>
                    <span>{billData.items.length}</span>
                  </div>
                )}
                {settings.totalQuantity && (
                  <div className="row">
                    <span>Total Quantity:</span>
                    <span>{totalQuantity} bottles</span>
                  </div>
                )}
                {settings.totalVolume && totalVolume > 0 && (
                  <div className="row">
                    <span>Total Volume:</span>
                    <span>{(totalVolume / 1000).toFixed(2)}L</span>
                  </div>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="totals">
              {settings.subtotal && (
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
              )}
              {settings.discount && totalDiscount > 0 && (
                <div className="total-row">
                  <span>Discount:</span>
                  <span>-₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}
              {settings.grandTotal && (
                <div className="total-row grand-total">
                  <span>TOTAL:</span>
                  <span>₹{billData.totalAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Payment */}
            {billData.payment && (settings.paymentMode || settings.cashAmount || settings.onlineAmount || settings.creditAmount) && (
              <div className="section">
                {settings.paymentMode && (
                  <div className="row">
                    <span className="label">Payment Mode:</span>
                    <span>{billData.payment.mode}</span>
                  </div>
                )}
                {settings.cashAmount && billData.payment.cashAmount && billData.payment.cashAmount > 0 && (
                  <div className="row">
                    <span>Cash:</span>
                    <span>₹{billData.payment.cashAmount.toFixed(2)}</span>
                  </div>
                )}
                {settings.onlineAmount && billData.payment.onlineAmount && billData.payment.onlineAmount > 0 && (
                  <div className="row">
                    <span>Online:</span>
                    <span>₹{billData.payment.onlineAmount.toFixed(2)}</span>
                  </div>
                )}
                {settings.creditAmount && billData.payment.creditAmount && billData.payment.creditAmount > 0 && (
                  <div className="row">
                    <span>Credit:</span>
                    <span>₹{billData.payment.creditAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            {settings.footer && (
              <div className="footer">
                <div>Thank you for your business!</div>
                <div>Please visit again</div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex gap-3">
          <Button onClick={handlePrint} className="flex-1 gap-2">
            <Printer className="h-4 w-4" />
            Print Bill
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
