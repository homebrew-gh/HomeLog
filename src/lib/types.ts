// Home Log Types

export interface Appliance {
  id: string;
  model: string;
  manufacturer: string;
  purchaseDate: string; // MM/DD/YYYY format
  room: string;
  receiptUrl?: string;
  manualUrl?: string;
  pubkey: string;
  createdAt: number;
}

export interface MaintenanceSchedule {
  id: string;
  applianceId: string;
  description: string;
  partNumber?: string;
  frequency: number;
  frequencyUnit: 'days' | 'weeks' | 'months' | 'years';
  pubkey: string;
  createdAt: number;
}

export const DEFAULT_ROOMS = [
  'Bedroom',
  'Bathroom',
  'Dining Room',
  'Utility Room',
  'Office',
  'Mudroom',
  'Kitchen',
  'Garage',
] as const;

export type DefaultRoom = typeof DEFAULT_ROOMS[number];

export const FREQUENCY_UNITS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
] as const;

// Kind numbers for our custom events
export const APPLIANCE_KIND = 32627;
export const MAINTENANCE_KIND = 30229;
