import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { MAINTENANCE_KIND, APPLIANCE_KIND, type MaintenanceSchedule } from '@/lib/types';

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
  
  // Get appliance reference from 'a' tag
  const aTag = event.tags.find(([name]) => name === 'a')?.[1];
  const applianceId = aTag?.split(':')[2]; // Format: kind:pubkey:d-tag
  
  if (!id || !description || !frequency || !frequencyUnit || !applianceId) return null;

  const validUnits = ['days', 'weeks', 'months', 'years'];
  if (!validUnits.includes(frequencyUnit)) return null;

  return {
    id,
    applianceId,
    description,
    partNumber: getTagValue(event, 'part_number'),
    frequency: parseInt(frequency, 10),
    frequencyUnit: frequencyUnit as MaintenanceSchedule['frequencyUnit'],
    pubkey: event.pubkey,
    createdAt: event.created_at,
  };
}

export function useMaintenance() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['maintenance', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [MAINTENANCE_KIND], authors: [user.pubkey] }],
        { signal }
      );

      const schedules: MaintenanceSchedule[] = [];
      for (const event of events) {
        const schedule = parseMaintenance(event);
        if (schedule) {
          schedules.push(schedule);
        }
      }

      // Sort by creation date (newest first)
      return schedules.sort((a, b) => b.createdAt - a.createdAt);
    },
    enabled: !!user?.pubkey,
  });
}

export function useMaintenanceByAppliance(applianceId: string | undefined) {
  const { data: maintenance } = useMaintenance();
  if (!applianceId) return [];
  return maintenance?.filter(m => m.applianceId === applianceId) || [];
}

export function useMaintenanceActions() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const createMaintenance = async (data: Omit<MaintenanceSchedule, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const id = crypto.randomUUID();
    const tags: string[][] = [
      ['d', id],
      ['alt', `Maintenance schedule: ${data.description}`],
      ['a', `${APPLIANCE_KIND}:${user.pubkey}:${data.applianceId}`, '', 'appliance'],
      ['description', data.description],
      ['frequency', data.frequency.toString()],
      ['frequency_unit', data.frequencyUnit],
    ];

    if (data.partNumber) tags.push(['part_number', data.partNumber]);

    await publishEvent({
      kind: MAINTENANCE_KIND,
      content: '',
      tags,
    });

    await queryClient.invalidateQueries({ queryKey: ['maintenance'] });

    return id;
  };

  const updateMaintenance = async (id: string, data: Omit<MaintenanceSchedule, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const tags: string[][] = [
      ['d', id],
      ['alt', `Maintenance schedule: ${data.description}`],
      ['a', `${APPLIANCE_KIND}:${user.pubkey}:${data.applianceId}`, '', 'appliance'],
      ['description', data.description],
      ['frequency', data.frequency.toString()],
      ['frequency_unit', data.frequencyUnit],
    ];

    if (data.partNumber) tags.push(['part_number', data.partNumber]);

    await publishEvent({
      kind: MAINTENANCE_KIND,
      content: '',
      tags,
    });

    await queryClient.invalidateQueries({ queryKey: ['maintenance'] });
  };

  const deleteMaintenance = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    await publishEvent({
      kind: 5,
      content: 'Deleted maintenance schedule',
      tags: [
        ['a', `${MAINTENANCE_KIND}:${user.pubkey}:${id}`],
      ],
    });

    await queryClient.invalidateQueries({ queryKey: ['maintenance'] });
  };

  return { createMaintenance, updateMaintenance, deleteMaintenance };
}

// Calculate the next due date for a maintenance schedule
export function calculateNextDueDate(purchaseDate: string, frequency: number, frequencyUnit: MaintenanceSchedule['frequencyUnit']): Date | null {
  if (!purchaseDate) return null;
  
  // Parse MM/DD/YYYY format
  const parts = purchaseDate.split('/');
  if (parts.length !== 3) return null;
  
  const month = parseInt(parts[0], 10) - 1; // JS months are 0-indexed
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  
  const startDate = new Date(year, month, day);
  if (isNaN(startDate.getTime())) return null;
  
  const now = new Date();
  let nextDue = new Date(startDate);
  
  // Keep adding frequency until we get a future date
  while (nextDue <= now) {
    switch (frequencyUnit) {
      case 'days':
        nextDue.setDate(nextDue.getDate() + frequency);
        break;
      case 'weeks':
        nextDue.setDate(nextDue.getDate() + (frequency * 7));
        break;
      case 'months':
        nextDue.setMonth(nextDue.getMonth() + frequency);
        break;
      case 'years':
        nextDue.setFullYear(nextDue.getFullYear() + frequency);
        break;
    }
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
export function isOverdue(purchaseDate: string, frequency: number, frequencyUnit: MaintenanceSchedule['frequencyUnit']): boolean {
  const nextDue = calculateNextDueDate(purchaseDate, frequency, frequencyUnit);
  if (!nextDue) return false;
  return nextDue < new Date();
}

// Check if maintenance is due soon (within 7 days)
export function isDueSoon(purchaseDate: string, frequency: number, frequencyUnit: MaintenanceSchedule['frequencyUnit']): boolean {
  const nextDue = calculateNextDueDate(purchaseDate, frequency, frequencyUnit);
  if (!nextDue) return false;
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return nextDue <= sevenDaysFromNow && nextDue >= now;
}
