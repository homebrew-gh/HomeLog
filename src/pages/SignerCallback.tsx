import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPendingRequest } from '@/lib/nip55';
import { useAmberLogin } from '@/hooks/useAmberLogin';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function SignerCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { processLoginCallback } = useAmberLogin();

  useEffect(() => {
    async function handleCallback() {
      // Log all URL parameters for debugging
      const allParams = Object.fromEntries(searchParams.entries());
      console.log('[SignerCallback] URL params:', allParams);
      console.log('[SignerCallback] Full URL:', window.location.href);
      
      const eventParam = searchParams.get('event');
      const pendingRequest = getPendingRequest();

      console.log('[SignerCallback] Event param:', eventParam);
      console.log('[SignerCallback] Pending request:', pendingRequest);

      if (!eventParam) {
        setStatus('error');
        setErrorMessage('No response received from signer. Please try again.');
        return;
      }

      if (!pendingRequest) {
        // Try to process anyway if we have an event param that looks like a pubkey
        // This handles cases where localStorage was cleared
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
        </CardContent>
      </Card>
    </div>
  );
}
