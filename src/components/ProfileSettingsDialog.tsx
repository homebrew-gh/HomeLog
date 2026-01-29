import { User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditProfileForm } from '@/components/EditProfileForm';

interface ProfileSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSettingsDialog({ isOpen, onClose }: ProfileSettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </DialogTitle>
          <DialogDescription>
            Manage your Nostr profile information and public key.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="py-4">
            <EditProfileForm />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
