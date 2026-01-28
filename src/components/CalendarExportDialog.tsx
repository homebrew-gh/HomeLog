import { useState, useMemo } from 'react';
import { CalendarPlus, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAppliances } from '@/hooks/useAppliances';
import { useVehicles } from '@/hooks/useVehicles';
import { useMaintenance, calculateNextDueDate, formatDueDate, isOverdue, isDueSoon } from '@/hooks/useMaintenance';
import { useMaintenanceCompletions } from '@/hooks/useMaintenanceCompletions';
import type { MaintenanceSchedule, Appliance, Vehicle, MaintenanceCompletion } from '@/lib/types';

interface CalendarExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filter?: 'home' | 'vehicle'; // Filter to show only home or vehicle maintenance
}

interface MaintenanceWithDueDate {
  maintenance: MaintenanceSchedule;
  dueDate: Date | null;
  displayName: string;
  isOverdue: boolean;
  isDueSoon: boolean;
}

// Helper to get due date for a maintenance item
function getMaintenanceDueInfo(
  maintenance: MaintenanceSchedule,
  appliances: Appliance[],
  vehicles: Vehicle[],
  completions: MaintenanceCompletion[]
): { dueDate: Date | null; displayName: string; isOverdue: boolean; isDueSoon: boolean } {
  let purchaseDate = '';
  let displayName = '';
  
  if (maintenance.vehicleId) {
    const vehicle = vehicles.find(v => v.id === maintenance.vehicleId);
    purchaseDate = vehicle?.purchaseDate || '';
    displayName = vehicle?.name || 'Unknown Vehicle';
  } else if (maintenance.applianceId) {
    const appliance = appliances.find(a => a.id === maintenance.applianceId);
    purchaseDate = appliance?.purchaseDate || '';
    displayName = appliance?.model 
      ? (maintenance.homeFeature ? `${appliance.model} - ${maintenance.homeFeature}` : appliance.model)
      : (maintenance.homeFeature || 'Unknown Item');
  } else if (maintenance.homeFeature) {
    displayName = maintenance.homeFeature;
  }
  
  // Get the last completion date for this maintenance
  const maintenanceCompletions = completions.filter(c => c.maintenanceId === maintenance.id);
  const lastCompletionDate = maintenanceCompletions.length > 0 ? maintenanceCompletions[0].completedDate : undefined;
  
  // For home feature-only maintenance without a purchase date, use last completion or today
  const isHomeFeatureOnly = maintenance.homeFeature && !maintenance.applianceId && !maintenance.vehicleId;
  const effectivePurchaseDate = purchaseDate || (lastCompletionDate ? '' : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
  
  const dueDate = calculateNextDueDate(effectivePurchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate);
  const overdue = effectivePurchaseDate ? isOverdue(effectivePurchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate) : false;
  const dueSoon = effectivePurchaseDate ? isDueSoon(effectivePurchaseDate, maintenance.frequency, maintenance.frequencyUnit, lastCompletionDate) : false;
  
  return { dueDate, displayName, isOverdue: overdue, isDueSoon: dueSoon };
}

// Format date as YYYYMMDD for ICS
function formatICSDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Format date as YYYY-MM-DD for CSV
function formatCSVDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate a unique ID for ICS events
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@cypherlog`;
}

// Generate ICS content for a single event
function generateICS(item: MaintenanceWithDueDate): string {
  if (!item.dueDate) return '';
  
  const dateStr = formatICSDate(item.dueDate);
  const now = new Date();
  const timestamp = `${formatICSDate(now)}T${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}Z`;
  
  // Escape special characters in text
  const escapeICS = (text: string) => text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Home Log//Maintenance Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${generateUID()}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${dateStr}T000000`,
    `DTEND:${dateStr}T010000`,
    `SUMMARY:${escapeICS(item.maintenance.description)}`,
    `DESCRIPTION:${escapeICS(`Maintenance for: ${item.displayName}`)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  
  return lines.join('\r\n');
}

// Generate CSV content for multiple events
// Using Google Calendar CSV format which is widely compatible
function generateCSV(items: MaintenanceWithDueDate[]): string {
  const headers = ['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'All Day Event', 'Description'];
  
  const rows = items
    .filter(item => item.dueDate)
    .map(item => {
      const dateStr = formatCSVDate(item.dueDate!);
      const subject = item.maintenance.description.replace(/"/g, '""'); // Escape quotes
      const description = `Maintenance for: ${item.displayName}`.replace(/"/g, '""');
      
      return [
        `"${subject}"`,
        dateStr,
        '12:00 AM',
        dateStr,
        '1:00 AM',
        'FALSE',
        `"${description}"`
      ].join(',');
    });
  
  return [headers.join(','), ...rows].join('\r\n');
}

// Trigger file download
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CalendarExportDialog({ isOpen, onClose, filter }: CalendarExportDialogProps) {
  const { data: appliances = [] } = useAppliances();
  const { data: vehicles = [] } = useVehicles();
  const { data: allMaintenance = [] } = useMaintenance();
  const { data: completions = [] } = useMaintenanceCompletions();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Build list of maintenance items with due dates, filtered by type if specified
  const maintenanceWithDates = useMemo(() => {
    // First filter by maintenance type if filter is provided
    let filteredMaintenance = allMaintenance;
    if (filter === 'home') {
      filteredMaintenance = allMaintenance.filter(m => (m.applianceId || m.homeFeature) && !m.vehicleId);
    } else if (filter === 'vehicle') {
      filteredMaintenance = allMaintenance.filter(m => m.vehicleId && !m.applianceId);
    }
    
    return filteredMaintenance
      .map(maint => {
        const info = getMaintenanceDueInfo(maint, appliances, vehicles, completions);
        return {
          maintenance: maint,
          dueDate: info.dueDate,
          displayName: info.displayName,
          isOverdue: info.isOverdue,
          isDueSoon: info.isDueSoon,
        } as MaintenanceWithDueDate;
      })
      .filter(item => item.dueDate) // Only show items with valid due dates
      .sort((a, b) => {
        // Sort by due date (earliest first)
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }, [allMaintenance, appliances, vehicles, completions, filter]);
  
  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  const handleSelectAll = () => {
    if (selectedIds.size === maintenanceWithDates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(maintenanceWithDates.map(m => m.maintenance.id)));
    }
  };
  
  const handleExport = () => {
    const selectedItems = maintenanceWithDates.filter(item => selectedIds.has(item.maintenance.id));
    
    if (selectedItems.length === 0) return;
    
    if (selectedItems.length === 1) {
      // Single event: export as ICS
      const icsContent = generateICS(selectedItems[0]);
      const filename = `${selectedItems[0].maintenance.description.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
      downloadFile(icsContent, filename, 'text/calendar');
    } else {
      // Multiple events: export as CSV
      const csvContent = generateCSV(selectedItems);
      downloadFile(csvContent, 'maintenance_events.csv', 'text/csv');
    }
    
    onClose();
    setSelectedIds(new Set());
  };
  
  const selectedCount = selectedIds.size;
  const allSelected = selectedIds.size === maintenanceWithDates.length && maintenanceWithDates.length > 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Export {filter === 'home' ? 'Home' : filter === 'vehicle' ? 'Vehicle' : ''} Maintenance to Calendar
          </DialogTitle>
          <DialogDescription>
            Select {filter === 'home' ? 'home ' : filter === 'vehicle' ? 'vehicle ' : ''}maintenance events to export. Single events will be exported as .ics files, 
            multiple events as a .csv file compatible with most calendar apps.
          </DialogDescription>
        </DialogHeader>
        
        {maintenanceWithDates.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No maintenance events with due dates to export.
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="cursor-pointer font-medium">
                  Select All
                </Label>
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedCount} of {maintenanceWithDates.length} selected
              </span>
            </div>
            
            {/* Maintenance List */}
            <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: '50vh' }}>
              <div className="space-y-2 py-2">
                {maintenanceWithDates.map(item => (
                  <div
                    key={item.maintenance.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedIds.has(item.maintenance.id)
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                    onClick={() => handleToggle(item.maintenance.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(item.maintenance.id)}
                      onCheckedChange={() => handleToggle(item.maintenance.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {item.maintenance.description}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.displayName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {item.isOverdue ? (
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      ) : item.isDueSoon ? (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Due Soon</Badge>
                      ) : null}
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDueDate(item.dueDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Export Button */}
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedCount === 1 ? 'Will export as .ics' : selectedCount > 1 ? 'Will export as .csv' : 'Select events to export'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={selectedCount === 0}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export {selectedCount > 0 ? `(${selectedCount})` : ''}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
