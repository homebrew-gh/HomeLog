import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { useEncryption } from './useEncryption';
import { useEncryptionSettings } from '@/contexts/EncryptionContext';
import { VEHICLE_KIND, type Vehicle } from '@/lib/types';

// Encrypted content marker
const ENCRYPTED_MARKER = 'nip44:';

// Helper to get tag value
function getTagValue(event: NostrEvent, tagName: string): string | undefined {
  return event.tags.find(([name]) => name === tagName)?.[1];
}

// Helper to get all tag values (for arrays like documents)
function getTagValues(event: NostrEvent, tagName: string): string[] {
  return event.tags
    .filter(([name]) => name === tagName)
    .map(tag => tag[1])
    .filter(Boolean);
}

// Data stored in encrypted content
type VehicleData = Omit<Vehicle, 'id' | 'pubkey' | 'createdAt'>;

// Parse a Nostr event into a Vehicle object (plaintext version)
function parseVehiclePlaintext(event: NostrEvent): Vehicle | null {
  const id = getTagValue(event, 'd');
  const name = getTagValue(event, 'name');
  const vehicleType = getTagValue(event, 'vehicle_type');

  if (!id || !name || !vehicleType) return null;

  return {
    id,
    vehicleType,
    name,
    make: getTagValue(event, 'make'),
    model: getTagValue(event, 'model'),
    year: getTagValue(event, 'year'),
    purchaseDate: getTagValue(event, 'purchase_date'),
    purchasePrice: getTagValue(event, 'purchase_price'),
    vin: getTagValue(event, 'vin'),
    licensePlate: getTagValue(event, 'license_plate'),
    mileage: getTagValue(event, 'mileage'),
    fuelType: getTagValue(event, 'fuel_type'),
    registrationExpiry: getTagValue(event, 'registration_expiry'),
    insuranceProvider: getTagValue(event, 'insurance_provider'),
    insurancePolicyNumber: getTagValue(event, 'insurance_policy_number'),
    insuranceExpiry: getTagValue(event, 'insurance_expiry'),
    hullId: getTagValue(event, 'hull_id'),
    registrationNumber: getTagValue(event, 'registration_number'),
    engineHours: getTagValue(event, 'engine_hours'),
    tailNumber: getTagValue(event, 'tail_number'),
    hobbsTime: getTagValue(event, 'hobbs_time'),
    serialNumber: getTagValue(event, 'serial_number'),
    receiptUrl: getTagValue(event, 'receipt_url'),
    warrantyUrl: getTagValue(event, 'warranty_url'),
    warrantyExpiry: getTagValue(event, 'warranty_expiry'),
    documentsUrls: getTagValues(event, 'document_url'),
    notes: getTagValue(event, 'notes'),
    pubkey: event.pubkey,
    createdAt: event.created_at,
  };
}

// Parse encrypted vehicle from content
async function parseVehicleEncrypted(
  event: NostrEvent,
  decryptFn: (content: string) => Promise<VehicleData>
): Promise<Vehicle | null> {
  const id = getTagValue(event, 'd');
  if (!id) return null;

  try {
    const data = await decryptFn(event.content);
    return {
      id,
      ...data,
      pubkey: event.pubkey,
      createdAt: event.created_at,
    };
  } catch (error) {
    console.error('[Vehicles] Failed to decrypt vehicle:', id, error);
    return null;
  }
}

// Extract deleted vehicle IDs from kind 5 events
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

export function useVehicles() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { decryptForCategory } = useEncryption();

  return useQuery({
    queryKey: ['vehicles', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query both vehicle events and deletion events in one request
      const events = await nostr.query(
        [
          { kinds: [VEHICLE_KIND], authors: [user.pubkey] },
          { kinds: [5], authors: [user.pubkey] },
        ],
        { signal }
      );

      // Separate vehicle events from deletion events
      const vehicleEvents = events.filter(e => e.kind === VEHICLE_KIND);
      const deletionEvents = events.filter(e => e.kind === 5);

      // Get the set of deleted vehicle IDs
      const deletedIds = getDeletedVehicleIds(deletionEvents, user.pubkey);

      const vehicles: Vehicle[] = [];
      
      for (const event of vehicleEvents) {
        const id = getTagValue(event, 'd');
        if (!id || deletedIds.has(id)) continue;

        // Check if content is encrypted
        if (event.content && event.content.startsWith(ENCRYPTED_MARKER)) {
          // Decrypt and parse
          const vehicle = await parseVehicleEncrypted(
            event,
            (content) => decryptForCategory<VehicleData>(content)
          );
          if (vehicle) {
            vehicles.push(vehicle);
          }
        } else {
          // Parse plaintext from tags
          const vehicle = parseVehiclePlaintext(event);
          if (vehicle) {
            vehicles.push(vehicle);
          }
        }
      }

      // Sort by creation date (newest first)
      return vehicles.sort((a, b) => b.createdAt - a.createdAt);
    },
    enabled: !!user?.pubkey,
  });
}

export function useVehicleById(id: string | undefined) {
  const { data: vehicles } = useVehicles();
  return vehicles?.find(v => v.id === id);
}

export function useVehicleActions() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { encryptForCategory, shouldEncrypt } = useEncryption();
  const { isEncryptionEnabled } = useEncryptionSettings();

  const createVehicle = async (data: Omit<Vehicle, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const id = crypto.randomUUID();
    const useEncryption = isEncryptionEnabled('vehicles');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Home Log vehicle data' : `Vehicle: ${data.name}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('vehicles')) {
      // Store data in encrypted content
      content = await encryptForCategory('vehicles', data);
    } else {
      // Store data in plaintext tags (legacy format)
      tags.push(['name', data.name]);
      tags.push(['vehicle_type', data.vehicleType]);
      
      if (data.make) tags.push(['make', data.make]);
      if (data.model) tags.push(['model', data.model]);
      if (data.year) tags.push(['year', data.year]);
      if (data.purchaseDate) tags.push(['purchase_date', data.purchaseDate]);
      if (data.purchasePrice) tags.push(['purchase_price', data.purchasePrice]);
      if (data.vin) tags.push(['vin', data.vin]);
      if (data.licensePlate) tags.push(['license_plate', data.licensePlate]);
      if (data.mileage) tags.push(['mileage', data.mileage]);
      if (data.fuelType) tags.push(['fuel_type', data.fuelType]);
      if (data.registrationExpiry) tags.push(['registration_expiry', data.registrationExpiry]);
      if (data.insuranceProvider) tags.push(['insurance_provider', data.insuranceProvider]);
      if (data.insurancePolicyNumber) tags.push(['insurance_policy_number', data.insurancePolicyNumber]);
      if (data.insuranceExpiry) tags.push(['insurance_expiry', data.insuranceExpiry]);
      if (data.hullId) tags.push(['hull_id', data.hullId]);
      if (data.registrationNumber) tags.push(['registration_number', data.registrationNumber]);
      if (data.engineHours) tags.push(['engine_hours', data.engineHours]);
      if (data.tailNumber) tags.push(['tail_number', data.tailNumber]);
      if (data.hobbsTime) tags.push(['hobbs_time', data.hobbsTime]);
      if (data.serialNumber) tags.push(['serial_number', data.serialNumber]);
      if (data.receiptUrl) tags.push(['receipt_url', data.receiptUrl]);
      if (data.warrantyUrl) tags.push(['warranty_url', data.warrantyUrl]);
      if (data.warrantyExpiry) tags.push(['warranty_expiry', data.warrantyExpiry]);
      if (data.notes) tags.push(['notes', data.notes]);

      if (data.documentsUrls) {
        for (const url of data.documentsUrls) {
          tags.push(['document_url', url]);
        }
      }
    }

    await publishEvent({
      kind: VEHICLE_KIND,
      content,
      tags,
    });

    await queryClient.invalidateQueries({ queryKey: ['vehicles'] });

    return id;
  };

  const updateVehicle = async (id: string, data: Omit<Vehicle, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const useEncryption = isEncryptionEnabled('vehicles');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Home Log vehicle data' : `Vehicle: ${data.name}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('vehicles')) {
      // Store data in encrypted content
      content = await encryptForCategory('vehicles', data);
    } else {
      // Store data in plaintext tags (legacy format)
      tags.push(['name', data.name]);
      tags.push(['vehicle_type', data.vehicleType]);
      
      if (data.make) tags.push(['make', data.make]);
      if (data.model) tags.push(['model', data.model]);
      if (data.year) tags.push(['year', data.year]);
      if (data.purchaseDate) tags.push(['purchase_date', data.purchaseDate]);
      if (data.purchasePrice) tags.push(['purchase_price', data.purchasePrice]);
      if (data.vin) tags.push(['vin', data.vin]);
      if (data.licensePlate) tags.push(['license_plate', data.licensePlate]);
      if (data.mileage) tags.push(['mileage', data.mileage]);
      if (data.fuelType) tags.push(['fuel_type', data.fuelType]);
      if (data.registrationExpiry) tags.push(['registration_expiry', data.registrationExpiry]);
      if (data.insuranceProvider) tags.push(['insurance_provider', data.insuranceProvider]);
      if (data.insurancePolicyNumber) tags.push(['insurance_policy_number', data.insurancePolicyNumber]);
      if (data.insuranceExpiry) tags.push(['insurance_expiry', data.insuranceExpiry]);
      if (data.hullId) tags.push(['hull_id', data.hullId]);
      if (data.registrationNumber) tags.push(['registration_number', data.registrationNumber]);
      if (data.engineHours) tags.push(['engine_hours', data.engineHours]);
      if (data.tailNumber) tags.push(['tail_number', data.tailNumber]);
      if (data.hobbsTime) tags.push(['hobbs_time', data.hobbsTime]);
      if (data.serialNumber) tags.push(['serial_number', data.serialNumber]);
      if (data.receiptUrl) tags.push(['receipt_url', data.receiptUrl]);
      if (data.warrantyUrl) tags.push(['warranty_url', data.warrantyUrl]);
      if (data.warrantyExpiry) tags.push(['warranty_expiry', data.warrantyExpiry]);
      if (data.notes) tags.push(['notes', data.notes]);

      if (data.documentsUrls) {
        for (const url of data.documentsUrls) {
          tags.push(['document_url', url]);
        }
      }
    }

    await publishEvent({
      kind: VEHICLE_KIND,
      content,
      tags,
    });

    await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  const deleteVehicle = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    // Publish a deletion request (kind 5)
    await publishEvent({
      kind: 5,
      content: 'Deleted vehicle',
      tags: [
        ['a', `${VEHICLE_KIND}:${user.pubkey}:${id}`],
      ],
    });

    // Small delay to allow the deletion event to propagate to relays
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force refetch to get updated data including the deletion event
    await queryClient.refetchQueries({ queryKey: ['vehicles'] });
    await queryClient.refetchQueries({ queryKey: ['maintenance'] });
  };

  return { createVehicle, updateVehicle, deleteVehicle };
}
