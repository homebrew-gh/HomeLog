import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { useEncryption } from './useEncryption';
import { useEncryptionSettings } from '@/contexts/EncryptionContext';
import { PET_KIND, type Pet } from '@/lib/types';
import { cacheEvents, getCachedEvents, deleteCachedEventByAddress } from '@/lib/eventCache';

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
type PetData = Omit<Pet, 'id' | 'pubkey' | 'createdAt'>;

// Parse a Nostr event into a Pet object (plaintext version)
function parsePetPlaintext(event: NostrEvent): Pet | null {
  const id = getTagValue(event, 'd');
  const name = getTagValue(event, 'name');
  const petType = getTagValue(event, 'pet_type');

  if (!id || !name || !petType) return null;

  return {
    id,
    petType,
    name,
    species: getTagValue(event, 'species'),
    breed: getTagValue(event, 'breed'),
    birthDate: getTagValue(event, 'birth_date'),
    adoptionDate: getTagValue(event, 'adoption_date'),
    weight: getTagValue(event, 'weight'),
    color: getTagValue(event, 'color'),
    sex: getTagValue(event, 'sex') as Pet['sex'],
    isNeutered: getTagValue(event, 'is_neutered') === 'true',
    microchipId: getTagValue(event, 'microchip_id'),
    licenseNumber: getTagValue(event, 'license_number'),
    vetClinic: getTagValue(event, 'vet_clinic'),
    vetPhone: getTagValue(event, 'vet_phone'),
    allergies: getTagValue(event, 'allergies'),
    medications: getTagValue(event, 'medications'),
    medicalConditions: getTagValue(event, 'medical_conditions'),
    lastVetVisit: getTagValue(event, 'last_vet_visit'),
    photoUrl: getTagValue(event, 'photo_url'),
    documentsUrls: getTagValues(event, 'document_url'),
    notes: getTagValue(event, 'notes'),
    isArchived: getTagValue(event, 'is_archived') === 'true',
    pubkey: event.pubkey,
    createdAt: event.created_at,
  };
}

// Parse encrypted pet from content
async function parsePetEncrypted(
  event: NostrEvent,
  decryptFn: (content: string) => Promise<PetData>
): Promise<Pet | null> {
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
    console.error('[Pets] Failed to decrypt pet:', id, error);
    return null;
  }
}

// Extract deleted pet IDs from kind 5 events
function getDeletedPetIds(deletionEvents: NostrEvent[], pubkey: string): Set<string> {
  const deletedIds = new Set<string>();

  for (const event of deletionEvents) {
    for (const tag of event.tags) {
      if (tag[0] === 'a') {
        // Parse "kind:pubkey:d-tag" format
        const parts = tag[1].split(':');
        if (parts.length >= 3 && parts[0] === String(PET_KIND) && parts[1] === pubkey) {
          deletedIds.add(parts[2]);
        }
      }
    }
  }

  return deletedIds;
}

// Parse events into pets
async function parseEventsToPets(
  events: NostrEvent[],
  pubkey: string,
  decryptForCategory: <T>(content: string) => Promise<T>
): Promise<Pet[]> {
  // Separate pet events from deletion events
  const petEvents = events.filter(e => e.kind === PET_KIND);
  const deletionEvents = events.filter(e => e.kind === 5);

  // Get the set of deleted pet IDs
  const deletedIds = getDeletedPetIds(deletionEvents, pubkey);

  const pets: Pet[] = [];
  
  for (const event of petEvents) {
    const id = getTagValue(event, 'd');
    if (!id || deletedIds.has(id)) continue;

    // Check if content is encrypted
    if (event.content && event.content.startsWith(ENCRYPTED_MARKER)) {
      // Decrypt and parse
      const pet = await parsePetEncrypted(
        event,
        (content) => decryptForCategory<PetData>(content)
      );
      if (pet) {
        pets.push(pet);
      }
    } else {
      // Parse plaintext from tags
      const pet = parsePetPlaintext(event);
      if (pet) {
        pets.push(pet);
      }
    }
  }

  // Sort by creation date (newest first)
  return pets.sort((a, b) => b.createdAt - a.createdAt);
}

export function usePets() {
  const { user } = useCurrentUser();
  const { decryptForCategory } = useEncryption();

  // Main query - loads from cache only
  // Background sync is handled centrally by useDataSyncStatus
  const query = useQuery({
    queryKey: ['pets', user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey) {
        return [];
      }

      // Load from cache (populated by useDataSyncStatus)
      const cachedEvents = await getCachedEvents([PET_KIND, 5], user.pubkey);
      
      if (cachedEvents.length > 0) {
        const pets = await parseEventsToPets(cachedEvents, user.pubkey, decryptForCategory);
        return pets;
      }

      return [];
    },
    enabled: !!user?.pubkey,
    staleTime: Infinity, // Data comes from IndexedDB cache, no need to refetch
    gcTime: Infinity, // Keep in memory for the session
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch when component remounts - use cached data
  });

  return query;
}

export function usePetById(id: string | undefined) {
  const { data: pets } = usePets();
  return pets?.find(p => p.id === id);
}

export function usePetActions() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { encryptForCategory, shouldEncrypt } = useEncryption();
  const { isEncryptionEnabled } = useEncryptionSettings();

  const createPet = async (data: Omit<Pet, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const id = crypto.randomUUID();
    const useEncryption = isEncryptionEnabled('pets');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Cypher Log pet data' : `Pet: ${data.name}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('pets')) {
      // Store data in encrypted content
      content = await encryptForCategory('pets', data);
    } else {
      // Store data in plaintext tags
      tags.push(['name', data.name]);
      tags.push(['pet_type', data.petType]);
      
      if (data.species) tags.push(['species', data.species]);
      if (data.breed) tags.push(['breed', data.breed]);
      if (data.birthDate) tags.push(['birth_date', data.birthDate]);
      if (data.adoptionDate) tags.push(['adoption_date', data.adoptionDate]);
      if (data.weight) tags.push(['weight', data.weight]);
      if (data.color) tags.push(['color', data.color]);
      if (data.sex) tags.push(['sex', data.sex]);
      if (data.isNeutered) tags.push(['is_neutered', 'true']);
      if (data.microchipId) tags.push(['microchip_id', data.microchipId]);
      if (data.licenseNumber) tags.push(['license_number', data.licenseNumber]);
      if (data.vetClinic) tags.push(['vet_clinic', data.vetClinic]);
      if (data.vetPhone) tags.push(['vet_phone', data.vetPhone]);
      if (data.allergies) tags.push(['allergies', data.allergies]);
      if (data.medications) tags.push(['medications', data.medications]);
      if (data.medicalConditions) tags.push(['medical_conditions', data.medicalConditions]);
      if (data.lastVetVisit) tags.push(['last_vet_visit', data.lastVetVisit]);
      if (data.photoUrl) tags.push(['photo_url', data.photoUrl]);
      if (data.notes) tags.push(['notes', data.notes]);
      if (data.isArchived) tags.push(['is_archived', 'true']);

      if (data.documentsUrls) {
        for (const url of data.documentsUrls) {
          tags.push(['document_url', url]);
        }
      }
    }

    const event = await publishEvent({
      kind: PET_KIND,
      content,
      tags,
    });

    if (event) {
      await cacheEvents([event]);
    }

    // Use refetchQueries to ensure immediate data refresh after creating a pet
    await queryClient.refetchQueries({ queryKey: ['pets', user.pubkey] });

    return id;
  };

  const updatePet = async (id: string, data: Omit<Pet, 'id' | 'pubkey' | 'createdAt'>) => {
    if (!user) throw new Error('Must be logged in');

    const useEncryption = isEncryptionEnabled('pets');

    // Base tags (always included)
    const tags: string[][] = [
      ['d', id],
      ['alt', useEncryption ? 'Encrypted Cypher Log pet data' : `Pet: ${data.name}`],
    ];

    let content = '';

    if (useEncryption && shouldEncrypt('pets')) {
      // Store data in encrypted content
      content = await encryptForCategory('pets', data);
    } else {
      // Store data in plaintext tags
      tags.push(['name', data.name]);
      tags.push(['pet_type', data.petType]);
      
      if (data.species) tags.push(['species', data.species]);
      if (data.breed) tags.push(['breed', data.breed]);
      if (data.birthDate) tags.push(['birth_date', data.birthDate]);
      if (data.adoptionDate) tags.push(['adoption_date', data.adoptionDate]);
      if (data.weight) tags.push(['weight', data.weight]);
      if (data.color) tags.push(['color', data.color]);
      if (data.sex) tags.push(['sex', data.sex]);
      if (data.isNeutered) tags.push(['is_neutered', 'true']);
      if (data.microchipId) tags.push(['microchip_id', data.microchipId]);
      if (data.licenseNumber) tags.push(['license_number', data.licenseNumber]);
      if (data.vetClinic) tags.push(['vet_clinic', data.vetClinic]);
      if (data.vetPhone) tags.push(['vet_phone', data.vetPhone]);
      if (data.allergies) tags.push(['allergies', data.allergies]);
      if (data.medications) tags.push(['medications', data.medications]);
      if (data.medicalConditions) tags.push(['medical_conditions', data.medicalConditions]);
      if (data.lastVetVisit) tags.push(['last_vet_visit', data.lastVetVisit]);
      if (data.photoUrl) tags.push(['photo_url', data.photoUrl]);
      if (data.notes) tags.push(['notes', data.notes]);
      if (data.isArchived) tags.push(['is_archived', 'true']);

      if (data.documentsUrls) {
        for (const url of data.documentsUrls) {
          tags.push(['document_url', url]);
        }
      }
    }

    const event = await publishEvent({
      kind: PET_KIND,
      content,
      tags,
    });

    if (event) {
      await cacheEvents([event]);
    }

    // Use refetchQueries to ensure immediate data refresh after updating a pet
    await queryClient.refetchQueries({ queryKey: ['pets', user.pubkey] });
  };

  const archivePet = async (id: string, isArchived: boolean) => {
    if (!user) throw new Error('Must be logged in');

    // Get current pet data
    const pets = queryClient.getQueryData<Pet[]>(['pets', user.pubkey]) || [];
    const pet = pets.find(p => p.id === id);
    if (!pet) throw new Error('Pet not found');

    // Update with archive status
    await updatePet(id, { ...pet, isArchived });
  };

  const deletePet = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    // Publish a deletion request (kind 5)
    const event = await publishEvent({
      kind: 5,
      content: 'Deleted pet',
      tags: [
        ['a', `${PET_KIND}:${user.pubkey}:${id}`],
      ],
    });

    if (event) {
      await cacheEvents([event]);
      await deleteCachedEventByAddress(PET_KIND, user.pubkey, id);
    }

    // Small delay to allow the deletion event to propagate to relays
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force refetch to get updated data including the deletion event
    await queryClient.refetchQueries({ queryKey: ['pets', user.pubkey] });
  };

  return { createPet, updatePet, deletePet, archivePet };
}

// Get archived pets
export function useArchivedPets() {
  const { data: pets = [] } = usePets();
  return pets.filter(p => p.isArchived);
}

// Get active (non-archived) pets
export function useActivePets() {
  const { data: pets = [] } = usePets();
  return pets.filter(p => !p.isArchived);
}
