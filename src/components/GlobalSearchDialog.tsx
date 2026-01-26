import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Car, 
  Building2, 
  CreditCard, 
  Shield, 
  Wrench,
  Loader2
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useGlobalSearch, type SearchResult, type SearchResultType } from '@/hooks/useGlobalSearch';
import type { 
  Appliance, 
  Vehicle, 
  Company, 
  Subscription, 
  Warranty, 
  MaintenanceSchedule 
} from '@/lib/types';

// Icons for each result type
const typeIcons: Record<SearchResultType, React.ReactNode> = {
  appliance: <Package className="h-4 w-4" />,
  vehicle: <Car className="h-4 w-4" />,
  company: <Building2 className="h-4 w-4" />,
  subscription: <CreditCard className="h-4 w-4" />,
  warranty: <Shield className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
};

// Labels for each result type
const typeLabels: Record<SearchResultType, string> = {
  appliance: 'Appliances',
  vehicle: 'Vehicles',
  company: 'Companies',
  subscription: 'Subscriptions',
  warranty: 'Warranties',
  maintenance: 'Maintenance',
};

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Callbacks for items that don't have dedicated pages
  onSelectCompany?: (company: Company) => void;
  onSelectSubscription?: (subscription: Subscription) => void;
  onSelectWarranty?: (warranty: Warranty) => void;
  onSelectMaintenance?: (maintenance: MaintenanceSchedule) => void;
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
  onSelectCompany,
  onSelectSubscription,
  onSelectWarranty,
  onSelectMaintenance,
}: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { results, totalCount, isLoading, hasQuery } = useGlobalSearch(query);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = useCallback((result: SearchResult) => {
    switch (result.type) {
      case 'appliance':
        // Navigate to asset detail page
        navigate(`/asset/appliance/${result.id}`);
        break;
      case 'vehicle':
        // Navigate to asset detail page
        navigate(`/asset/vehicle/${result.id}`);
        break;
      case 'company':
        onSelectCompany?.(result.item as Company);
        break;
      case 'subscription':
        onSelectSubscription?.(result.item as Subscription);
        break;
      case 'warranty':
        onSelectWarranty?.(result.item as Warranty);
        break;
      case 'maintenance':
        onSelectMaintenance?.(result.item as MaintenanceSchedule);
        break;
    }
    onOpenChange(false);
  }, [navigate, onOpenChange, onSelectCompany, onSelectSubscription, onSelectWarranty, onSelectMaintenance]);

  const renderResultItem = (result: SearchResult) => (
    <CommandItem
      key={`${result.type}-${result.id}`}
      value={`${result.type}-${result.id}-${result.title}`}
      onSelect={() => handleSelect(result)}
      className="flex items-center gap-3 py-3"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
        {typeIcons[result.type]}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-medium truncate">{result.title}</span>
        {(result.subtitle || result.meta) && (
          <span className="text-xs text-muted-foreground truncate">
            {[result.subtitle, result.meta].filter(Boolean).join(' • ')}
          </span>
        )}
      </div>
    </CommandItem>
  );

  const hasResults = totalCount > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search appliances, vehicles, companies..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        {isLoading && hasQuery && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && hasQuery && !hasResults && (
          <CommandEmpty>
            No results found for "{query}"
          </CommandEmpty>
        )}

        {!hasQuery && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Start typing to search...
          </div>
        )}

        {hasQuery && hasResults && (
          <>
            {results.appliances.length > 0 && (
              <CommandGroup heading={typeLabels.appliance}>
                {results.appliances.slice(0, 5).map(renderResultItem)}
              </CommandGroup>
            )}

            {results.vehicles.length > 0 && (
              <>
                {results.appliances.length > 0 && <CommandSeparator />}
                <CommandGroup heading={typeLabels.vehicle}>
                  {results.vehicles.slice(0, 5).map(renderResultItem)}
                </CommandGroup>
              </>
            )}

            {results.companies.length > 0 && (
              <>
                {(results.appliances.length > 0 || results.vehicles.length > 0) && <CommandSeparator />}
                <CommandGroup heading={typeLabels.company}>
                  {results.companies.slice(0, 5).map(renderResultItem)}
                </CommandGroup>
              </>
            )}

            {results.subscriptions.length > 0 && (
              <>
                {(results.appliances.length > 0 || results.vehicles.length > 0 || results.companies.length > 0) && <CommandSeparator />}
                <CommandGroup heading={typeLabels.subscription}>
                  {results.subscriptions.slice(0, 5).map(renderResultItem)}
                </CommandGroup>
              </>
            )}

            {results.warranties.length > 0 && (
              <>
                {(results.appliances.length > 0 || results.vehicles.length > 0 || results.companies.length > 0 || results.subscriptions.length > 0) && <CommandSeparator />}
                <CommandGroup heading={typeLabels.warranty}>
                  {results.warranties.slice(0, 5).map(renderResultItem)}
                </CommandGroup>
              </>
            )}

            {results.maintenance.length > 0 && (
              <>
                {(results.appliances.length > 0 || results.vehicles.length > 0 || results.companies.length > 0 || results.subscriptions.length > 0 || results.warranties.length > 0) && <CommandSeparator />}
                <CommandGroup heading={typeLabels.maintenance}>
                  {results.maintenance.slice(0, 5).map(renderResultItem)}
                </CommandGroup>
              </>
            )}
          </>
        )}
      </CommandList>

      {/* Footer with keyboard shortcut hint */}
      <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {hasQuery && hasResults && `${totalCount} result${totalCount !== 1 ? 's' : ''}`}
        </span>
        <span className="flex items-center gap-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
          <span>to toggle</span>
        </span>
      </div>
    </CommandDialog>
  );
}
