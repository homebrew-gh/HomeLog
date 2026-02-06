import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, RefreshCw, Lock, Globe, Settings, Upload, Check, AlertCircle, ShieldCheck, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useUserPreferences, DEFAULT_BLOSSOM_SERVERS } from '@/contexts/UserPreferencesContext';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAllBlossomUrls } from '@/hooks/useAllBlossomUrls';
import { useBlossomSync } from '@/hooks/useBlossomSync';
import { NoPrivateServerError } from '@/hooks/useUploadFile';
import { BlossomUploader, NostrBuildUploader } from '@nostrify/nostrify/uploaders';

type ServerStatus = 'checking' | 'connected' | 'error' | 'unknown';

interface TestResult {
  url: string;
  success: boolean;
  error?: string;
  uploadedUrl?: string;
}

// Check Blossom server connectivity by making a HEAD request
async function checkServerConnectivity(url: string): Promise<boolean> {
  try {
    // Try to fetch the server root - Blossom servers typically respond to GET requests
    const _response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors', // Use no-cors mode to avoid CORS issues for connectivity check
    });
    // In no-cors mode, we can't read the response, but if it doesn't throw, server is reachable
    return true;
  } catch {
    return false;
  }
}

// Interval for periodic connectivity checks (30 seconds)
const CONNECTIVITY_CHECK_INTERVAL = 30000;

export function BlossomServerManager() {
  const {
    preferences,
    addBlossomServer,
    removeBlossomServer,
    toggleBlossomServer,
    toggleBlossomServerPrivate,
    hasPrivateBlossomServer,
  } = useUserPreferences();
  const { toast } = useToast();
  const { user } = useCurrentUser();

  const [newServerUrl, setNewServerUrl] = useState('');
  const [serverStatuses, setServerStatuses] = useState<Record<string, ServerStatus>>({});
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const servers = preferences.blossomServers || DEFAULT_BLOSSOM_SERVERS;
  const hasPrivateServer = hasPrivateBlossomServer();
  const allBlossomUrls = useAllBlossomUrls();
  const { sync: runSync, progress: syncProgress, resetProgress: resetSyncProgress } = useBlossomSync(allBlossomUrls);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Use a ref to track servers for the interval callback to avoid recreating it
  const serversRef = useRef(servers);
  serversRef.current = servers;

  // Check connectivity for a single server
  const checkServer = useCallback(async (url: string) => {
    setServerStatuses(prev => ({ ...prev, [url]: 'checking' }));
    const isConnected = await checkServerConnectivity(url);
    setServerStatuses(prev => ({ ...prev, [url]: isConnected ? 'connected' : 'error' }));
  }, []);

  // Check connectivity for all servers - stable function that reads from ref
  const checkAllServers = useCallback(async () => {
    const currentServers = serversRef.current;
    setIsCheckingAll(true);
    const urls = currentServers.map(s => s.url);
    
    // Set all to checking
    setServerStatuses(prev => {
      const newStatuses = { ...prev };
      urls.forEach(url => {
        newStatuses[url] = 'checking';
      });
      return newStatuses;
    });

    // Check all in parallel
    await Promise.all(urls.map(async (url) => {
      const isConnected = await checkServerConnectivity(url);
      setServerStatuses(prev => ({ ...prev, [url]: isConnected ? 'connected' : 'error' }));
    }));

    setIsCheckingAll(false);
  }, []);

  // Initial connectivity check and periodic re-check - runs only once on mount
  useEffect(() => {
    // Initial check
    checkAllServers();

    // Set up periodic check
    checkIntervalRef.current = setInterval(checkAllServers, CONNECTIVITY_CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkAllServers]);

  const isValidServerUrl = (url: string): boolean => {
    const trimmed = url.trim();
    if (!trimmed) return false;

    try {
      // Try to parse as URL, add https if missing
      let normalized = trimmed;
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
      }
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddServer = () => {
    if (!isValidServerUrl(newServerUrl)) {
      toast({
        title: 'Invalid server URL',
        description: 'Please enter a valid Blossom server URL (e.g., https://blossom.example.com)',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicates
    let normalized = newServerUrl.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    if (!normalized.endsWith('/')) {
      normalized = `${normalized}/`;
    }

    if (servers.some(s => s.url === normalized)) {
      toast({
        title: 'Server already exists',
        description: 'This server is already in your list.',
        variant: 'destructive',
      });
      return;
    }

    addBlossomServer(newServerUrl);
    setNewServerUrl('');
    
    // Check the new server
    setTimeout(() => checkServer(normalized), 100);
    
    toast({
      title: 'Server added',
      description: 'Blossom server has been added to your list. Mark it as "Private" if you want to use it for sensitive uploads. Use "Sync files to all private servers" below to copy existing documents to this server.',
    });
  };

  const handleRemoveServer = (url: string) => {
    if (servers.length <= 1) {
      toast({
        title: 'Cannot remove server',
        description: 'You must have at least one Blossom server configured.',
        variant: 'destructive',
      });
      return;
    }
    removeBlossomServer(url);
    toast({
      title: 'Server removed',
      description: 'Blossom server has been removed from your list.',
    });
  };

  const handleToggleServer = (url: string) => {
    const server = servers.find(s => s.url === url);
    const enabledCount = servers.filter(s => s.enabled).length;
    
    // Prevent disabling the last enabled server
    if (server?.enabled && enabledCount <= 1) {
      toast({
        title: 'Cannot disable server',
        description: 'You must have at least one enabled Blossom server.',
        variant: 'destructive',
      });
      return;
    }
    
    toggleBlossomServer(url);
  };

  const handleTogglePrivate = (url: string) => {
    toggleBlossomServerPrivate(url);
    const server = servers.find(s => s.url === url);
    if (server && !server.isPrivate) {
      toast({
        title: 'Server marked as private',
        description: 'This server will now be used for sensitive file uploads.',
      });
    }
  };

  const renderServerUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (parsed.pathname === '/') {
        return parsed.host;
      } else {
        return parsed.host + parsed.pathname;
      }
    } catch {
      return url;
    }
  };

  // Get status indicator color and tooltip
  const getStatusInfo = (status: ServerStatus) => {
    switch (status) {
      case 'connected':
        return { color: 'bg-green-500', tooltip: 'Server reachable' };
      case 'error':
        return { color: 'bg-red-500', tooltip: 'Cannot reach server' };
      case 'checking':
        return { color: 'bg-yellow-500 animate-pulse', tooltip: 'Checking...' };
      default:
        return { color: 'bg-slate-400', tooltip: 'Unknown' };
    }
  };

  // Test upload to a specific server
  /**
   * Generate a branded test image using Canvas API
   * Creates a 400x200 JPEG with "Connected to Cypher Log!" text
   */
  const generateTestImage = (): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not create canvas context'));
          return;
        }

        // Background gradient (sky blue theme)
        const gradient = ctx.createLinearGradient(0, 0, 400, 200);
        gradient.addColorStop(0, '#0ea5e9'); // sky-500
        gradient.addColorStop(1, '#0284c7'); // sky-600
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 200);

        // Add decorative pattern (subtle grid)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 400; i += 20) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 200);
          ctx.stroke();
        }
        for (let i = 0; i < 200; i += 20) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(400, i);
          ctx.stroke();
        }

        // House icon (simple shape)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        // Roof
        ctx.moveTo(200, 35);
        ctx.lineTo(165, 65);
        ctx.lineTo(235, 65);
        ctx.closePath();
        ctx.fill();
        // House body
        ctx.fillRect(172, 65, 56, 40);
        // Door
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(192, 80, 16, 25);

        // Main text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Connected to', 200, 130);
        
        // "Cypher Log" text
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.fillText('Cypher Log!', 200, 165);

        // Checkmark badge
        ctx.fillStyle = '#22c55e'; // green-500
        ctx.beginPath();
        ctx.arc(340, 40, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(330, 40);
        ctx.lineTo(338, 48);
        ctx.lineTo(352, 32);
        ctx.stroke();

        // Convert to blob and then File
        canvas.toBlob((blob) => {
          if (blob) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const file = new File([blob], `cypherlog-test-${timestamp}.jpg`, { type: 'image/jpeg' });
            resolve(file);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        }, 'image/jpeg', 0.9);
      } catch (error) {
        reject(error);
      }
    });
  };

  /**
   * Check if a URL is a nostr.build URL (not their Blossom endpoint)
   * nostr.build has two APIs:
   * - Native API: https://nostr.build/ or https://nostr.build/api/v2/upload/files
   * - Blossom API: https://blossom.nostr.build/
   */
  const isNostrBuildNativeUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'nostr.build' || 
             parsed.hostname === 'www.nostr.build' ||
             parsed.hostname === 'media.nostr.build';
    } catch {
      return false;
    }
  };

  const handleTestUpload = async (serverUrl: string) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to test file uploads',
        variant: 'destructive',
      });
      return;
    }

    console.log(`[BlossomTest] Starting test upload to ${serverUrl}`);
    setIsTesting(prev => ({ ...prev, [serverUrl]: true }));
    
    try {
      // Generate a branded test image
      console.log('[BlossomTest] Generating test image...');
      const testFile = await generateTestImage();
      console.log(`[BlossomTest] Created test image (${testFile.size} bytes), uploading to ${serverUrl}...`);
      
      let tags: string[][];
      
      // Use the appropriate uploader based on the server
      if (isNostrBuildNativeUrl(serverUrl)) {
        console.log('[BlossomTest] Using NostrBuildUploader for nostr.build');
        const uploader = new NostrBuildUploader({
          signer: user.signer,
        });
        tags = await uploader.upload(testFile);
      } else {
        console.log('[BlossomTest] Using BlossomUploader');
        const uploader = new BlossomUploader({
          servers: [serverUrl],
          signer: user.signer,
        });
        tags = await uploader.upload(testFile);
      }

      const uploadedUrl = tags[0]?.[1];
      
      console.log(`[BlossomTest] ✓ Success! File uploaded to: ${uploadedUrl}`);
      
      setTestResults(prev => ({
        ...prev,
        [serverUrl]: {
          url: serverUrl,
          success: true,
          uploadedUrl,
        },
      }));

      toast({
        title: 'Upload test successful! ✓',
        description: `Test image uploaded to ${renderServerUrl(serverUrl)}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BlossomTest] ✗ Failed to upload to ${serverUrl}:`, errorMessage, error);
      
      // Provide more helpful error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('Promise.any') || errorMessage.includes('No Promise in Promise.any was resolved')) {
        userFriendlyMessage = 'Server did not accept the upload. Check that your Nostr pubkey is authorized in the server config.';
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        userFriendlyMessage = 'Could not connect to server. Check the URL and your network connection.';
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        userFriendlyMessage = 'Authentication failed (401). Your Nostr pubkey is not authorized on this server.';
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        userFriendlyMessage = 'Access forbidden (403). Your Nostr pubkey may not have upload permissions.';
      } else if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
        userFriendlyMessage = 'CORS error. The server needs to allow requests from this domain.';
      }
      
      setTestResults(prev => ({
        ...prev,
        [serverUrl]: {
          url: serverUrl,
          success: false,
          error: userFriendlyMessage,
        },
      }));

      toast({
        title: 'Upload test failed',
        description: userFriendlyMessage,
        variant: 'destructive',
      });
    } finally {
      setIsTesting(prev => ({ ...prev, [serverUrl]: false }));
    }
  };

  const enabledCount = servers.filter(s => s.enabled).length;
  const privateCount = servers.filter(s => s.enabled && s.isPrivate).length;

  // Sort servers with private ones first
  const sortedServers = [...servers].sort((a, b) => {
    if (a.isPrivate && !b.isPrivate) return -1;
    if (!a.isPrivate && b.isPrivate) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Encryption info notice */}
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
        <ShieldCheck className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-sm text-green-800 dark:text-green-200">
          <strong>Your server list is encrypted.</strong> Blossom server URLs are encrypted with NIP-44 before being stored on Nostr relays. Public relays cannot see your private server addresses.
        </AlertDescription>
      </Alert>

      {/* Warning if no private server configured */}
      {!hasPrivateServer && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
            <strong>No private server configured.</strong> File uploads are disabled to protect your privacy. Add a private Blossom server or mark an existing server as "Private" to enable uploads for receipts and documents.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {enabledCount} server{enabledCount !== 1 ? 's' : ''} enabled
          {privateCount > 0 && ` (${privateCount} private)`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={checkAllServers}
          disabled={isCheckingAll}
          className="h-7 px-2 text-xs"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isCheckingAll ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Server List */}
      <div className="space-y-2">
        {sortedServers.map((server) => {
          const status = serverStatuses[server.url] || 'unknown';
          const statusInfo = getStatusInfo(status);
          const testResult = testResults[server.url];
          const isTestingServer = isTesting[server.url] || false;
          
          return (
            <div key={server.url} className="space-y-2">
              <div
                className={`flex items-center gap-3 p-3 rounded-md border ${
                  server.isPrivate
                    ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30'
                    : server.enabled
                      ? 'bg-muted/20'
                      : 'bg-muted/10 opacity-60'
                }`}
              >
                {/* Status Indicator */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusInfo.color}`} />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    {statusInfo.tooltip}
                  </TooltipContent>
                </Tooltip>

                {server.isPrivate ? (
                  <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={`font-mono text-sm truncate ${!server.enabled ? 'line-through' : ''}`} title={server.url}>
                    {renderServerUrl(server.url)}
                  </span>
                  {server.isPrivate && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 shrink-0">
                      <Lock className="h-2.5 w-2.5 mr-0.5" />
                      Private
                    </Badge>
                  )}
                  {!server.isPrivate && server.enabled && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground shrink-0">
                      <Globe className="h-2.5 w-2.5 mr-0.5" />
                      Public
                    </Badge>
                  )}
                </div>

                {/* Test Upload Button */}
                {user && server.enabled && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleTestUpload(server.url);
                        }}
                        disabled={isTestingServer}
                        className="h-7 px-2 text-xs shrink-0"
                      >
                        {isTestingServer ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1" />
                        )}
                        Test
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Test file upload to this server
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Settings Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5 text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="end">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`enabled-${server.url}`} className="text-sm cursor-pointer">
                          Enabled
                        </Label>
                        <Switch
                          id={`enabled-${server.url}`}
                          checked={server.enabled}
                          onCheckedChange={() => handleToggleServer(server.url)}
                          className="data-[state=checked]:bg-green-500 scale-75"
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor={`private-${server.url}`} className="text-sm cursor-pointer flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Private Server
                          </Label>
                          <p className="text-[10px] text-muted-foreground">
                            Trusted for sensitive uploads
                          </p>
                        </div>
                        <Switch
                          id={`private-${server.url}`}
                          checked={server.isPrivate}
                          onCheckedChange={() => handleTogglePrivate(server.url)}
                          className="data-[state=checked]:bg-amber-500 scale-75"
                        />
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground border-t pt-2">
                        Only mark servers as "Private" if you control them or trust them with sensitive data like receipts and documents.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveServer(server.url)}
                  className="size-5 text-muted-foreground hover:text-destructive hover:bg-transparent shrink-0"
                  disabled={servers.length <= 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <Alert className={testResult.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50'}>
                  {testResult.success ? (
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  )}
                  <AlertDescription className="text-xs w-full">
                    {testResult.success ? (
                      <div className="space-y-2">
                        <strong className="text-green-800 dark:text-green-200">Upload successful!</strong>
                        {testResult.uploadedUrl && (
                          <a 
                            href={testResult.uploadedUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img 
                              src={testResult.uploadedUrl} 
                              alt="Test upload result" 
                              className="rounded-md border border-green-300 dark:border-green-700 max-h-24 w-auto"
                            />
                          </a>
                        )}
                        <div className="font-mono text-[10px] text-green-700 dark:text-green-300 break-all">
                          {testResult.uploadedUrl}
                        </div>
                      </div>
                    ) : (
                      <>
                        <strong className="text-red-800 dark:text-red-200">Upload failed</strong>
                        <div className="mt-1 text-[10px] text-red-700 dark:text-red-300">
                          {testResult.error}
                        </div>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
        })}
      </div>

      {/* Sync files to all private servers */}
      {hasPrivateServer && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            Copy all documents and images referenced in your app (vehicles, warranties, pets, etc.) to every private server so each has the same files. If one server is down, the app will load from another.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetSyncProgress();
              setSyncDialogOpen(true);
            }}
            disabled={allBlossomUrls.length === 0}
            className="w-full sm:w-auto"
          >
            <Copy className="h-4 w-4 mr-2" />
            Sync files to all private servers
            {allBlossomUrls.length > 0 && (
              <span className="ml-2 text-muted-foreground">({allBlossomUrls.length} file{allBlossomUrls.length !== 1 ? 's' : ''})</span>
            )}
          </Button>
        </div>
      )}

      {/* Add Server Form */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="new-server-url" className="sr-only">
            Server URL
          </Label>
          <Input
            id="new-server-url"
            placeholder="Enter server URL (e.g., https://blossom.example.com)"
            value={newServerUrl}
            onChange={(e) => setNewServerUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddServer();
              }
            }}
          />
        </div>
        <Button
          onClick={handleAddServer}
          disabled={!newServerUrl.trim()}
          variant="outline"
          size="sm"
          className="h-10 shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Server
        </Button>
      </div>

      {/* Sync progress dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={(open) => {
        setSyncDialogOpen(open);
        if (!open && syncProgress.status !== 'syncing') resetSyncProgress();
      }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => syncProgress.status === 'syncing' && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Sync files to all servers</DialogTitle>
            <DialogDescription>
              {syncProgress.status === 'idle' && (
                <>Copy {allBlossomUrls.length} unique file{allBlossomUrls.length !== 1 ? 's' : ''} to all your private Blossom servers so each has the same data. If one server is down, the app will load from another.</>
              )}
              {syncProgress.status === 'syncing' && (
                <>Syncing file {syncProgress.current} of {syncProgress.total}…</>
              )}
              {(syncProgress.status === 'done' || syncProgress.status === 'error') && (
                <>
                  Synced {syncProgress.synced} file{syncProgress.synced !== 1 ? 's' : ''}.
                  {syncProgress.failed > 0 && ` ${syncProgress.failed} failed.`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {syncProgress.status === 'syncing' && (
            <div className="space-y-2">
              <Progress value={syncProgress.total ? (syncProgress.current / syncProgress.total) * 100 : 0} className="h-2" />
              {syncProgress.currentUrl && (
                <p className="text-xs text-muted-foreground truncate" title={syncProgress.currentUrl}>
                  {syncProgress.currentUrl}
                </p>
              )}
            </div>
          )}
          {syncProgress.errors.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded border bg-muted/30 p-2 text-xs">
              {syncProgress.errors.map((err, i) => (
                <div key={i} className="text-destructive truncate" title={err}>{err}</div>
              ))}
            </div>
          )}
          <DialogFooter>
            {syncProgress.status === 'idle' && (
              <>
                <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    setIsSyncing(true);
                    try {
                      const result = await runSync();
                      toast({
                        title: 'Sync complete',
                        description: result.failed > 0
                          ? `Synced ${result.synced} file(s); ${result.failed} failed.`
                          : `Synced ${result.synced} file(s) to all private servers.`,
                      });
                    } catch (err) {
                      if (err instanceof NoPrivateServerError) {
                        toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
                      } else {
                        toast({ title: 'Sync failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
                      }
                    } finally {
                      setIsSyncing(false);
                    }
                  }}
                  disabled={isSyncing}
                >
                  {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  Start sync
                </Button>
              </>
            )}
            {(syncProgress.status === 'done' || syncProgress.status === 'error') && (
              <Button onClick={() => setSyncDialogOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
