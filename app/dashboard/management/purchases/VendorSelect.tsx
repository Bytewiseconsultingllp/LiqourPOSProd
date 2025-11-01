import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Vendor } from "@/types/vendor";

interface VendorSelectProps {
  vendors: Vendor[];
  value: string;
  onChange: (value: string) => void;
}

export function VendorSelect({ vendors, value, onChange }: VendorSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedVendor = vendors.find((vendor) => vendor._id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedVendor ? (
            <span className="flex items-center gap-2">
              <span className="font-medium">{selectedVendor.name}</span>
              <span className="text-muted-foreground text-sm">({selectedVendor.tin})</span>
            </span>
          ) : (
            "Select vendor..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search vendor..." />
          <CommandList>
            <CommandEmpty>No vendor found.</CommandEmpty>
            <CommandGroup>
              {vendors.filter(v => v.isActive).map((vendor) => (
                <CommandItem
                  key={vendor._id}
                  value={`${vendor.name} ${vendor.tin}`}
                  onSelect={() => {
                    onChange(vendor._id!);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === vendor._id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{vendor.name}</span>
                    <span className="text-xs text-muted-foreground">{vendor.tin}</span>
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
