import { useState, useCallback } from 'react';
import { useUploadFile, NoPrivateServerError } from './useUploadFile';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { extractFileInfo } from '@/lib/blossom';
import { logger } from '@/lib/logger';

export interface BlossomSyncProgress {
  current: number;
  total: number;
  currentUrl: string | null;
  status: 'idle' | 'syncing' | 'done' | 'error';
  synced: number;
  failed: number;
  errors: string[];
}

export interface BlossomSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Fetch a Blossom URL and return a File (for re-upload to other servers).
 * Uses the content hash + extension as filename so Blossom servers store by hash.
 */
async function fetchBlossomUrlAsFile(url: string, signal?: AbortSignal): Promise<File> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const info = extractFileInfo(url);
  const name = info ? `${info.hash}${info.extension}` : url.split('/').pop() || 'file';
  return new File([blob], name, { type: blob.type || 'application/octet-stream' });
}

/**
 * Sync existing Blossom files to all private servers.
 * For each unique file URL: fetches the file then uploads it (upload goes to all private servers).
 * Use with useAllBlossomUrls() to get the list of URLs to sync.
 */
export function useBlossomSync(urls: string[]) {
  const { mutateAsync: uploadFile } = useUploadFile();
  const { hasPrivateBlossomServer, getPrivateBlossomServers } = useUserPreferences();
  const [progress, setProgress] = useState<BlossomSyncProgress>({
    current: 0,
    total: 0,
    currentUrl: null,
    status: 'idle',
    synced: 0,
    failed: 0,
    errors: [],
  });

  const sync = useCallback(
    async (onProgress?: (p: BlossomSyncProgress) => void): Promise<BlossomSyncResult> => {
      if (!hasPrivateBlossomServer()) {
        throw new NoPrivateServerError();
      }
      const servers = getPrivateBlossomServers();
      if (servers.length === 0) {
        throw new Error('No private Blossom servers configured.');
      }

      const total = urls.length;
      if (total === 0) {
        const result = { synced: 0, failed: 0, errors: [] };
        setProgress((p) => ({ ...p, status: 'done', total: 0, ...result }));
        return result;
      }

      let synced = 0;
      const errors: string[] = [];
      const controller = new AbortController();

      const initial: BlossomSyncProgress = {
        current: 0,
        total,
        currentUrl: urls[0] ?? null,
        status: 'syncing',
        synced: 0,
        failed: 0,
        errors: [],
      };
      setProgress(initial);
      onProgress?.(initial);

      for (let i = 0; i < urls.length; i++) {
        if (controller.signal.aborted) break;
        const url = urls[i]!;
        setProgress((p) => ({ ...p, current: i + 1, currentUrl: url }));
        const progressSnapshot: BlossomSyncProgress = {
          current: i + 1,
          total,
          currentUrl: url,
          status: 'syncing',
          synced,
          failed: errors.length,
          errors: [...errors],
        };
        onProgress?.(progressSnapshot);

        try {
          const file = await fetchBlossomUrlAsFile(url, controller.signal);
          await uploadFile(file);
          synced++;
          setProgress((p) => ({ ...p, synced }));
          logger.log(`[BlossomSync] Synced ${i + 1}/${total}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${url}: ${msg}`);
          setProgress((p) => ({ ...p, failed: p.failed + 1, errors: [...p.errors, `${url}: ${msg}`] }));
          logger.warn('[BlossomSync] Failed:', url, msg);
        }
      }

      const result = { synced, failed: errors.length, errors };
      const finalStatus = errors.length === urls.length ? 'error' : 'done';
      setProgress((p) => ({
        ...p,
        status: finalStatus,
        currentUrl: null,
        synced,
        failed: errors.length,
        errors,
      }));
      onProgress?.({ current: total, total, currentUrl: null, status: finalStatus, synced: result.synced, failed: result.failed, errors: result.errors });
      return result;
    },
    [urls, uploadFile, hasPrivateBlossomServer, getPrivateBlossomServers]
  );

  const resetProgress = useCallback(() => {
    setProgress({
      current: 0,
      total: 0,
      currentUrl: null,
      status: 'idle',
      synced: 0,
      failed: 0,
      errors: [],
    });
  }, []);

  return { sync, progress, resetProgress };
}
