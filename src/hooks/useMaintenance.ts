import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { MAINTENANCE_KIND, APPLIANCE_KIND, VEHICLE_KIND, COMPANY_KIND, type MaintenanceSchedule } from '@/lib/types';
import { cacheEvents, getCachedEvents, deleteCachedEventByAddress } from '@/lib/eventCache';

// Helper to get tag value
function getTagValue(event: NostrEvent, tagName: string): string | undefined {
  return event.tags.find(([name]) => name === tagName)?.[1];
}

// Parse a Nostr event into a MaintenanceSchedule object
function parseMaintenance(event: NostrEvent): MaintenanceSchedule | null {
  const id = getTagValue(event, 'd');
  const description = getTagValue(event, 'description');
  const frequency = getTagValue(event, 'frequency');
  const frequencyUnit = getTagValue(event, 'frequency_unit');

  // Get reference from 'a' tags - could be appliance, vehicle, or company
  const aTags = event.tags.filter(([name]) => name === 'a');
  let applianceId: string | undefined;
  let vehicleId: string | undefined;
  let companyId: string | undefined;

  for (const aTag of aTags) {
    const parts = aTag[1]?.split(':');
    if (parts && parts.length >= 3) {
      const kind = parseInt(parts[0], 10);
      const refId = parts[2];
      if (kind === APPLIANCE_KIND) {
        applianceId = refId;
      } else if (kind === VEHICLE_KIND) {
        vehicleId = refId;
      } else if (kind === COMPANY_KIND) {
        companyId = refId;
      }
    }
  }

  // Get home feature if present
  const homeFeature = getTagValue(event, 'home_feature');
  
  // Check if this is log-only maintenance
  const isLogOnly = getTagValue(event, 'is_log_only') === 'true';

  // Must have at least one: applianceId, vehicleId, or homeFeature
  if (!id || !description || (!applianceId && !vehicleId && !homeFeature)) return null;

  // For non-log-only maintenance, frequency is required
  if (!isLogOnly && (!frequency || !frequencyUnit)) return null;

  const validUnits = ['days', 'weeks', 'months', 'years'];
  if (!isLogOnly && frequencyUnit && !validUnits.includes(frequencyUnit)) return null;

  const mileageInterval = getTagValue(event, 'mileage_interval');

  return {
    id,
    applianceId,
    vehicleId,
    homeFeature,
    companyId,
    description,
    partNumber: getTagValue(event, 'part_number'),
    frequency: frequency ? parseInt(frequency, 10) : undefined,
    frequencyUnit: frequencyUnit as MaintenanceSchedule['frequencyUnit'],
    mileageInterval: mileageInterval ? parseInt(mileageInterval, 10) : undefined,
    isLogOnly,
    isArchived: getTagValue(event, 'is_archived') === 'true',
    pubkey: event.pubkey,
    createdAt: event.created_at,
  };
}

// Extract deleted maintenance IDs from kind 5 events
function getDeletedMaintenanceIds(deletionEvents: NostrEvent[], pubkey: string): Set<string> {
  const deletedIds = new Set<string>();

  for (const event of deletionEvents) {
    for (const tag of event.tags) {
      if (tag[0] === 'a') {
        // Parse "kind:pubkey:d-tag" format
        const parts = tag[1].split(':');
        if (parts.length >= 3 && parts[0] === String(MAINTENANCE_KIND) && parts[1] === pubkey) {
          deletedIds.add(parts[2]);
        }
      }
    }
  }

  return deletedIds;
}

// Extract deleted appliance IDs from kind 5 events (to filter out orphaned maintenance)
function getDeletedApplianceIds(deletionEvents: NostrEvent[], pubkey: string): Set<string> {
  const deletedIds = new Set<string>();

  for (const event of deletionEvents) {
    for (const tag of event.tags) {
      if (tag[0] === 'a') {
        // Parse "kind:pubkey:d-tag" format
        const parts = tag[1].split(':');
        if (parts.length >= 3 && parts[0] === String(APPLIANCE_KIND) && parts[1] === pubkey) {
          deletedIds.add(parts[2]);
        }
      }
    }
  }

  return deletedIds;
}

// Extract deleted vehicle IDs from kind 5 events (to filter out orphaned maintenance)
function getDeletedVehicleIds(deletionEvents: NostrEvent[], pubkey: string): Set<string> {
  const deletedIds = new Set<string>();

  for (const event of deletionEvents) {
    for (const tag of event.tags) {
      if (tag[0] === 'a') {
        // Parse "kind:pubkey:d-tag" format
        const parts = tag[1].split(':');
        if (parts.length >= 3 && parts[0] === String(VEHICLE_KIND) && parts[1] === pubkey) {
          deletedIds.add(parts[2]);
        }
      }
    }
  }

  return deletedIds;
}

// Parse events into maintenance schedules
function parseEventsToMaintenance(events: NostrEvent[], pubkey: string): MaintenanceSchedule[] {
  // Separate maintenance events from deletion events
  const maintenanceEvents = events.filter(e => e.kind === MAINTENANCE_KIND);
  const deletionEvents = events.filter(e => e.kind === 5);

  // Get the set of deleted maintenance IDs, appliance IDs, and vehicle IDs
  const deletedMaintenanceIds = getDeletedMaintenanceIds(deletionEvents, pubkey);
  const deletedApplianceIds = getDeletedApplianceIds(deletionEvents, pubkey);
  const deletedVehicleIds = getDeletedVehicleIds(deletionEvents, pubkey);

  const schedules: MaintenanceSchedule[] = [];
  for (const event of maintenanceEvents) {
    const schedule = parseMaintenance(event);
    if (!schedule || deletedMaintenanceIds.has(schedule.id)) continue;
    
    // Check if the linked appliance or vehicle has been deleted
    if (schedule.applianceId && deletedApplianceIds.has(schedule.applianceId)) continue;
    if (schedule.vehicleId && deletedVehicleIds.has(schedule.vehicleId)) continue;
    
    schedules.push(schedule);
  }

  // Sort by creation date (newest first)
  return schedules.sort((a, b) => b.createdAt - a.createdAt);
}

export function useMaintenance() {
  const { user } = useCurrentUser();

  // Main query - loads from cache only
  // Background sync is handled centrally by useDataSyncStatus
  const query = useQuery({
    queryKey: ['maintenance', user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey) return [];

      // Load from cache (populated by useDataSyncStatus)
      const cachedEvents = await getCachedEvents([MAINTENANCE_KIND, 5], user.pubkey);
      
      if (cachedEvents.length > 0) {
        const maintenance = parseEventsToMaintenance(cachedEvents, user.pubkey);
        return maintenance;
      }

      return [];
    },
    enabled: !!user?.pubkey,
    staleTime: Infinity, // Data comes from IndexedDB cache, no need to refetch
    gcTime: Infinity, // Keep in memory for the session
    refetchOnWindowFocus: false,
  });

  return query;
}

export function useMaintenanceByAppliance(applianceId: string | undefined) {
  const { data: maintenance } = useMaintenance();
  if (!applianceId) return [];
  return maintenance?.filter(m => m.applianceId === applianceId) || [];
}

export function useMaintenanceByVehicle(vehicleId: string | undefined) {
  const { data: maintenance } = useMaintenance();
  if (!vehicleId) return [];
  return maintenance?.filter(m => m.vehicleId === vehicleId) || [];
}

// Get all appliance maintenance (for home maintenance tab) - includes both appliance and home feature maintenance
export function useApplianceMaintenance() {
  const { data: maintenance } = useMaintenance();
  // Return maintenance that has an appliance OR homeFeature but NOT a vehicle
  return maintenance?.filter(m => (m.applianceId || m.homeFeature) && !m.vehicleId) || [];
}

// Get all vehicle maintenance (for maintenance tab vehicle section)
export function useVehicleMaintenance() {
  const { data: maintenance } = useMaintenance();
  return maintenance?.filter(m => m.vehicleId && !m.applianceId) || [];
}

// Get all home feature maintenance (maintenance with homeFeature but no appliance)
export function useHomeFeatureMaintenance() {
  const { data: maintenance } = useMaintenance();
  return maintenance?.filter(m => m.homeFeature && !m.applianceId && !m.vehicleId) || [];
}

// Get maintenance schedules linked to a specific company
export function useMaintenanceByCompanyId(companyId: string | undefined) {
  const { data: maintenance } = useMaintenance();
  if (!companyId) return [];
  return maintenance?.filter(m => m.companyId === companyId) || [];
}

export function useMaintenanceActions() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const createMaintenance = async (data: Omit<MaintenanceSchedule, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');
    if (!data.applianceId && !data.vehicleId && !data.homeFeature) {
      throw new Error('Must have either applianceId, vehicleId, or homeFeature');
    }

    const id = crypto.randomUUID();
    const tags: string[][] = [
      ['d', id],
      ['alt', data.isLogOnly ? `Maintenance log: ${data.description}` : `Maintenance schedule: ${data.description}`],
      ['description', data.description],
    ];

    // Add frequency tags only for scheduled (non-log-only) maintenance
    if (!data.isLogOnly && data.frequency && data.frequencyUnit) {
      tags.push(['frequency', data.frequency.toString()]);
      tags.push(['frequency_unit', data.frequencyUnit]);
    }

    // Mark as log-only if applicable
    if (data.isLogOnly) {
      tags.push(['is_log_only', 'true']);
    }

    // Add reference to appliance or vehicle
    if (data.applianceId) {
      tags.push(['a', `${APPLIANCE_KIND}:${user.pubkey}:${data.applianceId}`, '', 'appliance']);
    }
    if (data.vehicleId) {
      tags.push(['a', `${VEHICLE_KIND}:${user.pubkey}:${data.vehicleId}`, '', 'vehicle']);
    }
    // Add home feature if present
    if (data.homeFeature) {
      tags.push(['home_feature', data.homeFeature]);
    }
    // Add company reference if present
    if (data.companyId) {
      tags.push(['a', `${COMPANY_KIND}:${user.pubkey}:${data.companyId}`, '', 'company']);
    }

    if (data.partNumber) tags.push(['part_number', data.partNumber]);
    if (data.mileageInterval) tags.push(['mileage_interval', data.mileageInterval.toString()]);
    if (data.isArchived) tags.push(['is_archived', 'true']);

    const event = await publishEvent({
      kind: MAINTENANCE_KIND,
      content: '',
      tags,
    });

    if (event) {
      await cacheEvents([event]);
    }

    await queryClient.invalidateQueries({ queryKey: ['maintenance'] });

    return id;
  };

  const updateMaintenance = async (id: string, data: Omit<MaintenanceSchedule, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');
    if (!data.applianceId && !data.vehicleId && !data.homeFeature) {
      throw new Error('Must have either applianceId, vehicleId, or homeFeature');
    }

    const tags: string[][] = [
      ['d', id],
      ['alt', data.isLogOnly ? `Maintenance log: ${data.description}` : `Maintenance schedule: ${data.description}`],
      ['description', data.description],
    ];

    // Add frequency tags only for scheduled (non-log-only) maintenance
    if (!data.isLogOnly && data.frequency && data.frequencyUnit) {
      tags.push(['frequency', data.frequency.toString()]);
      tags.push(['frequency_unit', data.frequencyUnit]);
    }

    // Mark as log-only if applicable
    if (data.isLogOnly) {
      tags.push(['is_log_only', 'true']);
    }

    // Add reference to appliance or vehicle
    if (data.applianceId) {
      tags.push(['a', `${APPLIANCE_KIND}:${user.pubkey}:${data.applianceId}`, '', 'appliance']);
    }
    if (data.vehicleId) {
      tags.push(['a', `${VEHICLE_KIND}:${user.pubkey}:${data.vehicleId}`, '', 'vehicle']);
    }
    // Add home feature if present
    if (data.homeFeature) {
      tags.push(['home_feature', data.homeFeature]);
    }
    // Add company reference if present
    if (data.companyId) {
      tags.push(['a', `${COMPANY_KIND}:${user.pubkey}:${data.companyId}`, '', 'company']);
    }

    if (data.partNumber) tags.push(['part_number', data.partNumber]);
    if (data.mileageInterval) tags.push(['mileage_interval', data.mileageInterval.toString()]);
    if (data.isArchived) tags.push(['is_archived', 'true']);

    const event = await publishEvent({
      kind: MAINTENANCE_KIND,
      content: '',
      tags,
    });

    if (event) {
      await cacheEvents([event]);
    }

    await queryClient.invalidateQueries({ queryKey: ['maintenance'] });
  };

  const archiveMaintenance = async (id: string, isArchived: boolean) => {
    if (!user) throw new Error('Must be logged in');

    // Get current maintenance data
    const maintenance = queryClient.getQueryData<MaintenanceSchedule[]>(['maintenance', user.pubkey]) || [];
    const schedule = maintenance.find(m => m.id === id);
    if (!schedule) throw new Error('Maintenance schedule not found');

    // Update with archive status
    await updateMaintenance(id, { ...schedule, isArchived });
  };

  const deleteMaintenance = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    const event = await publishEvent({
      kind: 5,
      content: 'Deleted maintenance schedule',
      tags: [
        ['a', `${MAINTENANCE_KIND}:${user.pubkey}:${id}`],
      ],
    });

    if (event) {
      await cacheEvents([event]);
      await deleteCachedEventByAddress(MAINTENANCE_KIND, user.pubkey, id);
    }

    // Small delay to allow the deletion event to propagate to relays
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force refetch to get updated data including the deletion event
    await queryClient.refetchQueries({ queryKey: ['maintenance'] });
  };

  return { createMaintenance, updateMaintenance, deleteMaintenance, archiveMaintenance };
}

// Get archived maintenance schedules
export function useArchivedMaintenance() {
  const { data: maintenance = [] } = useMaintenance();
  return maintenance.filter(m => m.isArchived);
}

// Get active (non-archived) maintenance schedules
export function useActiveMaintenance() {
  const { data: maintenance = [] } = useMaintenance();
  return maintenance.filter(m => !m.isArchived);
}

// Parse MM/DD/YYYY date string to Date object
function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;

  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const month = parseInt(parts[0], 10) - 1; // JS months are 0-indexed
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;

  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;

  return date;
}

// Add frequency to a date
function addFrequencyToDate(date: Date, frequency: number, frequencyUnit: MaintenanceSchedule['frequencyUnit']): Date {
  const newDate = new Date(date);
  switch (frequencyUnit) {
    case 'days':
      newDate.setDate(newDate.getDate() + frequency);
      break;
    case 'weeks':
      newDate.setDate(newDate.getDate() + (frequency * 7));
      break;
    case 'months':
      newDate.setMonth(newDate.getMonth() + frequency);
      break;
    case 'years':
      newDate.setFullYear(newDate.getFullYear() + frequency);
      break;
  }
  return newDate;
}

// Calculate the next due date for a maintenance schedule
// If lastCompletionDate is provided, calculate from there; otherwise use purchaseDate
export function calculateNextDueDate(
  purchaseDate: string,
  frequency: number,
  frequencyUnit: MaintenanceSchedule['frequencyUnit'],
  lastCompletionDate?: string
): Date | null {
  // If there's a completion date, calculate from that
  if (lastCompletionDate) {
    const completionDate = parseDateString(lastCompletionDate);
    if (completionDate) {
      // Next due date is completion date + frequency
      return addFrequencyToDate(completionDate, frequency, frequencyUnit);
    }
  }

  // Fall back to purchase date if no completion
  const startDate = parseDateString(purchaseDate);
  if (!startDate) return null;

  const now = new Date();
  let nextDue = new Date(startDate);

  // Keep adding frequency until we get a future date
  while (nextDue <= now) {
    nextDue = addFrequencyToDate(nextDue, frequency, frequencyUnit);
  }

  return nextDue;
}

// Format date for display
export function formatDueDate(date: Date | null): string {
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

// Check if maintenance is overdue
export function isOverdue(
  purchaseDate: string,
  frequency: number,
  frequencyUnit: MaintenanceSchedule['frequencyUnit'],
  lastCompletionDate?: string
): boolean {
  const nextDue = calculateNextDueDate(purchaseDate, frequency, frequencyUnit, lastCompletionDate);
  if (!nextDue) return false;
  return nextDue < new Date();
}

// Check if maintenance is due soon (within 7 days)
export function isDueSoon(
  purchaseDate: string,
  frequency: number,
  frequencyUnit: MaintenanceSchedule['frequencyUnit'],
  lastCompletionDate?: string
): boolean {
  const nextDue = calculateNextDueDate(purchaseDate, frequency, frequencyUnit, lastCompletionDate);
  if (!nextDue) return false;
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return nextDue <= sevenDaysFromNow && nextDue >= now;
}
