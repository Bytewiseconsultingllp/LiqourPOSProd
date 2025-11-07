import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { X } from 'lucide-react';

interface ProductFiltersProps {
  selectedVolumes: number[];
  selectedCategories: string[];
  onVolumeToggle: (volume: number) => void;
  onCategoryToggle: (category: string) => void;
  onClearFilters: () => void;
}

const volumes = [60, 90, 150, 180, 275, 330, 375, 500, 650, 750, 1000];
const categories = ['Whisky', 'Rum', 'Vodka', 'Wine', 'Brandy', 'Gin', 'Beer', 'Tequila'];

export function ProductFilters({
  selectedVolumes,
  selectedCategories,
  onVolumeToggle,
  onCategoryToggle,
  onClearFilters,
}: ProductFiltersProps) {
  const hasFilters = selectedVolumes.length > 0 || selectedCategories.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Quick Filters</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1 h-8">
            <X className="h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Volume (ml)</p>
          <div className="flex flex-wrap gap-2">
            {volumes.map((volume) => (
              <Badge
                key={volume}
                variant={selectedVolumes.includes(volume) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => onVolumeToggle(volume)}
              >
                {volume}ml
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 capitalize"
                onClick={() => onCategoryToggle(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
