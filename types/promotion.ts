export interface Promotion {
  _id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  
  // Discount details
  discountPercentage?: number;
  discountAmount?: number;
  
  // Buy X Get Y details
  buyQuantity?: number;
  getQuantity?: number;
  
  // Applicability
  applicableOn: 'all' | 'category' | 'product' | 'brand';
  categoryIds?: string[];
  productIds?: string[];
  brandNames?: string[];
  
  // Conditions
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  
  // Validity
  startDate: string;
  endDate: string;
  
  // Status
  isActive: boolean;
  priority?: number;
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  organizationId?: string;
}

export interface PromotionFormData {
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discountPercentage?: number;
  discountAmount?: number;
  buyQuantity?: number;
  getQuantity?: number;
  applicableOn: 'all' | 'category' | 'product' | 'brand';
  categoryIds?: string[];
  productIds?: string[];
  brandNames?: string[];
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  priority?: number;
}

export interface AppliedPromotion {
  promotionId: string;
  promotionName: string;
  promotionType: 'percentage' | 'fixed' | 'buy_x_get_y';
  discountAmount: number;
  description?: string;
}
