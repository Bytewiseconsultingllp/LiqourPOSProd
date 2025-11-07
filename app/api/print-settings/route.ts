import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/tenant-db';
import getPrintSettingsModel from '@/models/PrintSettings';

/**
 * GET /api/print-settings
 * Fetch print settings for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const organizationId =
      request.headers.get('x-organization-id') || request.headers.get('x-tenant-id');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const tenantDB = await getTenantConnection(organizationId);
    const PrintSettings = getPrintSettingsModel(tenantDB);

    // Get or create default settings
    let settings = await PrintSettings.findOne({ organizationId });

    if (!settings) {
      // Create default settings
      settings = await PrintSettings.create({
        organizationId,
        mainBill: {
          organizationName: true,
          organizationAddress: true,
          organizationPhone: true,
          organizationGSTIN: true,
          billNumber: true,
          subBillNumber: false,
          date: true,
          customerName: true,
          customerPhone: true,
          productName: true,
          brand: true,
          quantity: true,
          rate: true,
          volume: true,
          itemSubtotal: true,
          itemDiscount: true,
          totalItems: true,
          totalQuantity: true,
          totalVolume: true,
          subtotal: true,
          discount: true,
          grandTotal: true,
          paymentMode: true,
          cashAmount: true,
          onlineAmount: true,
          creditAmount: true,
          footer: true,
        },
        subBill: {
          organizationName: true,
          organizationAddress: true,
          organizationPhone: true,
          organizationGSTIN: true,
          billNumber: true,
          subBillNumber: true,
          date: true,
          customerName: true,
          customerPhone: true,
          productName: true,
          brand: true,
          quantity: true,
          rate: true,
          volume: true,
          itemSubtotal: true,
          itemDiscount: true,
          totalItems: true,
          totalQuantity: true,
          totalVolume: true,
          subtotal: true,
          discount: true,
          grandTotal: true,
          paymentMode: true,
          cashAmount: true,
          onlineAmount: true,
          creditAmount: true,
          footer: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        mainBill: settings.mainBill,
        subBill: settings.subBill,
      },
    });
  } catch (error: any) {
    console.error('Error fetching print settings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch print settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/print-settings
 * Update print settings for the organization
 */
export async function PUT(request: NextRequest) {
  try {
    const organizationId =
      request.headers.get('x-organization-id') || request.headers.get('x-tenant-id');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { mainBill, subBill } = body;

    if (!mainBill || !subBill) {
      return NextResponse.json(
        { success: false, error: 'Both mainBill and subBill settings are required' },
        { status: 400 }
      );
    }

    const tenantDB = await getTenantConnection(organizationId);
    const PrintSettings = getPrintSettingsModel(tenantDB);

    // Update or create settings
    const settings = await PrintSettings.findOneAndUpdate(
      { organizationId },
      {
        organizationId,
        mainBill,
        subBill,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Print settings updated successfully',
      data: {
        mainBill: settings.mainBill,
        subBill: settings.subBill,
      },
    });
  } catch (error: any) {
    console.error('Error updating print settings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update print settings' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/print-settings
 * Reset print settings to default
 */
export async function DELETE(request: NextRequest) {
  try {
    const organizationId =
      request.headers.get('x-organization-id') || request.headers.get('x-tenant-id');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const tenantDB = await getTenantConnection(organizationId);
    const PrintSettings = getPrintSettingsModel(tenantDB);

    // Delete existing settings (will be recreated with defaults on next GET)
    await PrintSettings.deleteOne({ organizationId });

    return NextResponse.json({
      success: true,
      message: 'Print settings reset to default',
    });
  } catch (error: any) {
    console.error('Error resetting print settings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset print settings' },
      { status: 500 }
    );
  }
}
