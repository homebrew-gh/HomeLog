import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useUserPreferences, DEFAULT_BLOSSOM_SERVERS } from "@/contexts/UserPreferencesContext";

export function useUploadFile() {
  const { user } = useCurrentUser();
  const { getEnabledBlossomServers } = useUserPreferences();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      // Get enabled Blossom servers from user preferences
      let servers = getEnabledBlossomServers();
      
      // Fallback to default servers if none configured
      if (servers.length === 0) {
        servers = DEFAULT_BLOSSOM_SERVERS.map(s => s.url);
      }

      const uploader = new BlossomUploader({
        servers,
        signer: user.signer,
      });

      const tags = await uploader.upload(file);
      return tags;
    },
  });
}