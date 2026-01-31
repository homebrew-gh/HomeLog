import { useState, useEffect, useCallback, useRef } from 'react';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';
import { NSecSigner, NRelay1 } from '@nostrify/nostrify';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';

export interface NostrConnectResult {
  /** The remote signer's pubkey */
  remotePubkey: string;
  /** The user's pubkey (may be different from remotePubkey) */
  userPubkey: string;
  /** The client's secret key in nsec format for storage */
  clientNsec: string;
  /** The relay URL used for communication */
  relayUrl: string;
}

interface NostrConnectLoginProps {
  /** Called when connection is successfully established */
  onConnect: (result: NostrConnectResult) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** App name to display in signer apps */
  appName?: string;
  /** App URL for identification */
  appUrl?: string;
}

export function NostrConnectLogin({
  onConnect,
  onError,
  appName = 'CypherLog',
  appUrl = window.location.origin,
}: NostrConnectLoginProps) {
  const { config } = useAppContext();
  const [connectUri, setConnectUri] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>('');

  // Use refs to track connection state and allow cleanup
  const connectionRef = useRef<{
    clientSecretKey: Uint8Array;
    secret: string;
    relay: NRelay1;
    aborted: boolean;
  } | null>(null);

  // Get first write relay for NostrConnect communication
  const getConnectRelay = useCallback(() => {
    const writeRelay = config.relayMetadata.relays.find(r => r.write);
    return writeRelay?.url ?? 'wss://relay.damus.io';
  }, [config.relayMetadata.relays]);

  // Generate a random secret for the connection
  // NIP-46 example shows short alphanumeric secrets like "0s8j2djs"
  const generateSecret = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => chars[b % chars.length]).join('');
  };

  // Generate the nostrconnect:// URI and QR code
  const generateConnection = useCallback(async () => {
    setIsGenerating(true);
    setError('');
    setConnectUri('');
    setQrDataUrl('');

    // Clean up any existing connection
    if (connectionRef.current) {
      connectionRef.current.aborted = true;
      try {
        connectionRef.current.relay.close();
      } catch {
        // Ignore close errors
      }
    }

    try {
      // Generate a new client keypair
      const clientSecretKey = generateSecretKey();
      const clientPubkey = getPublicKey(clientSecretKey);
      const secret = generateSecret();
      const relayUrl = getConnectRelay();

      // Build the nostrconnect:// URI according to NIP-46
      const params = new URLSearchParams();
      params.set('relay', relayUrl);
      params.set('secret', secret);
      params.set('name', appName);
      params.set('url', appUrl);
      // Request common permissions
      params.set('perms', 'sign_event,nip04_encrypt,nip04_decrypt,nip44_encrypt,nip44_decrypt');

      const uri = `nostrconnect://${clientPubkey}?${params.toString()}`;
      console.log('[NostrConnectLogin] Generated URI:', uri);
      console.log('[NostrConnectLogin] Secret:', secret);
      console.log('[NostrConnectLogin] Relay:', relayUrl);
      setConnectUri(uri);

      // Generate QR code
      const qrUrl = await QRCode.toDataURL(uri, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(qrUrl);

      // Open relay connection and start listening
      const relay = new NRelay1(relayUrl);

      connectionRef.current = {
        clientSecretKey,
        secret,
        relay,
        aborted: false,
      };

      setIsGenerating(false);
      setIsConnecting(true);

      // Listen for the connect response
      await waitForConnection(relay, clientSecretKey, clientPubkey, secret, relayUrl);
    } catch (err) {
      console.error('[NostrConnectLogin] Error generating connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate connection');
      setIsGenerating(false);
      setIsConnecting(false);
      onError?.(err instanceof Error ? err : new Error('Failed to generate connection'));
    }
  }, [appName, appUrl, getConnectRelay, onError]);

  // Wait for the signer to respond to our nostrconnect:// request
  const waitForConnection = async (
    relay: NRelay1,
    clientSecretKey: Uint8Array,
    clientPubkey: string,
    secret: string,
    relayUrl: string
  ) => {
    try {
      const clientSigner = new NSecSigner(clientSecretKey);

      // Create a timeout for the connection (2 minutes)
      const timeout = AbortSignal.timeout(120000);

      // Subscribe to kind 24133 events addressed to us
      const sub = relay.req(
        [{ kinds: [24133], '#p': [clientPubkey], limit: 1 }],
        { signal: timeout }
      );

      for await (const msg of sub) {
        if (connectionRef.current?.aborted) {
          break;
        }

        if (msg[0] === 'EVENT') {
          const event = msg[2];
          console.log('[NostrConnectLogin] Received event from:', event.pubkey);

          // Decrypt the response using NIP-44 or NIP-04
          let decrypted: string;
          try {
            // Try NIP-44 first
            decrypted = await clientSigner.nip44!.decrypt(event.pubkey, event.content);
            console.log('[NostrConnectLogin] Decrypted with NIP-44');
          } catch (e) {
            console.log('[NostrConnectLogin] NIP-44 decrypt failed, trying NIP-04:', e);
            // Fall back to NIP-04
            try {
              decrypted = await clientSigner.nip04!.decrypt(event.pubkey, event.content);
              console.log('[NostrConnectLogin] Decrypted with NIP-04');
            } catch (e2) {
              console.warn('[NostrConnectLogin] Failed to decrypt response with both NIP-44 and NIP-04:', e2);
              continue;
            }
          }

          const response = JSON.parse(decrypted);
          console.log('[NostrConnectLogin] Received response:', response);
          console.log('[NostrConnectLogin] Expected secret:', secret);

          // Check for errors first
          if (response.error) {
            console.error('[NostrConnectLogin] Signer returned error:', response.error);
            throw new Error(response.error);
          }

          // Check if this is a successful connect response
          // Different signers respond differently:
          // - Some return the secret we sent
          // - Some return "ack"  
          // - Some return the user's pubkey
          // - Some just return a truthy result
          if (response.result) {
            // The remote signer's pubkey is the event author
            const remotePubkey = event.pubkey;

            // If the result looks like a pubkey (64 hex chars), use it as the user pubkey
            // Otherwise assume user pubkey = remote pubkey
            const resultIsHexPubkey = typeof response.result === 'string' && 
                                       /^[0-9a-f]{64}$/i.test(response.result);
            const userPubkey = resultIsHexPubkey ? response.result : remotePubkey;
            
            console.log('[NostrConnectLogin] Connection successful!', {
              remotePubkey,
              userPubkey,
              resultWas: response.result,
            });
            
            // Convert client secret key to nsec for storage
            const clientNsec = nip19.nsecEncode(clientSecretKey);

            setIsConnecting(false);
            
            // Return the connection result
            onConnect({
              remotePubkey,
              userPubkey,
              clientNsec,
              relayUrl,
            });
            return;
          }
        }
      }
    } catch (err) {
      if (connectionRef.current?.aborted) {
        return;
      }

      console.error('[NostrConnectLogin] Connection error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setIsConnecting(false);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  };

  // Copy URI to clipboard
  const copyToClipboard = async () => {
    if (!connectUri) return;
    try {
      await navigator.clipboard.writeText(connectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Generate connection on mount
  useEffect(() => {
    generateConnection();

    return () => {
      // Cleanup on unmount
      if (connectionRef.current) {
        connectionRef.current.aborted = true;
        try {
          connectionRef.current.relay.close();
        } catch {
          // Ignore close errors
        }
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Info about NostrConnect */}
      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
        <p className="text-xs text-muted-foreground">
          Scan this QR code with your Nostr signer app (like <a href="https://nsec.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">nsec.app</a>, <a href="https://github.com/greenart7c3/Amber" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Amber</a>, or another NIP-46 compatible signer).
        </p>
        <p className="text-xs text-muted-foreground">
          Both devices talk through Nostr relays (not directly). Keep your signer app open and connected to the same relay for the first load; profile and data may take a bit longer than with a local key.
        </p>
      </div>

      {/* QR Code Display */}
      <div className="flex flex-col items-center space-y-4">
        {isGenerating ? (
          <div className="w-[280px] h-[280px] flex items-center justify-center bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : qrDataUrl ? (
          <div className="relative">
            <img
              src={qrDataUrl}
              alt="NostrConnect QR Code"
              className="rounded-lg border shadow-sm"
              width={280}
              height={280}
            />
            {isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Waiting for connection...</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-[280px] h-[280px] flex items-center justify-center bg-muted rounded-lg border-2 border-dashed">
            <QrCode className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={copyToClipboard}
            disabled={!connectUri || isGenerating}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                Copy URI
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateConnection}
            disabled={isGenerating}
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Link to learn more */}
      <a
        href="https://nostrconnect.org"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        <span>Learn more about Nostr Connect</span>
      </a>
    </div>
  );
}
