import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, X, Copy, Check } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { genUserName } from '@/lib/genUserName';

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileDialog({ isOpen, onClose }: EditProfileDialogProps) {
  const queryClient = useQueryClient();
  const { user, metadata } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [picture, setPicture] = useState('');
  const [copiedNpub, setCopiedNpub] = useState(false);
  const [copiedHex, setCopiedHex] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert hex pubkey to npub
  const npub = user?.pubkey ? nip19.npubEncode(user.pubkey) : null;
  // Pubkey in hex (same as user.pubkey) - useful for node setup and other apps
  const pubkeyHex = user?.pubkey ?? null;

  // Copy npub to clipboard
  const copyNpubToClipboard = async () => {
    if (!npub) return;
    
    try {
      await navigator.clipboard.writeText(npub);
      setCopiedNpub(true);
      toast({
        title: 'Copied!',
        description: 'Your npub has been copied to the clipboard.',
      });
      setTimeout(() => setCopiedNpub(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please try selecting and copying manually.',
        variant: 'destructive',
      });
    }
  };

  // Copy hex pubkey to clipboard
  const copyHexToClipboard = async () => {
    if (!pubkeyHex) return;
    
    try {
      await navigator.clipboard.writeText(pubkeyHex);
      setCopiedHex(true);
      toast({
        title: 'Copied!',
        description: 'Your public key (hex) has been copied to the clipboard.',
      });
      setTimeout(() => setCopiedHex(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please try selecting and copying manually.',
        variant: 'destructive',
      });
    }
  };

  // Reset form when dialog opens or metadata changes
  useEffect(() => {
    if (isOpen && metadata) {
      setName(metadata.name || '');
      setAbout(metadata.about || '');
      setPicture(metadata.picture || '');
    }
  }, [isOpen, metadata]);

  const handleUploadPicture = async (file: File) => {
    try {
      const [[_, url]] = await uploadFile(file);
      setPicture(url);
      toast({
        title: 'Success',
        description: 'Profile picture uploaded successfully',
      });
    } catch (error) {
      console.error('Failed to upload picture:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload profile picture. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update your profile',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Combine existing metadata with new values
      const data = { 
        ...metadata,
        name: name || undefined,
        about: about || undefined,
        picture: picture || undefined,
      };

      // Clean up empty values
      for (const key in data) {
        if (data[key as keyof typeof data] === '') {
          delete data[key as keyof typeof data];
        }
      }

      // Publish the metadata event (kind 0)
      await publishEvent({
        kind: 0,
        content: JSON.stringify(data),
      });

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['logins'] });
      queryClient.invalidateQueries({ queryKey: ['author', user.pubkey] });

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });

      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const displayName = name || metadata?.name || (user ? genUserName(user.pubkey) : '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your Nostr profile information. Changes will be published to the network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={picture} alt={displayName} />
              <AvatarFallback className="text-2xl">{displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUploadPicture(file);
                  }
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Photo
              </Button>
              {picture && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPicture('')}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Picture URL Input */}
          <div className="space-y-2">
            <Label htmlFor="picture">Picture URL</Label>
            <Input
              id="picture"
              value={picture}
              onChange={(e) => setPicture(e.target.value)}
              placeholder="https://example.com/profile.jpg"
            />
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Bio Input */}
          <div className="space-y-2">
            <Label htmlFor="about">Bio</Label>
            <Textarea
              id="about"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Public Key (npub) Section */}
          {npub && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Public Key (npub)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyNpubToClipboard}
                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  {copiedNpub ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5 text-xs">{copiedNpub ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
              <div 
                className="font-mono text-xs bg-muted p-2.5 rounded-md break-all select-all cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                onClick={copyNpubToClipboard}
                title="Click to copy"
              >
                {npub}
              </div>
              <p className="text-xs text-muted-foreground">
                Share this with others so they can find you on Nostr.
              </p>
            </div>
          )}

          {/* Public Key (hex) Section */}
          {pubkeyHex && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Public Key (hex)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyHexToClipboard}
                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  {copiedHex ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5 text-xs">{copiedHex ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
              <div 
                className="font-mono text-xs bg-muted p-2.5 rounded-md break-all select-all cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                onClick={copyHexToClipboard}
                title="Click to copy"
              >
                {pubkeyHex}
              </div>
              <p className="text-xs text-muted-foreground">
                Hex format for node setup and other applications.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || isUploading}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
