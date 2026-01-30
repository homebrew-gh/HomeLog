# Home Log - Custom Nostr Event Kinds

This document describes the custom Nostr event kinds used by the Home Log application for managing home appliances, vehicles, and maintenance schedules.

## Kind 32627: Home Appliance

An addressable event representing a home appliance.

### Format

```json
{
  "kind": 32627,
  "content": "",
  "tags": [
    ["d", "<unique-identifier>"],
    ["alt", "Home appliance: <model>"],
    ["model", "<appliance model name>"],
    ["manufacturer", "<manufacturer name>"],
    ["purchase_date", "<MM/DD/YYYY>"],
    ["price", "<purchase price>"],
    ["room", "<room name>"],
    ["receipt_url", "<url to receipt file>"],
    ["manual_url", "<url to manual file>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier (UUID) for the appliance |
| `alt` | Yes | Human-readable description (NIP-31) |
| `model` | Yes | Model name/number of the appliance |
| `manufacturer` | No | Manufacturer name |
| `purchase_date` | No | Purchase date in MM/DD/YYYY format |
| `price` | No | Purchase price (e.g., "$599.99") |
| `room` | No | Room where the appliance is installed |
| `receipt_url` | No | URL to uploaded purchase receipt |
| `manual_url` | No | URL to uploaded electronic manual |

### Room Values

Standard room values include:
- bedroom
- bathroom
- dining room
- utility room
- office
- mudroom
- kitchen
- garage

Custom room names can also be used.

---

## Kind 32628: Vehicle

An addressable event representing a vehicle (car, truck, boat, plane, farm machinery, etc.).

### Format

```json
{
  "kind": 32628,
  "content": "",
  "tags": [
    ["d", "<unique-identifier>"],
    ["alt", "Vehicle: <name>"],
    ["name", "<vehicle display name>"],
    ["vehicle_type", "<type>"],
    ["make", "<manufacturer>"],
    ["model", "<model>"],
    ["year", "<year>"],
    ["purchase_date", "<MM/DD/YYYY>"],
    ["purchase_price", "<price>"],
    ["license_plate", "<plate>"],
    ["mileage", "<mileage>"],
    ["fuel_type", "<fuel type>"],
    ["registration_expiry", "<MM/DD/YYYY>"],
    ["hull_id", "<HIN for boats>"],
    ["registration_number", "<registration for boats>"],
    ["engine_hours", "<hours>"],
    ["tail_number", "<aircraft tail number>"],
    ["hobbs_time", "<hobbs hours>"],
    ["serial_number", "<serial number>"],
    ["receipt_url", "<url>"],
    ["warranty_url", "<url>"],
    ["warranty_expiry", "<MM/DD/YYYY>"],
    ["document_url", "<url>"],
    ["notes", "<notes>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier (UUID) for the vehicle |
| `alt` | Yes | Human-readable description (NIP-31) |
| `name` | Yes | Display name for the vehicle |
| `vehicle_type` | Yes | Type of vehicle (see Vehicle Types below) |
| `make` | No | Vehicle manufacturer |
| `model` | No | Vehicle model |
| `year` | No | Model year |
| `purchase_date` | No | Purchase date in MM/DD/YYYY format |
| `purchase_price` | No | Purchase price |
| `license_plate` | No | License plate number |
| `mileage` | No | Current mileage |
| `fuel_type` | No | Fuel type (gasoline, diesel, electric, etc.) |
| `registration_expiry` | No | Registration expiration date |
| `hull_id` | No | Hull Identification Number (boats) |
| `registration_number` | No | Boat/aircraft registration number |
| `engine_hours` | No | Engine hours (boats, farm machinery) |
| `tail_number` | No | Aircraft tail number |
| `hobbs_time` | No | Hobbs meter hours (aircraft) |
| `serial_number` | No | Serial number (farm machinery) |
| `receipt_url` | No | URL to purchase receipt |
| `warranty_url` | No | URL to warranty document |
| `warranty_expiry` | No | Warranty expiration date |
| `document_url` | No | URL to additional documents (can have multiple) |
| `notes` | No | Additional notes |

### Vehicle Types

Standard vehicle types include:
- Personal Vehicle
- Recreational
- Farm Machinery
- Business Vehicle
- Boat
- Plane

Custom vehicle types can also be used.

---

## Kind 37003: Company/Service Provider

An addressable event representing a company or service provider.

### Format

```json
{
  "kind": 37003,
  "content": "",
  "tags": [
    ["d", "<unique-identifier>"],
    ["alt", "Company: <name>"],
    ["name", "<business or company name>"],
    ["service_type", "<service type>"],
    ["contact_name", "<primary contact person>"],
    ["phone", "<phone number>"],
    ["email", "<email address>"],
    ["website", "<website URL>"],
    ["address", "<street address>"],
    ["city", "<city>"],
    ["state", "<state>"],
    ["zip_code", "<zip code>"],
    ["license_number", "<license number>"],
    ["insurance_info", "<insurance details>"],
    ["rating", "<1-5>"],
    ["invoice", "<url>", "<date>", "<amount>", "<description>"],
    ["notes", "<notes>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier (UUID) for the company |
| `alt` | Yes | Human-readable description (NIP-31) |
| `name` | Yes | Business or company name |
| `service_type` | Yes | Type of service (see Service Types below) |
| `contact_name` | No | Primary contact person |
| `phone` | No | Phone number |
| `email` | No | Email address |
| `website` | No | Website URL |
| `address` | No | Street address |
| `city` | No | City |
| `state` | No | State |
| `zip_code` | No | Zip/postal code |
| `license_number` | No | License number |
| `insurance_info` | No | Insurance provider and policy details |
| `rating` | No | Rating from 1-5 stars |
| `invoice` | No | Invoice/receipt with format: url, date (MM/DD/YYYY), amount (optional), description (optional). Can have multiple. |
| `notes` | No | Additional notes |

### Invoice Tag Format

The `invoice` tag stores uploaded invoices/receipts with metadata:

```
["invoice", "<url>", "<date>", "<amount>", "<description>"]
```

- `url` (required): URL to the uploaded invoice file (PDF or image)
- `date` (required): Date of the invoice in MM/DD/YYYY format
- `amount` (optional): Invoice amount (e.g., "$150.00")
- `description` (optional): Brief description of the service

Multiple invoice tags can be present for a single contractor to track service history.

### Service Types

Standard service types include:
- Plumber
- Electrician
- HVAC
- Landscaping
- Roofing
- General Contractor
- Pest Control
- Cleaning Service
- Pool/Spa Service
- Appliance Repair
- Handyman
- Painting
- Flooring
- Tree Service
- Septic/Sewer
- Other

Custom service types can also be used.

### Privacy Note

Invoice files are considered sensitive documents and should only be uploaded to private/trusted media servers. The application enforces this by requiring a private Blossom server to be configured before allowing invoice uploads.

Note: This kind was previously called "Contractor/Service Provider" and has been renamed to "Company/Service Provider" for broader applicability.

---

## Kind 30229: Maintenance Schedule

An addressable event representing a maintenance schedule for an appliance or vehicle.

### Format

```json
{
  "kind": 30229,
  "content": "",
  "tags": [
    ["d", "<unique-identifier>"],
    ["alt", "Maintenance schedule: <description>"],
    ["a", "32627:<pubkey>:<appliance-d-tag>", "", "appliance"],
    ["a", "32628:<pubkey>:<vehicle-d-tag>", "", "vehicle"],
    ["a", "37003:<pubkey>:<contractor-d-tag>", "", "contractor"],
    ["description", "<maintenance description>"],
    ["part_number", "<part number>"],
    ["frequency", "<number>"],
    ["frequency_unit", "days|weeks|months|years"],
    ["mileage_interval", "<miles>"],
    ["is_log_only", "true"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier (UUID) for the maintenance schedule |
| `alt` | Yes | Human-readable description (NIP-31) |
| `a` | Conditional | Reference to an appliance (kind 32627), vehicle (kind 32628), or company (kind 37003). At least one appliance, vehicle, or home feature reference is required. Company reference is optional. |
| `description` | Yes | Description of the maintenance task |
| `part_number` | No | Part number for replacement parts |
| `frequency` | Conditional | Numeric frequency value. Required unless `is_log_only` is true. |
| `frequency_unit` | Conditional | Unit of frequency: days, weeks, months, or years. Required unless `is_log_only` is true. |
| `mileage_interval` | No | Mileage interval for vehicle maintenance (e.g., every 5000 miles). Only applicable for scheduled maintenance. |
| `is_log_only` | No | If "true", this is log-only maintenance with no recurring schedule |

### Notes

- Each maintenance schedule references either an appliance OR a vehicle, not both
- Vehicle maintenance can optionally include a mileage interval in addition to time-based frequency
- The `a` tag marker indicates whether the reference is to an "appliance", "vehicle", or "company"
- A company/service provider reference can be optionally added to link the maintenance task to a service provider from the Company/Service tab

### Log-Only Maintenance

Vehicle maintenance supports a "log-only" mode for tasks that don't have a recurring schedule. This is useful for tracking irregular maintenance like:
- Tire rotation when needed
- Brake pad replacement
- Battery replacement
- Window tinting
- Any ad-hoc maintenance

When `is_log_only` is "true":
- The `frequency` and `frequency_unit` tags are omitted
- No due dates are calculated
- The UI displays "Last completed: <date>" instead of a due date
- Users can still record completion events to track when the task was performed

### Due Date Calculation

For scheduled (non-log-only) maintenance, the next due date is calculated by:
1. Taking the `purchase_date` from the referenced appliance (kind 32627) or vehicle (kind 32628) event
2. Adding the maintenance `frequency` × `frequency_unit` to get the first due date
3. For subsequent due dates, continue adding the frequency interval

For example, if an appliance was purchased on 01/15/2024 and has a maintenance frequency of 3 months, the due dates would be:
- 04/15/2024
- 07/15/2024
- 10/15/2024
- etc.

---

## Kind 9413: Maintenance Completion

A regular event recording the completion of a maintenance task.

### Format

```json
{
  "kind": 9413,
  "content": "",
  "tags": [
    ["a", "30229:<pubkey>:<maintenance-d-tag>", "", "maintenance"],
    ["alt", "Maintenance completed on <MM/DD/YYYY>"],
    ["completed_date", "<MM/DD/YYYY>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `a` | Yes | Reference to the maintenance schedule (kind 30229) this completion is for |
| `alt` | Yes | Human-readable description (NIP-31) |
| `completed_date` | Yes | Date the maintenance was completed in MM/DD/YYYY format |
| `mileage_at_completion` | No | Mileage at time of completion (for vehicle maintenance) |
| `notes` | No | Notes about the completion |

### Notes

- Multiple completion events can exist for a single maintenance schedule, creating a history of when maintenance was performed
- Completion events are regular events (not replaceable) so the full history is preserved
- Completions are displayed chronologically under each maintenance item
- For vehicle maintenance, recording mileage at completion helps track usage-based maintenance intervals

---

## Kind 37004: Subscription

An addressable event representing a recurring subscription or service.

### Format

```json
{
  "kind": 37004,
  "content": "",
  "tags": [
    ["d", "<unique-identifier>"],
    ["alt", "Subscription: <name>"],
    ["name", "<subscription name/description>"],
    ["subscription_type", "<type>"],
    ["cost", "<cost>"],
    ["currency", "<currency code>"],
    ["billing_frequency", "<frequency>"],
    ["company_id", "<company-d-tag>"],
    ["company_name", "<manual company name>"],
    ["linked_asset_type", "<appliance|vehicle|home_feature>"],
    ["linked_asset_id", "<asset-d-tag>"],
    ["linked_asset_name", "<asset name>"],
    ["notes", "<notes>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier (UUID) for the subscription |
| `alt` | Yes | Human-readable description (NIP-31) |
| `name` | Yes | Name or description of the subscription |
| `subscription_type` | Yes | Type of subscription (see Subscription Types below) |
| `cost` | Yes | Cost/price of the subscription (e.g., "15.99") |
| `currency` | No | Currency code (e.g., "USD", "EUR", "BTC"). Defaults to user's entry currency. |
| `billing_frequency` | Yes | How often the subscription is billed (see Billing Frequencies below) |
| `company_id` | No | Reference to a Company/Service Provider (d-tag from kind 37003). Mutually exclusive with `company_name`. |
| `company_name` | No | Manual company name entry. Mutually exclusive with `company_id`. |
| `linked_asset_type` | No | Type of linked asset: `appliance`, `vehicle`, or `home_feature` |
| `linked_asset_id` | No | Reference to the linked asset's d-tag (for appliances and vehicles) |
| `linked_asset_name` | No | Name of the linked asset (required for home features, optional for appliances/vehicles) |
| `notes` | No | Additional notes about the subscription |

### Subscription Types

Standard subscription types include:
- Streaming
- Software
- Health/Wellness
- Shopping
- Vehicle
- Food
- Gaming
- News/Media
- Music
- Home
- Finance
- Pet Care

Custom subscription types can also be used.

### Billing Frequencies

Valid billing frequency values:
- `weekly` - Billed weekly
- `monthly` - Billed monthly
- `quarterly` - Billed every 3 months
- `semi-annually` - Billed every 6 months
- `annually` - Billed yearly
- `one-time` - One-time purchase (not recurring)

### Company Linking

Subscriptions can optionally be linked to a company/service provider in two ways:

1. **By reference** (`company_id`): Links to an existing company from the Companies/Services tab using the company's `d` tag identifier. This creates a two-way relationship where the company card shows active subscriptions.

2. **By name** (`company_name`): Manually entered company name for subscriptions that don't need a full company record.

Only one of `company_id` or `company_name` should be present.

### Asset Linking

Subscriptions can optionally be linked to an asset (appliance, vehicle, or home feature) to organize subscriptions by the items they relate to. This is useful for:

- Warranty service plans linked to specific appliances
- Vehicle service subscriptions (roadside assistance, maintenance plans)
- Home feature service contracts (lawn care, pool maintenance)

The linked asset is defined by three optional tags:

1. **`linked_asset_type`**: The type of asset - `appliance`, `vehicle`, or `home_feature`
2. **`linked_asset_id`**: The d-tag of the linked appliance (kind 32627) or vehicle (kind 32628)
3. **`linked_asset_name`**: The name of the asset for display purposes

For appliances and vehicles, `linked_asset_id` is required. For home features, only `linked_asset_name` is used (since home features are not separate Nostr events).

### Security Warning

The notes field should NOT be used to store login credentials, passwords, or other sensitive authentication information. Users should use a dedicated password manager for storing such data securely.

---

## Kind 38033: Pet/Animal

An addressable event representing a pet or animal.

### Format

```json
{
  "kind": 38033,
  "content": "",
  "tags": [
    ["d", "<unique-identifier>"],
    ["alt", "Pet: <name>"],
    ["name", "<pet name>"],
    ["pet_type", "<type>"],
    ["species", "<species/breed type>"],
    ["breed", "<breed>"],
    ["birth_date", "<MM/DD/YYYY>"],
    ["adoption_date", "<MM/DD/YYYY>"],
    ["weight", "<weight>"],
    ["color", "<color>"],
    ["sex", "<male|female|unknown>"],
    ["is_neutered", "true"],
    ["microchip_id", "<microchip number>"],
    ["license_number", "<license number>"],
    ["vet_clinic", "<vet clinic name>"],
    ["vet_phone", "<phone number>"],
    ["allergies", "<allergies>"],
    ["medications", "<medications>"],
    ["medical_conditions", "<conditions>"],
    ["last_vet_visit", "<MM/DD/YYYY>"],
    ["photo_url", "<url>"],
    ["document_url", "<url>"],
    ["notes", "<notes>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier (UUID) for the pet |
| `alt` | Yes | Human-readable description (NIP-31) |
| `name` | Yes | Pet's name |
| `pet_type` | Yes | Type of pet (see Pet Types below) |
| `species` | No | Species or breed type (e.g., "Golden Retriever") |
| `breed` | No | Breed information |
| `birth_date` | No | Birth date in MM/DD/YYYY format |
| `adoption_date` | No | Adoption date in MM/DD/YYYY format |
| `weight` | No | Weight (e.g., "45 lbs") |
| `color` | No | Coloring/markings |
| `sex` | No | Sex: `male`, `female`, or `unknown` |
| `is_neutered` | No | If "true", the pet is spayed/neutered |
| `microchip_id` | No | Microchip identification number |
| `license_number` | No | Pet license number |
| `vet_clinic` | No | Name of veterinary clinic |
| `vet_phone` | No | Veterinary clinic phone number |
| `allergies` | No | Known allergies |
| `medications` | No | Current medications |
| `medical_conditions` | No | Ongoing medical conditions |
| `last_vet_visit` | No | Date of last veterinary visit in MM/DD/YYYY format |
| `photo_url` | No | URL to pet's photo |
| `document_url` | No | URL to additional documents (can have multiple) |
| `notes` | No | Additional notes |

### Pet Types

Standard pet types include:
- Dog
- Cat
- Bird
- Fish
- Reptile
- Small Mammal
- Horse
- Livestock
- Other

Custom pet types can also be used.

### Privacy Considerations

Pet records may contain sensitive personal information (vet details, microchip IDs). Users should consider enabling encryption for this data category when using the application.

---

## Kind 35389: Project

An addressable event representing a home/farm project for tracking renovations, improvements, or other work.

### Format

```json
{
  "kind": 35389,
  "content": "",
  "tags": [
    ["d", "<unique-identifier>"],
    ["alt", "Project: <name>"],
    ["name", "<project name>"],
    ["description", "<project description>"],
    ["start_date", "<MM/DD/YYYY>"],
    ["target_completion_date", "<MM/DD/YYYY>"],
    ["status", "<planning|in_progress|on_hold|completed>"],
    ["budget", "<budget amount>"],
    ["completion_date", "<MM/DD/YYYY>"],
    ["notes", "<notes>"],
    ["a", "37003:<pubkey>:<company-d-tag>", "", "company"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier (UUID) for the project |
| `alt` | Yes | Human-readable description (NIP-31) |
| `name` | Yes | Project name |
| `description` | No | Brief description of the project |
| `start_date` | Yes | Start date in MM/DD/YYYY format |
| `target_completion_date` | No | Target completion date in MM/DD/YYYY format |
| `status` | No | Project status: `planning`, `in_progress`, `on_hold`, or `completed` |
| `budget` | No | Budget amount (e.g., "$5,000") |
| `completion_date` | No | Actual completion date in MM/DD/YYYY format |
| `notes` | No | Additional notes |
| `a` | No | Reference to linked companies (kind 37003). Can have multiple. |
| `is_archived` | No | If "true", the project is archived |

### Project Status

Valid status values:
- `planning` - Project is in the planning phase
- `in_progress` - Work is actively being done
- `on_hold` - Project is temporarily paused
- `completed` - Project is finished

### Company Linking

Projects can be linked to one or more companies/service providers using the `a` tag format:

```
["a", "37003:<pubkey>:<company-d-tag>", "", "company"]
```

Multiple `a` tags can be present to link multiple companies to a single project. This is useful for tracking all contractors, suppliers, and service providers involved in a project.

---

## Kind 1661: Project Entry (Progress Diary)

A regular event representing a progress diary entry for a project.

### Format

```json
{
  "kind": 1661,
  "content": "",
  "tags": [
    ["a", "35389:<pubkey>:<project-d-tag>", "", "project"],
    ["alt", "Project entry: <title or date>"],
    ["entry_date", "<MM/DD/YYYY>"],
    ["title", "<optional title>"],
    ["content_text", "<entry notes>"],
    ["image", "<photo url>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `a` | Yes | Reference to the parent project (kind 35389) |
| `alt` | Yes | Human-readable description (NIP-31) |
| `entry_date` | Yes | Date of the entry in MM/DD/YYYY format |
| `title` | No | Optional title for the entry |
| `content_text` | Yes | Main text content (notes, observations, etc.) |
| `image` | No | URL to an uploaded photo. Can have multiple for multiple photos. |

### Notes

- Project entries are regular events (not replaceable) so the full history is preserved
- Entries are displayed chronologically under each project
- Multiple photos can be attached to a single entry using multiple `image` tags
- Entries can be deleted using kind 5 deletion events with an `e` tag referencing the entry event ID

### Future Enhancements

Project entries are designed to support future long-form publishing to Nostr. The content structure is compatible with NIP-23 long-form content, allowing entries to potentially be shared publicly on Nostr clients like Primal.

---

## Kind 4209: Project Task

A regular event representing a to-do item for a project.

### Format

```json
{
  "kind": 4209,
  "content": "",
  "tags": [
    ["a", "35389:<pubkey>:<project-d-tag>", "", "project"],
    ["alt", "Task: <description>"],
    ["description", "<task description>"],
    ["is_completed", "true|false"],
    ["completed_date", "<MM/DD/YYYY>"],
    ["priority", "low|medium|high"],
    ["due_date", "<MM/DD/YYYY>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `a` | Yes | Reference to the parent project (kind 35389) |
| `alt` | Yes | Human-readable description (NIP-31) |
| `description` | Yes | Task description |
| `is_completed` | Yes | Whether the task is done ("true" or "false") |
| `completed_date` | No | Date when task was completed in MM/DD/YYYY format |
| `priority` | No | Task priority: `low`, `medium`, or `high` |
| `due_date` | No | Optional due date in MM/DD/YYYY format |

### Notes

- Tasks are regular events (not replaceable) so changes create new events
- To update a task (e.g., mark complete), delete the old event and create a new one
- Tasks are sorted by priority (high first) and then by creation date
- Completed tasks are displayed separately from incomplete tasks

---

## Kind 8347: Project Material/Expense

A regular event representing a material or expense item for a project.

### Format

```json
{
  "kind": 8347,
  "content": "",
  "tags": [
    ["a", "35389:<pubkey>:<project-d-tag>", "", "project"],
    ["alt", "Material: <name>"],
    ["name", "<item name>"],
    ["category", "<expense category>"],
    ["quantity", "<number>"],
    ["unit", "<unit of measurement>"],
    ["unit_price", "<price per unit>"],
    ["total_price", "<total price>"],
    ["is_purchased", "true|false"],
    ["purchased_date", "<MM/DD/YYYY>"],
    ["vendor", "<vendor/store name>"],
    ["notes", "<notes>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `a` | Yes | Reference to the parent project (kind 35389) |
| `alt` | Yes | Human-readable description (NIP-31) |
| `name` | Yes | Item name |
| `category` | Yes | Expense category (see categories below) |
| `quantity` | No | Quantity needed |
| `unit` | No | Unit of measurement (e.g., "sq ft", "each", "hours") |
| `unit_price` | No | Price per unit |
| `total_price` | Yes | Total price for this item |
| `is_purchased` | Yes | Whether the item has been purchased ("true" or "false") |
| `purchased_date` | No | Date when item was purchased in MM/DD/YYYY format |
| `vendor` | No | Where the item was/will be purchased |
| `notes` | No | Additional notes |

### Expense Categories

Valid category values:
- `materials` - Building materials, supplies
- `labor` - Labor costs, contractor fees
- `rentals` - Equipment rentals
- `permits` - Permits and fees
- `tools` - Tools purchased for the project
- `delivery` - Delivery fees
- `other` - Miscellaneous expenses

### Budget Tracking

Materials and expenses are used to track project budgets:

1. **Total Planned**: Sum of all `total_price` values
2. **Total Spent**: Sum of `total_price` for items where `is_purchased` is "true"
3. **Remaining**: Original budget minus total spent
4. **Category Breakdown**: Expenses grouped by category for analysis

The application compares these totals against the project's `budget` field (if set) to show remaining budget and over/under budget status.

---

## Kind 7443: Vet Visit

A regular event representing a veterinary visit for a pet/animal.

### Format

```json
{
  "kind": 7443,
  "content": "",
  "tags": [
    ["a", "38033:<pubkey>:<pet-d-tag>", "", "pet"],
    ["alt", "Vet visit on <MM/DD/YYYY>"],
    ["visit_date", "<MM/DD/YYYY>"],
    ["visit_type", "<type>"],
    ["reason", "<reason for visit>"],
    ["vet_clinic", "<clinic name>"],
    ["veterinarian", "<vet name>"],
    ["diagnosis", "<diagnosis>"],
    ["treatment", "<treatment provided>"],
    ["prescriptions", "<medications prescribed>"],
    ["weight", "<weight at visit>"],
    ["vaccination", "<vaccination name>"],
    ["follow_up_date", "<MM/DD/YYYY>"],
    ["follow_up_notes", "<notes>"],
    ["cost", "<visit cost>"],
    ["document_url", "<url>"],
    ["notes", "<notes>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `a` | Yes | Reference to the pet (kind 38033) this visit is for |
| `alt` | Yes | Human-readable description (NIP-31) |
| `visit_date` | Yes | Date of the visit in MM/DD/YYYY format |
| `visit_type` | Yes | Type of visit (see Visit Types below) |
| `reason` | Yes | Reason for the visit |
| `vet_clinic` | No | Name of veterinary clinic |
| `veterinarian` | No | Name of the veterinarian |
| `diagnosis` | No | Diagnosis or findings from the visit |
| `treatment` | No | Treatment provided during the visit |
| `prescriptions` | No | Medications prescribed |
| `weight` | No | Pet's weight at the time of visit (e.g., "45 lbs") |
| `vaccination` | No | Vaccination given. Can have multiple for multiple vaccinations. |
| `follow_up_date` | No | Scheduled follow-up appointment date in MM/DD/YYYY format |
| `follow_up_notes` | No | Notes about the follow-up appointment |
| `cost` | No | Cost of the visit (e.g., "$150.00") |
| `document_url` | No | URL to uploaded documents (receipts, records). Can have multiple. |
| `notes` | No | Additional notes about the visit |

### Visit Types

Valid visit type values:
- `checkup` - Routine Checkup
- `vaccination` - Vaccination
- `illness` - Illness/Injury
- `surgery` - Surgery
- `dental` - Dental Care
- `grooming` - Grooming
- `emergency` - Emergency
- `follow_up` - Follow-up
- `other` - Other

### Notes

- Vet visits are regular events (not replaceable) so the full visit history is preserved
- Visits are displayed chronologically under each pet, with most recent first
- Multiple vaccinations can be recorded in a single visit using multiple `vaccination` tags
- The application automatically updates the pet's `last_vet_visit` and optionally `weight` when a new visit is logged
- Follow-up appointments are highlighted in the UI when approaching or overdue
- Vet visits can be deleted using kind 5 deletion events with an `e` tag referencing the visit event ID

### Privacy Considerations

Vet visit records may contain sensitive information about pet health and medical history. Users should consider enabling encryption for the "pets" data category when using the application. Vet visit data inherits the encryption settings from the pet data category.
