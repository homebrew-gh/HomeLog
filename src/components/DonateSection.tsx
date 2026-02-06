import { useState, useEffect } from 'react';
import { Heart, Zap, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';
import QRCode from 'qrcode';
import { logger } from '@/lib/logger';

const LIGHTNING_ADDRESS = 'homebrewbitcoiner@getalby.com';

// Fetch current BTC price in USD
async function fetchBtcPrice(): Promise<number> {
  try {
    const response = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    const data = await response.json();
    return parseFloat(data.data.amount);
  } catch (error) {
    logger.error('Failed to fetch BTC price:', error);
    // Fallback price if API fails
    return 100000;
  }
}

// Convert USD to satoshis
function usdToSats(usd: number, btcPrice: number): number {
  const btcAmount = usd / btcPrice;
  const sats = Math.round(btcAmount * 100000000);
  return sats;
}

// Format satoshis with comma separators
function formatSats(sats: number): string {
  return sats.toLocaleString();
}

// Fetch Lightning invoice from LNURL
async function fetchLightningInvoice(lightningAddress: string, amountSats: number): Promise<string | null> {
  try {
    // Parse lightning address to get LNURL endpoint
    const [name, domain] = lightningAddress.split('@');
    const lnurlEndpoint = `https://${domain}/.well-known/lnurlp/${name}`;

    // Fetch LNURL pay info
    const response = await fetch(lnurlEndpoint);
    const lnurlData = await response.json();

    if (lnurlData.tag !== 'payRequest') {
      throw new Error('Invalid LNURL response');
    }

    // Amount in millisatoshis
    const amountMsat = amountSats * 1000;

    // Check if amount is within bounds
    if (amountMsat < lnurlData.minSendable || amountMsat > lnurlData.maxSendable) {
      throw new Error(`Amount must be between ${lnurlData.minSendable / 1000} and ${lnurlData.maxSendable / 1000} sats`);
    }

    // Fetch invoice
    const callbackUrl = new URL(lnurlData.callback);
    callbackUrl.searchParams.set('amount', amountMsat.toString());

    const invoiceResponse = await fetch(callbackUrl.toString());
    const invoiceData = await invoiceResponse.json();

    if (invoiceData.pr) {
      return invoiceData.pr;
    }

    throw new Error('No invoice returned');
  } catch (error) {
    logger.error('Failed to fetch Lightning invoice:', error);
    return null;
  }
}

export function DonateSection() {
  const { toast } = useToast();
  const [usdAmount, setUsdAmount] = useState<string>('5');
  const [btcPrice, setBtcPrice] = useState<number>(100000);
  const [satsAmount, setSatsAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Fetch BTC price on mount and every 5 minutes
  useEffect(() => {
    // Fetch immediately
    fetchBtcPrice().then(price => {
      setBtcPrice(price);
    });

    // Set up interval to fetch every 5 minutes
    const interval = setInterval(() => {
      fetchBtcPrice().then(price => {
        setBtcPrice(price);
      });
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Update sats amount when USD or BTC price changes
  useEffect(() => {
    const usd = parseFloat(usdAmount) || 0;
    const sats = usdToSats(usd, btcPrice);
    setSatsAmount(sats);
  }, [usdAmount, btcPrice]);

  // Generate QR code when invoice changes
  useEffect(() => {
    if (!invoice) {
      setQrCodeUrl('');
      return;
    }

    QRCode.toDataURL(invoice.toUpperCase(), {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    }).then(url => {
      setQrCodeUrl(url);
    }).catch(err => {
      logger.error('Failed to generate QR code:', err);
    });
  }, [invoice]);

  const handleDonate = async () => {
    if (satsAmount < 1) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid donation amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setDialogOpen(true);

    try {
      const inv = await fetchLightningInvoice(LIGHTNING_ADDRESS, satsAmount);
      if (inv) {
        setInvoice(inv);
      } else {
        toast({
          title: 'Failed to create invoice',
          description: 'Could not generate Lightning invoice. Please try again.',
          variant: 'destructive',
        });
        setDialogOpen(false);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create donation invoice.',
        variant: 'destructive',
      });
      setDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (invoice) {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Lightning invoice copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInWallet = () => {
    if (invoice) {
      window.open(`lightning:${invoice}`, '_blank');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setInvoice(null);
    setQrCodeUrl('');
    setCopied(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5 text-pink-400" />
          Support this project
        </span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
            <Input
              type="number"
              min="1"
              step="1"
              value={usdAmount}
              onChange={(e) => setUsdAmount(e.target.value)}
              className="w-16 h-7 pl-5 pr-1 text-xs text-center"
              placeholder="5"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            = <span className="font-mono text-amber-600 dark:text-amber-400">{formatSats(satsAmount)}</span> sats
          </span>
          <Button
            onClick={handleDonate}
            disabled={isLoading || satsAmount < 1}
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-950/30"
          >
            <Zap className="h-3 w-3 mr-1" />
            {isLoading ? '...' : 'Donate'}
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Lightning Donation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Amount display */}
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatSats(satsAmount)} sats
              </p>
              <p className="text-sm text-muted-foreground">
                ≈ ${usdAmount} USD
              </p>
            </div>

            {/* QR Code */}
            {qrCodeUrl ? (
              <div className="flex justify-center">
                <Card className="p-3">
                  <CardContent className="p-0">
                    <img
                      src={qrCodeUrl}
                      alt="Lightning Invoice QR Code"
                      className="w-full max-w-[250px] h-auto aspect-square"
                    />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-[250px] h-[250px] bg-muted animate-pulse rounded-lg" />
              </div>
            )}

            {/* Invoice display and copy */}
            {invoice && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={invoice}
                    readOnly
                    className="font-mono text-xs"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Open in wallet button */}
            <Button
              variant="outline"
              onClick={openInWallet}
              className="w-full"
              disabled={!invoice}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Lightning Wallet
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Scan the QR code or copy the invoice to pay with any Lightning wallet.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
