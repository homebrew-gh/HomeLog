import { RefreshCw, Clock, Bitcoin, DollarSign, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { getGroupedCurrencies, getCurrency } from '@/lib/currency';

interface CurrencySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CurrencySettingsDialog({ isOpen, onClose }: CurrencySettingsDialogProps) {
  const {
    entryCurrency,
    displayCurrency,
    setEntryCurrency,
    setDisplayCurrency,
    hasRates,
    lastUpdated,
    isRefreshing,
    updateRates,
    convert,
    format,
  } = useCurrency();

  const groupedCurrencies = getGroupedCurrencies();

  const handleUpdateRates = async () => {
    await updateRates();
  };

  // Get currency display name
  const getCurrencyDisplay = (code: string) => {
    const currency = getCurrency(code);
    if (!currency) return code;
    return `${currency.symbol} ${currency.name} (${currency.code})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Currency Settings
          </DialogTitle>
          <DialogDescription>
            Configure how currencies are displayed and entered throughout the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Entry Currency */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Data Entry Currency</Label>
            <p className="text-sm text-muted-foreground">
              The default currency used when adding new costs and prices.
            </p>
            <Select value={entryCurrency} onValueChange={setEntryCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {groupedCurrencies.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className="flex items-center gap-2">
                      {group.label === 'Bitcoin' && <Bitcoin className="h-3.5 w-3.5" />}
                      {group.label}
                    </SelectLabel>
                    {group.currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono w-12">{currency.symbol}</span>
                          <span>{currency.name}</span>
                          <span className="text-muted-foreground">({currency.code})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Display Currency */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Display Currency</Label>
            <p className="text-sm text-muted-foreground">
              Convert and show all amounts in this currency.
            </p>
            <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {groupedCurrencies.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className="flex items-center gap-2">
                      {group.label === 'Bitcoin' && <Bitcoin className="h-3.5 w-3.5" />}
                      {group.label}
                    </SelectLabel>
                    {group.currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono w-12">{currency.symbol}</span>
                          <span>{currency.name}</span>
                          <span className="text-muted-foreground">({currency.code})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exchange Rates Section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Exchange Rates</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpdateRates}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Updating...' : 'Update Rates'}
              </Button>
            </div>
            
            {hasRates && lastUpdated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last updated: {lastUpdated}</span>
                </div>
                {entryCurrency !== displayCurrency && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Rate used for conversion:</span>
                    {' '}
                    1 {entryCurrency} = {format(convert(1, entryCurrency, displayCurrency), displayCurrency)}
                  </div>
                )}
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No exchange rates loaded. Click "Update Rates" to fetch current rates for currency conversion.
                </AlertDescription>
              </Alert>
            )}

            <p className="text-xs text-muted-foreground">
              Exchange rates are fetched on-demand and stored locally. They are not automatically updated to respect your privacy and reduce network requests.
            </p>
          </div>

          {/* Current Settings Summary */}
          {entryCurrency !== displayCurrency && (
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Amounts entered in <strong>{getCurrencyDisplay(entryCurrency)}</strong> will be converted and displayed in <strong>{getCurrencyDisplay(displayCurrency)}</strong>.
                {!hasRates && (
                  <span className="block mt-1 text-amber-600 dark:text-amber-400">
                    Update exchange rates to enable conversion.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
