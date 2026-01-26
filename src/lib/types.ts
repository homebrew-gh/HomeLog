// Home Log Types

export interface Appliance {
  id: string;
  model: string;
  manufacturer: string;
  purchaseDate: string; // MM/DD/YYYY format
  price?: string; // Purchase price (e.g., "$599.99")
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
  homeFeature?: string; // Optional - for home feature maintenance (e.g., "Chimney", "Gutters")
  companyId?: string; // Optional - reference to a company/service provider
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

// Home Features - exterior and structural features that need maintenance
export const DEFAULT_HOME_FEATURES = [
  'Chimney',
  'Gutters',
  'Walkway',
  'Front Yard',
  'Back Yard',
  'Side Yard',
  'Pool',
  'Pond',
  'Garden',
  'Front Porch',
  'Back Porch',
  'Crawl Space',
] as const;

export type DefaultHomeFeature = typeof DEFAULT_HOME_FEATURES[number];

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

// Company/Service Provider Types
export const DEFAULT_COMPANY_TYPES = [
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

export type DefaultCompanyType = typeof DEFAULT_COMPANY_TYPES[number];

// Subscription Types
export const DEFAULT_SUBSCRIPTION_TYPES = [
  'Streaming',
  'Software',
  'Health/Wellness',
  'Shopping',
  'Vehicle',
  'Food',
  'Gaming',
  'News/Media',
  'Music',
  'Home',
  'Finance',
  'Pet Care',
] as const;

export type DefaultSubscriptionType = typeof DEFAULT_SUBSCRIPTION_TYPES[number];

// Warranty Types
export const DEFAULT_WARRANTY_TYPES = [
  'Automotive',
  'Appliance',
  'Electronics',
  'Tools',
  'Furniture',
  'Outdoor Gear',
  'Home Features',
  'Jewelry',
  'Medical',
  'Pet Products',
] as const;

export type DefaultWarrantyType = typeof DEFAULT_WARRANTY_TYPES[number];

// Billing Frequencies for subscriptions
export const BILLING_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annually', label: 'Semi-Annually' },
  { value: 'annually', label: 'Annually' },
  { value: 'one-time', label: 'One-Time' },
] as const;

export type BillingFrequency = typeof BILLING_FREQUENCIES[number]['value'];

export interface Subscription {
  id: string;
  subscriptionType: string;
  name: string; // Description/name of the subscription
  cost: string; // Price as string to handle currency formatting
  currency?: string; // Currency code (e.g., 'USD', 'EUR', 'BTC') - defaults to user's entry currency
  billingFrequency: BillingFrequency;
  companyId?: string; // Optional - link to a company/service provider
  companyName?: string; // Manual entry if not linking to a company
  notes?: string;
  // Metadata
  pubkey: string;
  createdAt: number;
}

export interface Invoice {
  url: string;
  date: string; // MM/DD/YYYY format
  amount?: string;
  description?: string;
}

export interface Company {
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
export const COMPANY_KIND = 37003;
export const MAINTENANCE_KIND = 30229;
export const MAINTENANCE_COMPLETION_KIND = 9413;
export const SUBSCRIPTION_KIND = 37004;
