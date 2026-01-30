# Cypher Log Agent API

This document defines the programmatic interface for AI agents to create, read, update, and delete data in Cypher Log. Use this specification when building AI integrations that need to interact with user data.

## Overview

Cypher Log exposes its functionality through React hooks that can be called programmatically. Each data type has a corresponding hook with CRUD operations.

## Authentication Context

All operations require the user to be logged in via Nostr. The agent must operate within an authenticated session where `useCurrentUser()` returns a valid user.

```typescript
import { useCurrentUser } from '@/hooks/useCurrentUser';

const { user } = useCurrentUser();
if (!user) {
  throw new Error('User must be logged in for agent operations');
}
```

---

## Available Data Types & Actions

### 1. Appliances (My Stuff)

**Hook:** `useApplianceActions()`

**Import:**
```typescript
import { useApplianceActions } from '@/hooks/useAppliances';
```

**Actions:**
```typescript
const { createAppliance, updateAppliance, deleteAppliance, archiveAppliance } = useApplianceActions();
```

**Create Appliance Schema:**
```typescript
interface CreateApplianceInput {
  model: string;              // Required: Model name (e.g., "KitchenAid KSM150")
  manufacturer: string;       // Required: Manufacturer name
  purchaseDate: string;       // Required: Format "MM/DD/YYYY"
  price?: string;             // Optional: Purchase price (e.g., "$299.99")
  room: string;               // Required: Room location (e.g., "Kitchen", "Garage")
  receiptUrl?: string;        // Optional: URL to receipt image/PDF
  manualUrl?: string;         // Optional: URL to product manual
  isArchived?: boolean;       // Optional: Archive status
}

// Example
await createAppliance({
  model: "Model XYZ-500",
  manufacturer: "Acme Corp",
  purchaseDate: "01/15/2024",
  price: "$599.99",
  room: "Kitchen"
});
```

**Standard Rooms:**
- Bedroom, Bathroom, Dining Room, Utility Room, Office, Mudroom, Kitchen, Garage
- Custom room names are also accepted

---

### 2. Vehicles

**Hook:** `useVehicleActions()`

**Import:**
```typescript
import { useVehicleActions } from '@/hooks/useVehicles';
```

**Actions:**
```typescript
const { createVehicle, updateVehicle, deleteVehicle, archiveVehicle } = useVehicleActions();
```

**Create Vehicle Schema:**
```typescript
interface CreateVehicleInput {
  name: string;                   // Required: Display name (e.g., "2020 Toyota Camry")
  vehicleType: string;            // Required: Type category
  make?: string;                  // Optional: Manufacturer
  model?: string;                 // Optional: Model name
  year?: string;                  // Optional: Model year
  purchaseDate?: string;          // Optional: Format "MM/DD/YYYY"
  purchasePrice?: string;         // Optional: Purchase price
  licensePlate?: string;          // Optional: License plate number
  mileage?: string;               // Optional: Current mileage
  fuelType?: string;              // Optional: Fuel type
  registrationExpiry?: string;    // Optional: Format "MM/DD/YYYY"
  // Boat-specific
  hullId?: string;                // Optional: Hull ID (boats)
  registrationNumber?: string;    // Optional: Registration number
  engineHours?: string;           // Optional: Engine hours
  // Aircraft-specific
  tailNumber?: string;            // Optional: Aircraft tail number
  hobbsTime?: string;             // Optional: Hobbs meter hours
  // Farm machinery
  serialNumber?: string;          // Optional: Serial number
  // Documents
  receiptUrl?: string;            // Optional: Receipt URL
  warrantyUrl?: string;           // Optional: Warranty document URL
  warrantyExpiry?: string;        // Optional: Format "MM/DD/YYYY"
  documentsUrls?: string[];       // Optional: Additional document URLs
  notes?: string;                 // Optional: Notes
  isArchived?: boolean;           // Optional: Archive status
}

// Example
await createVehicle({
  name: "2020 Honda Accord",
  vehicleType: "Personal Vehicle",
  make: "Honda",
  model: "Accord",
  year: "2020",
  mileage: "45000",
  fuelType: "gasoline"
});
```

**Vehicle Types:**
- Personal Vehicle, Recreational, Farm Machinery, Business Vehicle, Boat, Plane
- Custom types are also accepted

**Fuel Types:**
- gasoline, diesel, electric, hybrid, propane, natural_gas, jet_fuel, avgas, other

---

### 3. Maintenance Schedules

**Hook:** `useMaintenanceActions()`

**Import:**
```typescript
import { useMaintenanceActions } from '@/hooks/useMaintenance';
```

**Actions:**
```typescript
const { createMaintenance, updateMaintenance, deleteMaintenance, archiveMaintenance } = useMaintenanceActions();
```

**Create Maintenance Schema:**
```typescript
interface CreateMaintenanceInput {
  description: string;            // Required: Task description
  // Must have ONE of these three:
  applianceId?: string;           // Link to appliance
  vehicleId?: string;             // Link to vehicle
  homeFeature?: string;           // Home feature name (e.g., "Gutters", "HVAC")
  // Schedule (required unless isLogOnly is true)
  frequency?: number;             // Numeric frequency value
  frequencyUnit?: 'days' | 'weeks' | 'months' | 'years';
  // Optional fields
  companyId?: string;             // Link to service provider
  parts?: MaintenancePart[];      // Parts needed
  mileageInterval?: number;       // For vehicles: mileage-based interval
  intervalType?: 'miles' | 'hours'; // Interval type
  isLogOnly?: boolean;            // True for log-only (no schedule)
  isArchived?: boolean;           // Archive status
}

interface MaintenancePart {
  name: string;                   // Part name
  partNumber?: string;            // Part number
  cost?: string;                  // Part cost
}

// Example: Scheduled maintenance for an appliance
await createMaintenance({
  description: "Replace water filter",
  applianceId: "uuid-of-refrigerator",
  frequency: 6,
  frequencyUnit: "months",
  parts: [
    { name: "Water Filter", partNumber: "WF-123", cost: "$45.99" }
  ]
});

// Example: Vehicle maintenance with mileage interval
await createMaintenance({
  description: "Oil Change",
  vehicleId: "uuid-of-vehicle",
  frequency: 6,
  frequencyUnit: "months",
  mileageInterval: 5000,
  intervalType: "miles"
});

// Example: Log-only maintenance (no recurring schedule)
await createMaintenance({
  description: "Brake pad replacement",
  vehicleId: "uuid-of-vehicle",
  isLogOnly: true
});

// Example: Home feature maintenance
await createMaintenance({
  description: "Clean and inspect",
  homeFeature: "Gutters",
  frequency: 6,
  frequencyUnit: "months"
});
```

**Home Features:**
- Chimney, Gutters, Walkway, Front Yard, Back Yard, Side Yard, Pool, Pond, Garden, Front Porch, Back Porch, Crawl Space
- Custom features are also accepted

---

### 4. Maintenance Completions

**Hook:** `useMaintenanceCompletionActions()`

**Import:**
```typescript
import { useMaintenanceCompletionActions } from '@/hooks/useMaintenanceCompletions';
```

**Actions:**
```typescript
const { createCompletion, deleteCompletion } = useMaintenanceCompletionActions();
```

**Create Completion Schema:**
```typescript
interface CreateCompletionInput {
  maintenanceId: string;          // Required: ID of maintenance schedule
  completedDate: string;          // Required: Format "MM/DD/YYYY"
  mileageAtCompletion?: string;   // Optional: Mileage at completion
  notes?: string;                 // Optional: Notes about completion
  parts?: MaintenancePart[];      // Optional: Parts used
}

// Example
await createCompletion({
  maintenanceId: "uuid-of-maintenance-schedule",
  completedDate: "01/30/2026",
  notes: "Replaced filter, system running smoothly"
});
```

---

### 5. Companies/Service Providers

**Hook:** `useCompanyActions()`

**Import:**
```typescript
import { useCompanyActions } from '@/hooks/useCompanies';
```

**Actions:**
```typescript
const { createCompany, updateCompany, deleteCompany } = useCompanyActions();
```

**Create Company Schema:**
```typescript
interface CreateCompanyInput {
  name: string;                   // Required: Company name
  serviceType: string;            // Required: Service type
  contactName?: string;           // Optional: Contact person
  phone?: string;                 // Optional: Phone number
  email?: string;                 // Optional: Email
  website?: string;               // Optional: Website URL
  address?: string;               // Optional: Street address
  city?: string;                  // Optional: City
  state?: string;                 // Optional: State
  zipCode?: string;               // Optional: Zip code
  licenseNumber?: string;         // Optional: License number
  insuranceInfo?: string;         // Optional: Insurance details
  acceptsBitcoin?: boolean;       // Optional: Accepts Bitcoin
  rating?: number;                // Optional: 1-5 stars
  invoices?: Invoice[];           // Optional: Service invoices
  notes?: string;                 // Optional: Notes
}

interface Invoice {
  url: string;                    // Required: Invoice URL
  date: string;                   // Required: Format "MM/DD/YYYY"
  amount?: string;                // Optional: Invoice amount
  description?: string;           // Optional: Description
}

// Example
await createCompany({
  name: "ABC Plumbing",
  serviceType: "Plumber",
  phone: "(555) 123-4567",
  rating: 5
});
```

**Service Types:**
- Plumber, Electrician, HVAC, Landscaping, Roofing, General Contractor, Pest Control, Cleaning Service, Pool/Spa Service, Appliance Repair, Handyman, Painting, Flooring, Tree Service, Septic/Sewer, Other

---

### 6. Subscriptions

**Hook:** `useSubscriptionActions()`

**Import:**
```typescript
import { useSubscriptionActions } from '@/hooks/useSubscriptions';
```

**Actions:**
```typescript
const { createSubscription, updateSubscription, deleteSubscription, archiveSubscription } = useSubscriptionActions();
```

**Create Subscription Schema:**
```typescript
interface CreateSubscriptionInput {
  name: string;                   // Required: Subscription name
  subscriptionType: string;       // Required: Category
  cost: string;                   // Required: Cost (e.g., "15.99")
  billingFrequency: BillingFrequency; // Required: Billing cycle
  currency?: string;              // Optional: Currency code (default: USD)
  companyId?: string;             // Optional: Link to company
  companyName?: string;           // Optional: Manual company name
  linkedAssetType?: 'appliance' | 'vehicle' | 'home_feature';
  linkedAssetId?: string;         // Optional: Linked asset ID
  linkedAssetName?: string;       // Optional: Linked asset name
  notes?: string;                 // Optional: Notes
  isArchived?: boolean;           // Optional: Archive status
}

type BillingFrequency = 'weekly' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually' | 'one-time';

// Example
await createSubscription({
  name: "Netflix Premium",
  subscriptionType: "Streaming",
  cost: "22.99",
  billingFrequency: "monthly"
});
```

**Subscription Types:**
- Streaming, Software, Health/Wellness, Shopping, Vehicle, Food, Gaming, News/Media, Music, Home, Finance, Pet Care

---

### 7. Warranties

**Hook:** `useWarrantyActions()`

**Import:**
```typescript
import { useWarrantyActions } from '@/hooks/useWarranties';
```

**Actions:**
```typescript
const { createWarranty, updateWarranty, deleteWarranty, archiveWarranty } = useWarrantyActions();
```

**Create Warranty Schema:**
```typescript
interface CreateWarrantyInput {
  name: string;                       // Required: Product name
  warrantyType: string;               // Required: Warranty category
  description?: string;               // Optional: Coverage description
  purchaseDate?: string;              // Optional: Format "MM/DD/YYYY"
  purchasePrice?: string;             // Optional: Purchase price
  warrantyStartDate?: string;         // Optional: Format "MM/DD/YYYY"
  warrantyEndDate?: string;           // Optional: Format "MM/DD/YYYY"
  warrantyLengthValue?: number;       // Optional: Duration value
  warrantyLengthUnit?: 'weeks' | 'months' | 'years';
  isLifetime?: boolean;               // Optional: Lifetime warranty
  linkedType?: 'appliance' | 'vehicle' | 'home_feature' | 'custom';
  linkedItemId?: string;              // Optional: Linked item ID
  linkedItemName?: string;            // Optional: Linked item name
  companyId?: string;                 // Optional: Company reference
  companyName?: string;               // Optional: Manual company name
  isRegistered?: boolean;             // Optional: Registration status
  registrationDate?: string;          // Optional: Format "MM/DD/YYYY"
  registrationNumber?: string;        // Optional: Registration number
  hasExtendedWarranty?: boolean;      // Optional: Extended warranty
  extendedWarrantyProvider?: string;  // Optional: Extended provider
  extendedWarrantyEndDate?: string;   // Optional: Format "MM/DD/YYYY"
  extendedWarrantyCost?: string;      // Optional: Extended cost
  documents?: WarrantyDocument[];     // Optional: Documents
  receiptUrl?: string;                // Optional: Receipt URL
  notes?: string;                     // Optional: Notes
  isArchived?: boolean;               // Optional: Archive status
}

interface WarrantyDocument {
  url: string;
  name?: string;
  uploadedAt?: string;
}

// Example
await createWarranty({
  name: "Samsung Refrigerator",
  warrantyType: "Appliance",
  purchaseDate: "01/15/2024",
  warrantyLengthValue: 2,
  warrantyLengthUnit: "years",
  linkedType: "appliance",
  linkedItemId: "uuid-of-appliance"
});
```

**Warranty Types:**
- Automotive, Appliance, Electronics, Tools, Furniture, Outdoor Gear, Home Features, Jewelry, Medical, Pet Products

---

### 8. Pets

**Hook:** `usePetActions()`

**Import:**
```typescript
import { usePetActions } from '@/hooks/usePets';
```

**Actions:**
```typescript
const { createPet, updatePet, deletePet, archivePet } = usePetActions();
```

**Create Pet Schema:**
```typescript
interface CreatePetInput {
  name: string;                   // Required: Pet's name
  petType: string;                // Required: Type of pet
  species?: string;               // Optional: Species/breed type
  breed?: string;                 // Optional: Breed
  birthDate?: string;             // Optional: Format "MM/DD/YYYY"
  adoptionDate?: string;          // Optional: Format "MM/DD/YYYY"
  weight?: string;                // Optional: Weight (e.g., "45 lbs")
  color?: string;                 // Optional: Color/markings
  sex?: 'male' | 'female' | 'unknown';
  isNeutered?: boolean;           // Optional: Spayed/neutered
  microchipId?: string;           // Optional: Microchip ID
  licenseNumber?: string;         // Optional: License number
  vetClinic?: string;             // Optional: Vet clinic name
  vetPhone?: string;              // Optional: Vet phone
  allergies?: string;             // Optional: Known allergies
  medications?: string;           // Optional: Current medications
  medicalConditions?: string;     // Optional: Medical conditions
  photoUrl?: string;              // Optional: Photo URL
  documentsUrls?: string[];       // Optional: Document URLs
  notes?: string;                 // Optional: Notes
  isArchived?: boolean;           // Optional: Archive status
}

// Example
await createPet({
  name: "Max",
  petType: "Dog",
  species: "Golden Retriever",
  birthDate: "03/15/2020",
  weight: "75 lbs",
  sex: "male",
  isNeutered: true
});
```

**Pet Types:**
- Dog, Cat, Bird, Fish, Reptile, Small Mammal, Horse, Livestock, Other

---

### 9. Vet Visits

**Hook:** `useVetVisitActions()`

**Import:**
```typescript
import { useVetVisitActions } from '@/hooks/useVetVisits';
```

**Actions:**
```typescript
const { createVetVisit, updateVetVisit, deleteVetVisit } = useVetVisitActions();
```

**Create Vet Visit Schema:**
```typescript
interface CreateVetVisitInput {
  petId: string;                  // Required: Pet ID
  visitDate: string;              // Required: Format "MM/DD/YYYY"
  visitType: VetVisitType;        // Required: Type of visit
  reason: string;                 // Required: Reason for visit
  vetClinic?: string;             // Optional: Clinic name
  veterinarian?: string;          // Optional: Vet name
  diagnosis?: string;             // Optional: Diagnosis
  treatment?: string;             // Optional: Treatment provided
  prescriptions?: string;         // Optional: Medications prescribed
  weight?: string;                // Optional: Weight at visit
  vaccinations?: string[];        // Optional: Vaccinations given
  followUpDate?: string;          // Optional: Format "MM/DD/YYYY"
  followUpNotes?: string;         // Optional: Follow-up notes
  cost?: string;                  // Optional: Visit cost
  documentsUrls?: string[];       // Optional: Document URLs
  notes?: string;                 // Optional: Notes
}

type VetVisitType = 'checkup' | 'vaccination' | 'illness' | 'surgery' | 'dental' | 'grooming' | 'emergency' | 'follow_up' | 'other';

// Example
await createVetVisit({
  petId: "uuid-of-pet",
  visitDate: "01/30/2026",
  visitType: "checkup",
  reason: "Annual wellness exam",
  weight: "76 lbs",
  vaccinations: ["Rabies", "DHPP"],
  cost: "$185.00"
});
```

---

### 10. Projects

**Hook:** `useProjectActions()`

**Import:**
```typescript
import { useProjectActions } from '@/hooks/useProjects';
```

**Actions:**
```typescript
const { createProject, updateProject, deleteProject, archiveProject } = useProjectActions();
```

**Create Project Schema:**
```typescript
interface CreateProjectInput {
  name: string;                   // Required: Project name
  description?: string;           // Optional: Description
  startDate: string;              // Required: Format "MM/DD/YYYY"
  targetCompletionDate?: string;  // Optional: Format "MM/DD/YYYY"
  status?: 'planning' | 'in_progress' | 'on_hold' | 'completed';
  budget?: string;                // Optional: Budget amount
  completionDate?: string;        // Optional: Format "MM/DD/YYYY"
  companyIds?: string[];          // Optional: Linked company IDs
  notes?: string;                 // Optional: Notes
  isArchived?: boolean;           // Optional: Archive status
}

// Example
await createProject({
  name: "Kitchen Renovation",
  description: "Complete kitchen remodel with new cabinets and countertops",
  startDate: "02/01/2026",
  targetCompletionDate: "04/30/2026",
  status: "planning",
  budget: "$25,000"
});
```

---

## Reading Data

To read existing data, use the corresponding query hooks:

```typescript
import { useAppliances } from '@/hooks/useAppliances';
import { useVehicles } from '@/hooks/useVehicles';
import { useMaintenance } from '@/hooks/useMaintenance';
import { useCompanies } from '@/hooks/useCompanies';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useWarranties } from '@/hooks/useWarranties';
import { usePets } from '@/hooks/usePets';
import { useProjects } from '@/hooks/useProjects';

// Each returns { data, isLoading, error }
const { data: appliances } = useAppliances();
const { data: vehicles } = useVehicles();
const { data: maintenance } = useMaintenance();
```

### Finding Items by ID

```typescript
import { useApplianceById } from '@/hooks/useAppliances';
import { useVehicleById } from '@/hooks/useVehicles';

const appliance = useApplianceById('uuid-here');
const vehicle = useVehicleById('uuid-here');
```

### Filtered Queries

```typescript
import { useMaintenanceByAppliance, useMaintenanceByVehicle } from '@/hooks/useMaintenance';
import { useWarrantiesByApplianceId, useWarrantiesByVehicleId } from '@/hooks/useWarranties';

const applianceMaintenance = useMaintenanceByAppliance('appliance-id');
const vehicleMaintenance = useMaintenanceByVehicle('vehicle-id');
```

---

## Agent Workflow Example

Here's a complete example of an AI agent extracting maintenance tasks from a manual:

```typescript
import { useApplianceActions, useAppliances } from '@/hooks/useAppliances';
import { useMaintenanceActions } from '@/hooks/useMaintenance';
import { useCurrentUser } from '@/hooks/useCurrentUser';

async function addMaintenanceFromManual(
  applianceName: string,
  extractedTasks: Array<{
    description: string;
    frequencyMonths: number;
    parts?: Array<{ name: string; partNumber?: string }>;
  }>
) {
  const { user } = useCurrentUser();
  if (!user) throw new Error('User must be logged in');

  const { data: appliances } = useAppliances();
  const { createMaintenance } = useMaintenanceActions();

  // Find the appliance
  const appliance = appliances?.find(a => 
    a.model.toLowerCase().includes(applianceName.toLowerCase())
  );

  if (!appliance) {
    throw new Error(`Appliance "${applianceName}" not found`);
  }

  // Create maintenance tasks
  const results = [];
  for (const task of extractedTasks) {
    const id = await createMaintenance({
      description: task.description,
      applianceId: appliance.id,
      frequency: task.frequencyMonths,
      frequencyUnit: 'months',
      parts: task.parts?.map(p => ({
        name: p.name,
        partNumber: p.partNumber
      }))
    });
    results.push({ taskId: id, description: task.description });
  }

  return results;
}

// Example usage by agent:
await addMaintenanceFromManual("KitchenAid Mixer", [
  {
    description: "Clean and lubricate beater shaft",
    frequencyMonths: 12
  },
  {
    description: "Replace attachment hub gasket",
    frequencyMonths: 24,
    parts: [{ name: "Hub Gasket", partNumber: "WP9703138" }]
  },
  {
    description: "Check and tighten motor brushes",
    frequencyMonths: 36
  }
]);
```

---

## Date Format

All dates in Cypher Log use the format: **MM/DD/YYYY**

Examples:
- January 15, 2024 = "01/15/2024"
- December 1, 2025 = "12/01/2025"

---

## Error Handling

All action functions throw errors that should be caught:

```typescript
try {
  await createAppliance({ ... });
} catch (error) {
  if (error.message === 'Must be logged in') {
    // Handle authentication error
  } else {
    // Handle other errors
  }
}
```

---

## File Uploads

For documents, receipts, and images, use the file upload hook:

```typescript
import { useUploadFile } from '@/hooks/useUploadFile';

const { mutateAsync: uploadFile } = useUploadFile();

// Upload returns NIP-94 compatible tags with URL
const [[_, url]] = await uploadFile(file);

// Use the URL in your data
await createAppliance({
  model: "Product Name",
  manufacturer: "Manufacturer",
  purchaseDate: "01/15/2024",
  room: "Kitchen",
  receiptUrl: url  // Use the uploaded URL
});
```

---

## Security Notes

1. **Encryption**: Sensitive data categories (appliances, vehicles, pets, etc.) can be encrypted. Check encryption status before processing.

2. **User Consent**: Agents should always confirm actions with users before creating/modifying data.

3. **Rate Limiting**: Avoid creating too many events in rapid succession. Add delays between batch operations.

4. **Validation**: Always validate extracted data before creating records. Invalid data will cause errors.

---

## MCP Server Integration (Future)

For external AI agents (like Claude Desktop, custom agents), Cypher Log could expose an MCP (Model Context Protocol) server that provides these actions as tools. The MCP server would:

1. Authenticate via NIP-98 HTTP Auth
2. Expose tools matching the schemas above
3. Handle Nostr signing through the user's connected signer

See the MCP specification for implementation details: https://modelcontextprotocol.io/
