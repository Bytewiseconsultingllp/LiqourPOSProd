import { Product } from '@/types/product';
import { Package } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
      onClick={() => onSelect(product)}
    >
      <div className="aspect-square bg-muted relative overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <Badge className="absolute top-2 right-2 bg-primary">
          {product.volumeML}ml
        </Badge>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold line-clamp-1">{product.name}</h3>
        <p className="text-sm text-muted-foreground capitalize">{product.category}</p>
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-primary">₹{product.pricePerUnit}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="h-3 w-3" />
            <span>{product.currentStock} in stock</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
