import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/tenant-db';
import { getPromotionModel } from '@/models/Promotion';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * GET /api/promotions/[id]
 * Get a single promotion by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await getTenantConnection((user as any).tenantId);
    const Promotion = getPromotionModel(connection);

    const promotion = await Promotion.findById(params.id);

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: promotion,
    });
  } catch (error: any) {
    console.error('Error fetching promotion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch promotion' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/promotions/[id]
 * Update a promotion
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const connection = await getTenantConnection((user as any).tenantId);
    const Promotion = getPromotionModel(connection);

    // Convert date strings to Date objects if present
    const updateData: any = { ...body };
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    const promotion = await Promotion.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: promotion,
    });
  } catch (error: any) {
    console.error('Error updating promotion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update promotion' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/promotions/[id]
 * Delete a promotion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await getTenantConnection((user as any).tenantId);
    const Promotion = getPromotionModel(connection);

    const promotion = await Promotion.findByIdAndDelete(params.id);

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Promotion deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete promotion' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/promotions/[id]
 * Toggle promotion active status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isActive } = await request.json();

    const connection = await getTenantConnection((user as any).tenantId);
    const Promotion = getPromotionModel(connection);

    const promotion = await Promotion.findByIdAndUpdate(
      params.id,
      { isActive },
      { new: true }
    );

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: promotion,
    });
  } catch (error: any) {
    console.error('Error toggling promotion status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle promotion status' },
      { status: 500 }
    );
  }
}
