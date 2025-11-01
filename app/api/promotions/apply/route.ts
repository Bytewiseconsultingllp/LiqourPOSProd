import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/tenant-db';
import { getPromotionModel } from '@/models/Promotion';
import { getAuthenticatedUser } from '@/lib/auth';

interface CartItem {
  productId: string;
  productName: string;
  brand: string;
  category: string;
  quantity: number;
  rate: number;
  subTotal: number;
}

/**
 * POST /api/promotions/apply
 * Calculate applicable promotions for a cart
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items, totalAmount } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid cart items' },
        { status: 400 }
      );
    }

    const connection = await getTenantConnection((user as any).tenantId);
    const Promotion = getPromotionModel(connection);

    // Get all active promotions
    const now = new Date();
    const activePromotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ priority: -1 });

    const applicablePromotions: any[] = [];

    for (const promotion of activePromotions) {
      let isApplicable = false;
      let discountAmount = 0;

      // Check minimum purchase amount
      if (promotion.minPurchaseAmount && totalAmount < promotion.minPurchaseAmount) {
        continue;
      }

      // Check applicability
      if (promotion.applicableOn === 'all') {
        isApplicable = true;
      } else if (promotion.applicableOn === 'category') {
        isApplicable = items.some((item: CartItem) =>
          promotion.categoryIds?.includes(item.category)
        );
      } else if (promotion.applicableOn === 'product') {
        isApplicable = items.some((item: CartItem) =>
          promotion.productIds?.includes(item.productId)
        );
      } else if (promotion.applicableOn === 'brand') {
        isApplicable = items.some((item: CartItem) =>
          promotion.brandNames?.includes(item.brand)
        );
      }

      if (!isApplicable) continue;

      // Calculate discount based on type
      if (promotion.type === 'percentage') {
        discountAmount = (totalAmount * (promotion.discountPercentage || 0)) / 100;
      } else if (promotion.type === 'fixed') {
        discountAmount = promotion.discountAmount || 0;
      } else if (promotion.type === 'buy_x_get_y') {
        // For buy X get Y, calculate based on eligible items
        const eligibleItems = items.filter((item: CartItem) => {
          if (promotion.applicableOn === 'all') return true;
          if (promotion.applicableOn === 'category') {
            return promotion.categoryIds?.includes(item.category);
          }
          if (promotion.applicableOn === 'product') {
            return promotion.productIds?.includes(item.productId);
          }
          if (promotion.applicableOn === 'brand') {
            return promotion.brandNames?.includes(item.brand);
          }
          return false;
        });

        const totalEligibleQty = eligibleItems.reduce(
          (sum: number, item: CartItem) => sum + item.quantity,
          0
        );

        const buyQty = promotion.buyQuantity || 1;
        const getQty = promotion.getQuantity || 1;
        const sets = Math.floor(totalEligibleQty / buyQty);
        
        if (sets > 0) {
          // Calculate average price of eligible items
          const avgPrice = eligibleItems.reduce(
            (sum: number, item: CartItem) => sum + item.rate,
            0
          ) / eligibleItems.length;
          
          discountAmount = sets * getQty * avgPrice;
        }
      }

      // Apply max discount cap if set
      if (promotion.maxDiscountAmount && discountAmount > promotion.maxDiscountAmount) {
        discountAmount = promotion.maxDiscountAmount;
      }

      if (discountAmount > 0) {
        applicablePromotions.push({
          promotionId: promotion._id,
          promotionName: promotion.name,
          promotionType: promotion.type, // Changed from 'type' to 'promotionType' to match Bill schema
          discountAmount: Math.round(discountAmount * 100) / 100,
          description: promotion.description,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: applicablePromotions,
      totalDiscount: applicablePromotions.reduce(
        (sum, promo) => sum + promo.discountAmount,
        0
      ),
    });
  } catch (error: any) {
    console.error('Error applying promotions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply promotions' },
      { status: 500 }
    );
  }
}
