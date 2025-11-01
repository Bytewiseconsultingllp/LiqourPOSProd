import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/tenant-db';
import { getPromotionModel } from '@/models/Promotion';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * GET /api/promotions
 * Get all promotions with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const connection = await getTenantConnection(user.tenantId);
    const Promotion = getPromotionModel(connection);

    // Build query
    const query: any = {};
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    if (type) {
      query.type = type;
    }

    // If activeOnly, get only currently active promotions
    if (activeOnly) {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }

    const promotions = await Promotion.find(query).sort({ priority: -1, createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: promotions,
      count: promotions.length,
    });
  } catch (error: any) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch promotions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/promotions
 * Create a new promotion
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      discountPercentage,
      discountAmount,
      buyQuantity,
      getQuantity,
      applicableOn,
      categoryIds,
      productIds,
      brandNames,
      minPurchaseAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      isActive,
      priority,
    } = body;

    // Validation
    if (!name || !type || !applicableOn || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate type-specific fields
    if (type === 'percentage' && !discountPercentage) {
      return NextResponse.json(
        { error: 'Discount percentage is required for percentage type' },
        { status: 400 }
      );
    }

    if (type === 'fixed' && !discountAmount) {
      return NextResponse.json(
        { error: 'Discount amount is required for fixed type' },
        { status: 400 }
      );
    }

    if (type === 'buy_x_get_y' && (!buyQuantity || !getQuantity)) {
      return NextResponse.json(
        { error: 'Buy and get quantities are required for buy X get Y type' },
        { status: 400 }
      );
    }

    const connection = await getTenantConnection(user.tenantId);
    const Promotion = getPromotionModel(connection);

    const promotion = await Promotion.create({
      name,
      description,
      type,
      discountPercentage,
      discountAmount,
      buyQuantity,
      getQuantity,
      applicableOn,
      categoryIds,
      productIds,
      brandNames,
      minPurchaseAmount,
      maxDiscountAmount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || 0,
      createdBy: user.userId,
      organizationId: user.tenantId,
    });

    return NextResponse.json({
      success: true,
      data: promotion,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create promotion' },
      { status: 500 }
    );
  }
}
