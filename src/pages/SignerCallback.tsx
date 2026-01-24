import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPendingRequest } from '@/lib/nip55';
import { useAmberLogin } from '@/hooks/useAmberLogin';

type CallbackStatus = 'processing' | 'success' | 'error' | 'browser-redirect';

/**
 * Check if we're running in standalone (PWA) mode
 */
function isPWAMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         // iOS Safari PWA detection
         ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true);
}

export default function SignerCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { processLoginCallback } = useAmberLogin();

  useEffect(() => {
    async function handleCallback() {
      // Log debugging info
      const allParams = Object.fromEntries(searchParams.entries());
      const isPwa = isPWAMode();
      console.log('[SignerCallback] URL params:', allParams);
      console.log('[SignerCallback] Full URL:', window.location.href);
      console.log('[SignerCallback] Is PWA mode:', isPwa);
      console.log('[SignerCallback] User agent:', navigator.userAgent);
      
      const eventParam = searchParams.get('event');
      const pendingRequest = getPendingRequest();

      console.log('[SignerCallback] Event param:', eventParam);
      console.log('[SignerCallback] Pending request:', pendingRequest);

      if (!eventParam) {
        setStatus('error');
        setErrorMessage('No response received from signer. Please try again.');
        return;
      }

      // If we're in a browser and there's no pending request, we might have
      // been redirected here from Amber but opened in the browser instead of the PWA.
      // In this case, we should try to open the PWA with the result.
      if (!pendingRequest && !isPwa) {
        const decodedEvent = decodeURIComponent(eventParam).trim();
        if (/^[0-9a-f]{64}$/i.test(decodedEvent)) {
          console.log('[SignerCallback] Browser context detected, attempting to pass to PWA...');
          // Store the pubkey for the PWA to pick up
          localStorage.setItem('amber_callback_pubkey', decodedEvent);
          localStorage.setItem('amber_callback_timestamp', Date.now().toString());
          setStatus('browser-redirect');
          return;
        }
      }

      if (!pendingRequest) {
        // Try to process anyway if we have an event param that looks like a pubkey
        // This handles cases where localStorage was cleared but we're in the PWA
        const decodedEvent = decodeURIComponent(eventParam).trim();
        if (/^[0-9a-f]{64}$/i.test(decodedEvent)) {
          console.log('[SignerCallback] No pending request, but valid pubkey detected. Attempting login...');
          try {
            await processLoginCallback(eventParam);
            setStatus('success');
            setTimeout(() => navigate('/', { replace: true }), 1500);
            return;
          } catch (error) {
            console.error('[SignerCallback] Login attempt failed:', error);
          }
        }
        
        setStatus('error');
        setErrorMessage('No pending request found. The request may have expired. Please try logging in again.');
        return;
      }

      try {
        if (pendingRequest.type === 'get_public_key') {
          // Handle login callback
          await processLoginCallback(eventParam);
          setStatus('success');
          
          // Redirect after a short delay
          setTimeout(() => {
            const returnPath = typeof pendingRequest.returnPath === 'string' 
              ? pendingRequest.returnPath 
              : '/';
            navigate(returnPath, { replace: true });
          }, 1500);
        } else {
          setStatus('error');
          setErrorMessage(`Unknown request type: ${pendingRequest.type}`);
        }
      } catch (error) {
        console.error('[SignerCallback] Failed to process signer callback:', error);
        setStatus('error');
        setErrorMessage(
          error instanceof Error 
            ? error.message 
            : 'Failed to process the signer response'
        );
      }
    }

    handleCallback();
  }, [searchParams, navigate, processLoginCallback]);

  const handleRetry = () => {
    navigate('/', { replace: true });
  };

  const handleOpenPWA = () => {
    // Try to open the PWA using the origin URL
    // This might trigger the "Open in app" dialog on Android
    window.location.href = window.location.origin + '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-50 to-white dark:from-sky-950 dark:to-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'processing' && (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Processing...
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Success!
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Error
              </>
            )}
            {status === 'browser-redirect' && (
              <>
                <ExternalLink className="h-5 w-5 text-primary" />
                Open App
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'processing' && (
            <p className="text-muted-foreground">
              Completing login with your signer app...
            </p>
          )}
          {status === 'success' && (
            <p className="text-muted-foreground">
              You have been logged in successfully. Redirecting...
            </p>
          )}
          {status === 'error' && (
            <>
              <p className="text-muted-foreground">{errorMessage}</p>
              <Button onClick={handleRetry} variant="outline">
                Return Home
              </Button>
            </>
          )}
          {status === 'browser-redirect' && (
            <>
              <p className="text-muted-foreground">
                Amber returned the login response, but it opened in your browser instead of the Home Log app.
              </p>
              <p className="text-sm text-muted-foreground">
                Please open the Home Log app to complete the login. Your credentials have been saved.
              </p>
              <Button onClick={handleOpenPWA} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Home Log
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
