import { useState } from 'react';
import { Check, ChevronsUpDown, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer } from '@/types/customer';
import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../components/ui/command';

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
}

export function CustomerSelector({ customers, selectedCustomer, onSelectCustomer }: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleWalkInCustomer = () => {
    const walkIn = customers.find(c => c._id === 'walk-in');
    if (walkIn) {
      onSelectCustomer(walkIn);
    } else {
      // Create walk-in customer object if not found
      const walkInCustomer: Customer = {
        _id: 'walk-in',
        name: 'Walk-in Customer',
        type: 'Walk-In',
        contactInfo: {
          phone: '',
          email: '',
          address: '',
        },
        creditLimit: 0,
        outstandingBalance: 0,
        walletBalance: 0,
        isActive: true,
        organizationId: '',
        createdAt: new Date().toISOString(),
      };
      onSelectCustomer(walkInCustomer);
    }
  };

  return (
    <div className="flex gap-3 items-center">
      <Button
        onClick={handleWalkInCustomer}
        variant={selectedCustomer?._id === 'walk-in' ? 'default' : 'outline'}
        className="gap-2"
      >
        <UserRound className="h-4 w-4" />
        Walk-in Customer
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[300px] justify-between"
          >
            {selectedCustomer && selectedCustomer._id !== 'walk-in'
              ? selectedCustomer.name
              : "Search customer..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 bg-popover z-50">
          <Command>
            <CommandInput placeholder="Search customer..." />
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {customers
                .filter(customer => customer._id !== 'walk-in')
                .map((customer) => (
                  <CommandItem
                    key={customer._id}
                    value={customer.name}
                    onSelect={() => {
                      onSelectCustomer(customer);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCustomer?._id === customer._id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{customer.name}<span className="text-xs text-muted-foreground">-{customer.type}</span></span>
                      {customer.contactInfo.phone && (
                        <span className="text-xs text-muted-foreground">{customer.contactInfo.phone}</span>
                      )}
                      
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
