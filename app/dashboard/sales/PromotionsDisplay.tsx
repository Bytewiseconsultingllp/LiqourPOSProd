import { useEffect, useState } from 'react';
import { Tag, Percent, Gift } from 'lucide-react';
import { CartItem } from '@/types/product';
import { AppliedPromotion } from '@/types/promotion';

interface PromotionsDisplayProps {
  items: CartItem[];
  totalAmount: number;
  onPromotionsApplied: (promotions: AppliedPromotion[], totalDiscount: number) => void;
}

export function PromotionsDisplay({
  items,
  totalAmount,
  onPromotionsApplied,
}: PromotionsDisplayProps) {
  const [promotions, setPromotions] = useState<AppliedPromotion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (items.length > 0) {
      fetchApplicablePromotions();
    } else {
      setPromotions([]);
      onPromotionsApplied([], 0);
    }
  }, [items, totalAmount]);

  const fetchApplicablePromotions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/promotions/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            brand: item.brand,
            category: item.category,
            quantity: item.quantity,
            rate: item.rate,
            subTotal: item.subTotal,
          })),
          totalAmount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Ensure promotions have all required fields
        const validPromotions = (data.data || []).filter((promo: any) => 
          promo.promotionId && 
          promo.promotionName && 
          promo.promotionType && 
          promo.discountAmount !== undefined
        );
        setPromotions(validPromotions);
        onPromotionsApplied(validPromotions, data.totalDiscount || 0);
      } else {
        // If API fails, clear promotions
        setPromotions([]);
        onPromotionsApplied([], 0);
      }
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (promotions.length === 0) {
    return null;
  }

  const getPromotionIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent size={14} />;
      case 'buy_x_get_y':
        return <Gift size={14} />;
      default:
        return <Tag size={14} />;
    }
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
        <Tag size={16} />
        <span>Active Promotions</span>
      </div>
      
      {promotions.map((promo, index) => (
        <div
          key={index}
          className="flex items-center justify-between text-sm bg-white rounded px-2 py-1.5"
        >
          <div className="flex items-center gap-2">
            <span className="text-green-600">
              {getPromotionIcon(promo.promotionType)}
            </span>
            <span className="text-gray-700">{promo.promotionName}</span>
          </div>
          <span className="font-medium text-green-600">
            -₹{promo.discountAmount.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
