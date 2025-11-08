'use client';

import React, { useEffect, useState } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { Button } from '@/app/dashboard/components/ui/button';
import { ThermalBillPrint } from './ThermalBillPrint';
import { BatchPrintSubBills } from './BatchPrintSubBills';
import { Customer } from '@/types/customer';
import { apiFetch } from '@/lib/api-client';

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

interface SubBillsViewerProps {
  sale: Sale;
  customer: Customer | null;
  onClose: () => void;
}

export const SubBillsViewer: React.FC<SubBillsViewerProps> = ({ sale, customer, onClose }) => {
  const [viewingSubBill, setViewingSubBill] = useState<any | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiFetch('/api/qrcodes');
        if (!resp.ok) return;
        const data = await resp.json();
        const codes = Array.isArray(data?.data) ? data.data : [];
        const def = codes.find((q: any) => q?.isDefault) || codes[0];
        if (def?.imageBase64) {
          const src = String(def.imageBase64).startsWith('data:')
            ? def.imageBase64
            : `data:image/png;base64,${def.imageBase64}`;
          setQrSrc(src);
        }
      } catch { }
    })();
  }, []);

  if (!sale.subBills || sale.subBills.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Sub-Bills</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No sub-bills found for this sale.</p>
            <p className="text-sm mt-2">
              Sub-bills are created when total volume exceeds 2.5L
            </p>
          </div>
          <Button onClick={onClose} className="w-full mt-4">
            Close
          </Button>
        </div>
      </div>
    );
  }

  const handleViewSubBill = (subBill: SubBill, index: number) => {
    // Create a bill data object for the sub-bill
    const subBillData = {
      totalBillId: sale.totalBillId,
      subBillId: `${sale.totalBillId}-SUB${index + 1}`,
      billNumber: `${sale.totalBillId}-SUB${index + 1}`,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      items: subBill.items,
      totalAmount: subBill.totalAmount,
      itemDiscountAmount: 0,
      billDiscountAmount: 0,
      promotionDiscountAmount: subBill.totalDiscountAmount,
      payment: {
        mode: subBill.paymentMode,
        cashAmount: subBill.cashPaidAmount,
        onlineAmount: subBill.onlinePaidAmount,
        creditAmount: subBill.creditPaidAmount,
      },
      saleDate: sale.saleDate,
      createdAt: sale.createdAt,
    };

    setViewingSubBill(subBillData);
    setViewingIndex(index);
  };

  const handleCloseSubBill = () => {
    setViewingSubBill(null);
    setViewingIndex(null);
  };

  const handlePrintAll = () => {
    if (!sale.subBills || sale.subBills.length === 0) return;
    setShowBatchPrint(true);
  };

  const handleCloseBatchPrint = () => {
    setShowBatchPrint(false);
  };

  const calculateSubBillVolume = (subBill: SubBill) => {
    return subBill.items.reduce(
      (sum, item) => sum + (item.volumePerUnitML || 0) * item.quantity,
      0
    );
  };

  const calculateSubBillQuantity = (subBill: SubBill) => {
    return subBill.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">Sub-Bills</h2>
              <p className="text-sm text-gray-600 mt-1">
                Bill: {sale.totalBillId} • {sale.customerName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This bill was automatically split into{' '}
                <strong>{sale.subBills.length} sub-bills</strong> because the total volume
                exceeded 2.5 liters. Each sub-bill contains a maximum of 2.5L.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sale.subBills.map((subBill, index) => {
                const volume = calculateSubBillVolume(subBill);
                const quantity = calculateSubBillQuantity(subBill);

                return (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">Sub-Bill {index + 1}</h3>
                        <p className="text-sm text-gray-600">
                          {sale.totalBillId}-SUB{index + 1}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-lg font-bold text-blue-600">
                          ₹{subBill.totalAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Items:</span>
                        <span className="font-medium">{subBill.items.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-medium">{quantity} bottles</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Volume:</span>
                        <span className="font-medium">{(volume / 1000).toFixed(2)}L</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">
                          ₹{subBill.subTotalAmount.toFixed(2)}
                        </span>
                      </div>
                      {subBill.totalDiscountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-medium text-green-600">
                            -₹{subBill.totalDiscountAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3 mb-3">
                      <div className="text-xs text-gray-600 mb-2">Payment Breakdown:</div>
                      <div className="space-y-1">
                        {subBill.cashPaidAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Cash:</span>
                            <span>₹{subBill.cashPaidAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {subBill.onlinePaidAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Online:</span>
                            <span>₹{subBill.onlinePaidAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {subBill.creditPaidAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Credit:</span>
                            <span>₹{subBill.creditPaidAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">
                        Products:
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {subBill.items.map((item, itemIndex) => (
                          <div
                            key={itemIndex}
                            className="text-xs text-gray-700 flex justify-between"
                          >
                            <span className="truncate flex-1">
                              {item.productName} ({item.quantity}x)
                            </span>
                            <span className="ml-2">
                              ₹{(item.rate * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleViewSubBill(subBill, index)}
                      className="w-full mt-4 gap-2"
                      variant="outline"
                    >
                      <Printer className="h-4 w-4" />
                      View & Print Sub-Bill {index + 1}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                <strong>Total across all sub-bills:</strong>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  ₹
                  {sale.subBills
                    .reduce((sum, sb) => sum + sb.totalAmount, 0)
                    .toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {sale.subBills.reduce(
                    (sum, sb) => sum + calculateSubBillQuantity(sb),
                    0
                  )}{' '}
                  bottles •{' '}
                  {(
                    sale.subBills.reduce((sum, sb) => sum + calculateSubBillVolume(sb), 0) /
                    1000
                  ).toFixed(2)}
                  L
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handlePrintAll}
                className="flex-1 gap-2"
              >
                <Printer className="h-4 w-4" />
                Print All {sale.subBills.length} Sub-Bills
              </Button>
              <Button onClick={onClose} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Bill Print Preview */}
      {viewingSubBill && (
        <ThermalBillPrint
          billData={viewingSubBill}
          billType="sub"
          onClose={handleCloseSubBill}
        />
      )}

      {/* Batch Print All Sub-Bills */}
      {showBatchPrint && (
        <BatchPrintSubBills
          sale={sale}
          qrSrc={qrSrc}
          customer={customer}
          onClose={handleCloseBatchPrint}
        />
      )}
    </>
  );
};
