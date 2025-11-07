import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getTenantConnection } from '@/lib/tenant-db';
import { getVendorStockModel } from '@/models/VendorStock';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      verifyAccessToken(authHeader.substring(7));
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const vendorId = params.id;
    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 });
    }

    const connection = await getTenantConnection(tenantId);
    const VendorStock = getVendorStockModel(connection);

    let objectId: mongoose.Types.ObjectId;
    try {
      objectId = new mongoose.Types.ObjectId(vendorId);
    } catch {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
    }

    const count = await VendorStock.countDocuments({ vendorId: objectId, currentStock: { $gt: 0 } });

    return NextResponse.json({ success: true, data: { hasStock: count > 0 } });
  } catch (error: any) {
    console.error('Error checking vendor stock:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check vendor stock' },
      { status: 500 }
    );
  }
}
