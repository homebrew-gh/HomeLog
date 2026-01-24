import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";

/** Error thrown when no private Blossom server is configured */
export class NoPrivateServerError extends Error {
  constructor() {
    super('No private Blossom server configured. Please configure a private media server in Settings > Server Settings > Media to upload files.');
    this.name = 'NoPrivateServerError';
  }
}

export function useUploadFile() {
  const { user } = useCurrentUser();
  const { getPrivateBlossomServers, hasPrivateBlossomServer } = useUserPreferences();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      // Only use private Blossom servers for uploads to protect sensitive data
      if (!hasPrivateBlossomServer()) {
        throw new NoPrivateServerError();
      }

      const servers = getPrivateBlossomServers();

      const uploader = new BlossomUploader({
        servers,
        signer: user.signer,
      });

      const tags = await uploader.upload(file);
      return tags;
    },
  });
}

/** Hook to check if file uploads are available (i.e., a private server is configured) */
export function useCanUploadFiles(): boolean {
  const { hasPrivateBlossomServer } = useUserPreferences();
  return hasPrivateBlossomServer();
}