import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { ProductDetails } from "@/types/product";

interface ProductSelectProps {
  products: ProductDetails[];
  value: string;
  onChange: (value: string) => void;
}

export function ProductSelect({ products, value, onChange }: ProductSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedProduct = products.find((product) => product._id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedProduct ? (
            <span className="flex items-center gap-2">
              <span className="font-medium">{selectedProduct.name}</span>
              <span className="text-muted-foreground text-sm">({selectedProduct.brand} • {selectedProduct.volumeML}ml)</span>
            </span>
          ) : (
            "Select product..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search product..." />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {products.filter(p => p.isActive).map((product) => (
                <CommandItem
                  key={product._id}
                  value={`${product.name} ${product.brand} ${product.category}`}
                  onSelect={() => {
                    onChange(product._id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === product._id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.brand} • {product.volumeML}ml • {product.category}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
