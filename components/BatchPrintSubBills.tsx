'use client';

import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getPrintSettings, getPrintSettingsSync } from '@/lib/print-settings';
import { BillFieldSettings } from '@/types/print-settings';

interface SubBill {
  items: any[];
  subTotalAmount: number;
  totalDiscountAmount: number;
  totalAmount: number;
  paymentMode: string;
  cashPaidAmount: number;
  onlinePaidAmount: number;
  creditPaidAmount: number;
}

interface Sale {
  _id: string;
  totalBillId: string;
  customerName: string;
  customerPhone?: string;
  subBills?: SubBill[];
  saleDate?: string;
  createdAt?: string;
}

interface BatchPrintSubBillsProps {
  sale: Sale;
  onClose: () => void;
}

export const BatchPrintSubBills: React.FC<BatchPrintSubBillsProps> = ({ sale, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<BillFieldSettings | null>(null);

  // Load print settings
  useEffect(() => {
    const printSettings = getPrintSettingsSync();
    setSettings(printSettings.subBill);
  }, []);

  // Safety check
  if (!sale.subBills || sale.subBills.length === 0) {
    onClose();
    return null;
  }

  // Don't render until settings are loaded
  if (!settings) {
    return null;
  }

  // Get organization info from localStorage
  const getOrgInfo = () => {
    try {
      const orgData = localStorage.getItem('organization');
      if (orgData) {
        const org = JSON.parse(orgData);
        return {
          name: org.name || 'LIQUOR POS',
          address: org.address || '',
          phone: org.phone || '',
          gstin: org.gstin || org.gstNumber || '',
        };
      }
    } catch (error) {
      console.error('Error parsing organization data:', error);
    }
    return {
      name: 'LIQUOR POS',
      address: '',
      phone: '',
      gstin: '',
    };
  };

  const orgInfo = getOrgInfo();

  useEffect(() => {
    // Auto-trigger print after component mounts
    const timer = setTimeout(() => {
      handlePrint();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=302,height=500');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Sub-Bills - ${sale.totalBillId}</title>
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
              .page-break {
                page-break-after: always;
                break-after: page;
              }
              .sub-bill:last-child .page-break {
                page-break-after: auto;
                break-after: auto;
              }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 0;
              width: 80mm;
              background: white;
            }
            .sub-bill {
              padding: 8px;
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
              margin-bottom: 12px;
            }
            .page-break {
              height: 20px;
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
      onClose();
    }, 250);
  };

  const renderSubBill = (subBill: SubBill, index: number) => {
    const totalQuantity = subBill.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalVolume = subBill.items.reduce(
      (sum, item) => sum + (item.volumePerUnitML || 0) * item.quantity,
      0
    );

    return (
      <div key={index} className="sub-bill">
        {/* Header */}
        <div className="header">
          {settings!.organizationName && <div className="org-name">{orgInfo.name}</div>}
          {settings!.organizationAddress && orgInfo.address && <div className="org-details">{orgInfo.address}</div>}
          {settings!.organizationPhone && orgInfo.phone && <div className="org-details">Ph: {orgInfo.phone}</div>}
          {settings!.organizationGSTIN && orgInfo.gstin && <div className="org-details">GSTIN: {orgInfo.gstin}</div>}
          <div className="bill-type">--- SUB BILL {index + 1} ---</div>
        </div>

        {/* Bill Info */}
        <div className="section">
          {settings!.billNumber && (
            <div className="row">
              <span className="label">Bill No:</span>
              <span>{sale.totalBillId}</span>
            </div>
          )}
          {settings!.subBillNumber && (
            <div className="row">
              <span className="label">Sub Bill:</span>
              <span>{sale.totalBillId}-SUB{index + 1}</span>
            </div>
          )}
          {settings!.date && (
            <div className="row">
              <span className="label">Date:</span>
              <span>
                {new Date(sale.saleDate || sale.createdAt || new Date()).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
          {settings!.customerName && (
            <div className="row">
              <span className="label">Customer:</span>
              <span>{sale.customerName}</span>
            </div>
          )}
          {settings!.customerPhone && sale.customerPhone && (
            <div className="row">
              <span className="label">Phone:</span>
              <span>{sale.customerPhone}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="items-table">
          {subBill.items.map((item, itemIndex) => (
            <div key={itemIndex} className="item-row">
              {settings!.productName && (
                <div className="item-name">
                  {item.productName}
                  {settings!.brand && item.brand && ` - ${item.brand}`}
                </div>
              )}
              <div className="item-details">
                <span>
                  {settings!.quantity && `${item.quantity} x `}
                  {settings!.rate && `₹${item.rate.toFixed(2)}`}
                  {settings!.volume && item.volumePerUnitML && ` (${item.volumePerUnitML}ml)`}
                </span>
                {settings!.itemSubtotal && (
                  <span>₹{(item.rate * item.quantity).toFixed(2)}</span>
                )}
              </div>
              {settings!.itemDiscount && item.discountAmount && item.discountAmount > 0 && (
                <div className="item-details" style={{ fontSize: '10px', color: '#666' }}>
                  <span>Discount</span>
                  <span>-₹{item.discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        {(settings!.totalItems || settings!.totalQuantity || settings!.totalVolume) && (
          <div className="section">
            {settings!.totalItems && (
              <div className="row">
                <span>Total Items:</span>
                <span>{subBill.items.length}</span>
              </div>
            )}
            {settings!.totalQuantity && (
              <div className="row">
                <span>Total Quantity:</span>
                <span>{totalQuantity} bottles</span>
              </div>
            )}
            {settings!.totalVolume && totalVolume > 0 && (
              <div className="row">
                <span>Total Volume:</span>
                <span>{(totalVolume / 1000).toFixed(2)}L</span>
              </div>
            )}
          </div>
        )}

        {/* Totals */}
        <div className="totals">
          {settings!.subtotal && (
            <div className="total-row">
              <span>Subtotal:</span>
              <span>₹{subBill.subTotalAmount.toFixed(2)}</span>
            </div>
          )}
          {settings!.discount && subBill.totalDiscountAmount > 0 && (
            <div className="total-row">
              <span>Discount:</span>
              <span>-₹{subBill.totalDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          {settings!.grandTotal && (
            <div className="total-row grand-total">
              <span>TOTAL:</span>
              <span>₹{subBill.totalAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Payment */}
        {(settings!.paymentMode || settings!.cashAmount || settings!.onlineAmount || settings!.creditAmount) && (
          <div className="section">
            {settings!.paymentMode && (
              <div className="row">
                <span className="label">Payment Mode:</span>
                <span>{subBill.paymentMode}</span>
              </div>
            )}
            {settings!.cashAmount && subBill.cashPaidAmount > 0 && (
              <div className="row">
                <span>Cash:</span>
                <span>₹{subBill.cashPaidAmount.toFixed(2)}</span>
              </div>
            )}
            {settings!.onlineAmount && subBill.onlinePaidAmount > 0 && (
              <div className="row">
                <span>Online:</span>
                <span>₹{subBill.onlinePaidAmount.toFixed(2)}</span>
              </div>
            )}
            {settings!.creditAmount && subBill.creditPaidAmount > 0 && (
              <div className="row">
                <span>Credit:</span>
                <span>₹{subBill.creditPaidAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {settings!.footer && (
          <div className="footer">
            <div>Thank you for your business!</div>
            <div>Please visit again</div>
          </div>
        )}

        {/* Page Break (except for last sub-bill) */}
        {index < sale.subBills!.length - 1 && <div className="page-break"></div>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Preparing Sub-Bills for Print...</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Generating {sale.subBills!.length} sub-bills for printing...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Print dialog will open automatically
          </p>
        </div>

        {/* Hidden print content */}
        <div style={{ display: 'none' }}>
          <div ref={printRef}>
            {sale.subBills!.map((subBill, index) => renderSubBill(subBill, index))}
          </div>
        </div>
      </div>
    </div>
  );
};
