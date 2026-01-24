import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, X, FileText, Image, AlertCircle, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useApplianceActions } from '@/hooks/useAppliances';
import { useCustomRooms } from '@/hooks/useCustomRooms';
import { useUploadFile, useDeleteFile, NoPrivateServerError, useCanUploadFiles } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import type { Appliance } from '@/lib/types';

// Get today's date in MM/DD/YYYY format
function getTodayFormatted(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  return `${month}/${day}/${year}`;
}

interface ApplianceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appliance?: Appliance; // If provided, we're editing
}

export function ApplianceDialog({ isOpen, onClose, appliance }: ApplianceDialogProps) {
  const { createAppliance, updateAppliance } = useApplianceActions();
  const { allRooms, addCustomRoom } = useCustomRooms();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: deleteFile, isPending: isDeleting } = useDeleteFile();
  const canUploadFiles = useCanUploadFiles();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState('');
  const [useTodayDate, setUseTodayDate] = useState(false);

  const [formData, setFormData] = useState({
    model: '',
    manufacturer: '',
    purchaseDate: '',
    room: '',
    receiptUrl: '',
    manualUrl: '',
  });

  const receiptInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!appliance;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (appliance) {
        setFormData({
          model: appliance.model,
          manufacturer: appliance.manufacturer,
          purchaseDate: appliance.purchaseDate,
          room: appliance.room,
          receiptUrl: appliance.receiptUrl || '',
          manualUrl: appliance.manualUrl || '',
        });
      } else {
        setFormData({
          model: '',
          manufacturer: '',
          purchaseDate: '',
          room: '',
          receiptUrl: '',
          manualUrl: '',
        });
      }
      setShowAddRoom(false);
      setNewRoom('');
      setUseTodayDate(false);
    }
  }, [isOpen, appliance]);

  const handleFileUpload = async (file: File, type: 'receipt' | 'manual') => {
    try {
      const tags = await uploadFile(file);
      const url = tags[0]?.[1];
      if (url) {
        setFormData(prev => ({
          ...prev,
          [type === 'receipt' ? 'receiptUrl' : 'manualUrl']: url,
        }));
        toast({
          title: 'File uploaded',
          description: `${type === 'receipt' ? 'Receipt' : 'Manual'} uploaded successfully.`,
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      
      if (error instanceof NoPrivateServerError) {
        toast({
          title: 'No private server configured',
          description: 'Please configure a private media server in Settings > Server Settings > Media before uploading sensitive files.',
          variant: 'destructive',
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast({
          title: 'Upload failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'receipt');
    e.target.value = '';
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'manual');
    e.target.value = '';
  };

  const handleRemoveFile = async (type: 'receipt' | 'manual', deleteFromServer: boolean = false) => {
    const url = type === 'receipt' ? formData.receiptUrl : formData.manualUrl;
    
    // Clear the URL from form data first
    setFormData(prev => ({
      ...prev,
      [type === 'receipt' ? 'receiptUrl' : 'manualUrl']: '',
    }));

    // Optionally delete from server
    if (deleteFromServer && url) {
      try {
        await deleteFile(url);
        toast({
          title: 'File deleted',
          description: 'File has been removed from your media server.',
        });
      } catch (error) {
        console.error('Failed to delete file from server:', error);
        toast({
          title: 'Could not delete from server',
          description: error instanceof Error ? error.message : 'The file reference was removed but the file may still exist on the server.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleAddRoom = () => {
    if (newRoom.trim()) {
      addCustomRoom(newRoom.trim());
      setFormData(prev => ({ ...prev, room: newRoom.trim() }));
      setNewRoom('');
      setShowAddRoom(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.model.trim()) {
      toast({
        title: 'Model required',
        description: 'Please enter the appliance model.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && appliance) {
        await updateAppliance(appliance.id, formData);
        toast({
          title: 'Appliance updated',
          description: 'Your appliance has been updated successfully.',
        });
      } else {
        await createAppliance(formData);
        toast({
          title: 'Appliance added',
          description: 'Your appliance has been added successfully.',
        });
      }
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'add'} appliance. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Appliance' : 'Add Appliance'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Model/Description */}
          <div className="space-y-2">
            <Label htmlFor="model">Model/Description *</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              placeholder="Enter appliance model/type"
            />
          </div>

          {/* Manufacturer */}
          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
              placeholder="Enter manufacturer name"
            />
          </div>

          {/* Purchase/Install Date */}
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase/Install Date (MM/DD/YYYY)</Label>
            <Input
              id="purchaseDate"
              value={formData.purchaseDate}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, purchaseDate: e.target.value }));
                if (e.target.value) {
                  setUseTodayDate(false);
                }
              }}
              placeholder="MM/DD/YYYY"
              disabled={useTodayDate}
              className={useTodayDate ? 'opacity-50' : ''}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useTodayDate"
                checked={useTodayDate}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setUseTodayDate(isChecked);
                  if (isChecked) {
                    setFormData(prev => ({ ...prev, purchaseDate: getTodayFormatted() }));
                  }
                }}
              />
              <Label
                htmlFor="useTodayDate"
                className="text-sm font-normal cursor-pointer"
              >
                Today ({getTodayFormatted()})
              </Label>
            </div>
          </div>

          {/* Room Selection */}
          <div className="space-y-2">
            <Label>Room</Label>
            {showAddRoom ? (
              <div className="flex gap-2">
                <Input
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="Enter custom room name"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRoom();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddRoom} size="sm">
                  Add
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddRoom(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={formData.room}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, room: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {allRooms.map((room) => (
                      <SelectItem key={room} value={room}>
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowAddRoom(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Purchase Receipt</Label>
            <div className="flex gap-2 items-center">
              <Input
                value={formData.receiptUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, receiptUrl: e.target.value }))}
                placeholder="URL or upload file"
                className="flex-1"
              />
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                ref={receiptInputRef}
                onChange={handleReceiptUpload}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => receiptInputRef.current?.click()}
                      disabled={isUploading || !canUploadFiles}
                    >
                      {isUploading ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : !canUploadFiles ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {!canUploadFiles 
                    ? 'Configure a private media server in Settings to enable uploads'
                    : 'Upload receipt image or PDF'
                  }
                </TooltipContent>
              </Tooltip>
            </div>
            {formData.receiptUrl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Image className="h-4 w-4" />
                <span className="truncate flex-1">{formData.receiptUrl}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MoreVertical className="h-3 w-3" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRemoveFile('receipt', false)}>
                      <X className="h-4 w-4 mr-2" />
                      Remove from appliance
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleRemoveFile('receipt', true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete from server
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Manual Upload */}
          <div className="space-y-2">
            <Label>Electronic Manual</Label>
            <div className="flex gap-2 items-center">
              <Input
                value={formData.manualUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, manualUrl: e.target.value }))}
                placeholder="URL or upload file"
                className="flex-1"
              />
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                ref={manualInputRef}
                onChange={handleManualUpload}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => manualInputRef.current?.click()}
                      disabled={isUploading || !canUploadFiles}
                    >
                      {isUploading ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : !canUploadFiles ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {!canUploadFiles 
                    ? 'Configure a private media server in Settings to enable uploads'
                    : 'Upload manual PDF or document'
                  }
                </TooltipContent>
              </Tooltip>
            </div>
            {formData.manualUrl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="truncate flex-1">{formData.manualUrl}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MoreVertical className="h-3 w-3" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRemoveFile('manual', false)}>
                      <X className="h-4 w-4 mr-2" />
                      Remove from appliance
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleRemoveFile('manual', true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete from server
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Bottom Left */}
        <div className="flex justify-start gap-2 pt-4 border-t">
          <Button onClick={handleSubmit} disabled={isSubmitting || isUploading}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Discard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
