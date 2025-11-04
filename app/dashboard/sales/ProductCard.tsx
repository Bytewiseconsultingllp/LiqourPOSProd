import { Product } from '@/types/product';
import { Package } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const outOfStock = (product.currentStock ?? 0) <= 0;
  return (
    <Card
      className={`overflow-hidden transition-all duration-300 ${outOfStock ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-lg hover:-translate-y-1'}`}
      onClick={() => {
        if (outOfStock) return;
        onSelect(product);
      }}
      aria-disabled={outOfStock}
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
        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-semibold px-2 py-1 bg-red-600 rounded">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold line-clamp-1">{product.name}</h3>
        <p className="text-sm text-muted-foreground capitalize">{product.category}</p>
        <div className="flex items-center justify-between">
          <p className={`text-lg font-bold ${outOfStock ? 'text-muted-foreground' : 'text-primary'}`}>₹{product.pricePerUnit}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="h-3 w-3" />
            <span>{product.currentStock ?? 0} in stock</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
