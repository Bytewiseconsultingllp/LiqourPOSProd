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

    const connection = await getTenantConnection((user as any).organizationId);
    const Promotion = getPromotionModel(connection);

    // Get all active promotions
    const now = new Date();
    const activePromotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ priority: -1 });

    const applicablePromotions: any[] = [];

    const calculateEligibleItems = (promotion: any) => {
      if (promotion.applicableOn === 'all') {
        return items;
      }

      if (promotion.applicableOn === 'category') {
        return items.filter((item: CartItem) =>
          promotion.categoryIds?.includes(item.category)
        );
      }

      if (promotion.applicableOn === 'product') {
        return items.filter((item: CartItem) =>
          promotion.productIds?.includes(item.productId)
        );
      }

      if (promotion.applicableOn === 'brand') {
        return items.filter((item: CartItem) =>
          promotion.brandNames?.includes(item.brand)
        );
      }

      return [];
    };

    const calculateEligibleSubtotal = (eligibleItems: CartItem[]) => {
      return eligibleItems.reduce((sum: number, item: CartItem) => {
        const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
        const rate = Number.isFinite(item.rate) ? item.rate : 0;
        if (quantity > 0 && rate > 0) {
          return sum + rate * quantity;
        }
        const fallbackSubtotal = Number.isFinite(item.subTotal) ? item.subTotal : 0;
        return sum + fallbackSubtotal;
      }, 0);
    };

    for (const promotion of activePromotions) {
      let isApplicable = false;
      let discountAmount = 0;

      // Check minimum purchase amount
      if (promotion.minPurchaseAmount && totalAmount < promotion.minPurchaseAmount) {
        continue;
      }

      // Check applicability
      const eligibleItems = calculateEligibleItems(promotion);
      const eligibleSubtotal = calculateEligibleSubtotal(eligibleItems);

      if (promotion.applicableOn === 'all') {
        isApplicable = items.length > 0;
      } else {
        isApplicable = eligibleItems.length > 0;
      }

      if (!isApplicable || eligibleSubtotal <= 0) continue;

      // Calculate discount based on type
      if (promotion.type === 'percentage') {
        discountAmount = (eligibleSubtotal * (promotion.discountPercentage || 0)) / 100;
      } else if (promotion.type === 'fixed') {
        const fixedAmount = promotion.discountAmount || 0;
        discountAmount = Math.min(fixedAmount, eligibleSubtotal);
      } else if (promotion.type === 'buy_x_get_y') {
        // For buy X get Y, calculate based on eligible items
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
