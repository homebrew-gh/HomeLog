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

// Vehicle Types
export const DEFAULT_VEHICLE_TYPES = [
  'Personal Vehicle',
  'Recreational',
  'Farm Machinery',
  'Business Vehicle',
  'Boat',
  'Plane',
] as const;

export type DefaultVehicleType = typeof DEFAULT_VEHICLE_TYPES[number];

export interface Vehicle {
  id: string;
  vehicleType: string;
  // Common fields for all vehicles
  name: string; // Display name (e.g., "2020 Toyota Camry" or "John Deere Tractor")
  make?: string;
  model?: string;
  year?: string;
  purchaseDate?: string; // MM/DD/YYYY format
  purchasePrice?: string;
  // Vehicle-specific fields
  vin?: string; // VIN for cars/trucks
  licensePlate?: string;
  mileage?: string;
  fuelType?: string;
  // Registration/Insurance
  registrationExpiry?: string; // MM/DD/YYYY format
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string; // MM/DD/YYYY format
  // Boat-specific fields
  hullId?: string; // HIN for boats
  registrationNumber?: string;
  engineHours?: string;
  // Plane-specific fields
  tailNumber?: string;
  hobbsTime?: string;
  // Farm machinery specific
  serialNumber?: string;
  // Documents
  receiptUrl?: string;
  warrantyUrl?: string;
  warrantyExpiry?: string; // MM/DD/YYYY format
  documentsUrls?: string[]; // Array of PDF/document URLs
  // Metadata
  notes?: string;
  pubkey: string;
  createdAt: number;
}

export interface MaintenanceSchedule {
  id: string;
  applianceId?: string; // Optional - for appliance maintenance
  vehicleId?: string; // Optional - for vehicle maintenance
  description: string;
  partNumber?: string;
  frequency: number;
  frequencyUnit: 'days' | 'weeks' | 'months' | 'years';
  // Additional fields for mileage-based maintenance
  mileageInterval?: number; // e.g., every 5000 miles
  pubkey: string;
  createdAt: number;
}

export interface MaintenanceCompletion {
  id: string;
  maintenanceId: string;
  completedDate: string; // MM/DD/YYYY format
  mileageAtCompletion?: string; // For vehicle maintenance tracking
  notes?: string;
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

export const FUEL_TYPES = [
  { value: 'gasoline', label: 'Gasoline' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'propane', label: 'Propane' },
  { value: 'natural_gas', label: 'Natural Gas' },
  { value: 'jet_fuel', label: 'Jet Fuel' },
  { value: 'avgas', label: 'Aviation Gas' },
  { value: 'other', label: 'Other' },
] as const;

// Contractor/Service Provider Types
export const DEFAULT_CONTRACTOR_TYPES = [
  'Plumber',
  'Electrician',
  'HVAC',
  'Landscaping',
  'Roofing',
  'General Contractor',
  'Pest Control',
  'Cleaning Service',
  'Pool/Spa Service',
  'Appliance Repair',
  'Handyman',
  'Painting',
  'Flooring',
  'Tree Service',
  'Septic/Sewer',
  'Other',
] as const;

export type DefaultContractorType = typeof DEFAULT_CONTRACTOR_TYPES[number];

export interface Invoice {
  url: string;
  date: string; // MM/DD/YYYY format
  amount?: string;
  description?: string;
}

export interface Contractor {
  id: string;
  serviceType: string;
  // Basic info
  name: string; // Company or individual name
  contactName?: string; // Primary contact person
  // Contact methods
  phone?: string;
  email?: string;
  website?: string;
  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // Business details
  licenseNumber?: string;
  insuranceInfo?: string;
  // Service history
  invoices: Invoice[]; // Date-stamped invoices (uploaded PDFs/images)
  // Rating/Notes
  rating?: number; // 1-5 stars
  notes?: string;
  // Metadata
  pubkey: string;
  createdAt: number;
}

// Kind numbers for our custom events
export const APPLIANCE_KIND = 32627;
export const VEHICLE_KIND = 32628;
export const CONTRACTOR_KIND = 37003;
export const MAINTENANCE_KIND = 30229;
export const MAINTENANCE_COMPLETION_KIND = 9413;
