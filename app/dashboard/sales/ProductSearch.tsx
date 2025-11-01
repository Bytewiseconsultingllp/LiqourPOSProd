import { useState } from 'react';
import { Product } from '@/types/product';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "../components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Button } from '../components/ui/button';
import { Search } from 'lucide-react';

interface ProductSearchProps {
  products: Product[];  
  onSelectProduct: (product: Product) => void;
}

export function ProductSearch({ products, onSelectProduct }: ProductSearchProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Search className="h-4 w-4" />
          Search products...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-popover z-50" align="start">
        <Command>
          <CommandInput placeholder="Search by name or category..." />
          <CommandEmpty>No products found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {products.map((product) => (
              <CommandItem
                key={product._id}
                value={`${product.name} ${product.category}`}
                onSelect={() => {
                  onSelectProduct(product);
                  setOpen(false);
                }}
                className="flex items-center gap-3 py-3"
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {product.category} • {product.volumeML}ml • ₹{product.pricePerUnit}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
