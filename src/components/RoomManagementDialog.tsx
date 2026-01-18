import { useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCustomRooms } from '@/hooks/useCustomRooms';
import { useAppliances } from '@/hooks/useAppliances';
import { toast } from '@/hooks/useToast';
import { DEFAULT_ROOMS } from '@/lib/types';

interface RoomManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoomManagementDialog({ isOpen, onClose }: RoomManagementDialogProps) {
  const { customRooms, addCustomRoom, removeCustomRoom } = useCustomRooms();
  const { data: appliances = [] } = useAppliances();
  const [newRoom, setNewRoom] = useState('');
  const [roomWithAppliances, setRoomWithAppliances] = useState<{ name: string; count: number } | null>(null);

  const handleAddRoom = () => {
    const trimmed = newRoom.trim();
    if (!trimmed) {
      toast({
        title: 'Room name required',
        description: 'Please enter a room name.',
        variant: 'destructive',
      });
      return;
    }

    // Check if already exists
    const allRooms = [...DEFAULT_ROOMS, ...customRooms];
    if (allRooms.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        title: 'Room already exists',
        description: 'This room is already in your list.',
        variant: 'destructive',
      });
      return;
    }

    addCustomRoom(trimmed);
    setNewRoom('');
    toast({
      title: 'Room added',
      description: `"${trimmed}" has been added to your rooms.`,
    });
  };

  const handleRemoveRoom = (room: string) => {
    // Check if any appliances are assigned to this room
    const appliancesInRoom = appliances.filter(a => a.room === room);

    if (appliancesInRoom.length > 0) {
      // Show warning dialog
      setRoomWithAppliances({ name: room, count: appliancesInRoom.length });
      return;
    }

    // Safe to delete
    removeCustomRoom(room);
    toast({
      title: 'Room removed',
      description: `"${room}" has been removed from your rooms.`,
    });
  };

  const handleClose = () => {
    setNewRoom('');
    onClose();
  };

  // Sort all rooms alphabetically for display
  const sortedDefaultRooms = [...DEFAULT_ROOMS].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const sortedCustomRooms = [...customRooms].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Rooms</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add new room */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add Custom Room</label>
            <div className="flex gap-2">
              <Input
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                placeholder="Enter room name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRoom();
                  }
                }}
              />
              <Button onClick={handleAddRoom} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Custom Rooms */}
          {sortedCustomRooms.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Rooms</label>
              <div className="space-y-1">
                {sortedCustomRooms.map((room) => (
                  <div
                    key={room}
                    className="flex items-center justify-between p-2 rounded-lg bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700"
                  >
                    <span className="text-sm">{room}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveRoom(room)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Rooms */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Default Rooms</label>
            <div className="space-y-1">
              {sortedDefaultRooms.map((room) => (
                <div
                  key={room}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm text-muted-foreground">{room}</span>
                  <span className="text-xs text-muted-foreground/60">Default</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Close button */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Warning dialog for rooms with appliances */}
      <AlertDialog open={!!roomWithAppliances} onOpenChange={() => setRoomWithAppliances(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cannot Delete Room
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                The room "{roomWithAppliances?.name}" has {roomWithAppliances?.count} appliance{roomWithAppliances?.count !== 1 ? 's' : ''} assigned to it.
              </p>
              <p>
                To delete this room, please first delete or reassign all appliances in this room to a different room.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setRoomWithAppliances(null)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
