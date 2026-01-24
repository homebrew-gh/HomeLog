import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Cloud, RefreshCw, GripVertical, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserPreferences, DEFAULT_BLOSSOM_SERVERS, type BlossomServer } from '@/contexts/UserPreferencesContext';
import { useToast } from '@/hooks/useToast';

type ServerStatus = 'checking' | 'connected' | 'error' | 'unknown';

// Check Blossom server connectivity by making a HEAD request
async function checkServerConnectivity(url: string): Promise<boolean> {
  try {
    // Try to fetch the server root - Blossom servers typically respond to GET requests
    const response = await fetch(url, {
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
  } = useUserPreferences();
  const { toast } = useToast();

  const [newServerUrl, setNewServerUrl] = useState('');
  const [serverStatuses, setServerStatuses] = useState<Record<string, ServerStatus>>({});
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const servers = preferences.blossomServers || DEFAULT_BLOSSOM_SERVERS;

  // Check connectivity for a single server
  const checkServer = useCallback(async (url: string) => {
    setServerStatuses(prev => ({ ...prev, [url]: 'checking' }));
    const isConnected = await checkServerConnectivity(url);
    setServerStatuses(prev => ({ ...prev, [url]: isConnected ? 'connected' : 'error' }));
  }, []);

  // Check connectivity for all servers
  const checkAllServers = useCallback(async () => {
    setIsCheckingAll(true);
    const urls = servers.map(s => s.url);
    
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
  }, [servers]);

  // Initial connectivity check and periodic re-check
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
      description: 'Blossom server has been added to your list.',
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

  const enabledCount = servers.filter(s => s.enabled).length;

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {enabledCount} of {servers.length} servers enabled
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
        {servers.map((server) => {
          const status = serverStatuses[server.url] || 'unknown';
          const statusInfo = getStatusInfo(status);
          
          return (
            <div
              key={server.url}
              className={`flex items-center gap-3 p-3 rounded-md border ${
                server.enabled
                  ? 'bg-muted/20'
                  : 'bg-muted/10 opacity-60'
              }`}
            >
              {/* Drag Handle (for future drag-and-drop reordering) */}
              <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 cursor-grab" />

              {/* Status Indicator */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusInfo.color}`} />
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {statusInfo.tooltip}
                </TooltipContent>
              </Tooltip>

              <Cloud className="h-4 w-4 shrink-0 text-muted-foreground" />
              
              <div className="flex-1 min-w-0">
                <span className={`font-mono text-sm truncate block ${!server.enabled ? 'line-through' : ''}`} title={server.url}>
                  {renderServerUrl(server.url)}
                </span>
              </div>

              {/* Enable/Disable Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch
                      checked={server.enabled}
                      onCheckedChange={() => handleToggleServer(server.url)}
                      className="data-[state=checked]:bg-green-500 scale-75"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {server.enabled ? 'Enabled - click to disable' : 'Disabled - click to enable'}
                </TooltipContent>
              </Tooltip>

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
          );
        })}
      </div>

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
    </div>
  );
}
