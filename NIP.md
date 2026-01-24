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
    ["vin", "<VIN>"],
    ["license_plate", "<plate>"],
    ["mileage", "<mileage>"],
    ["fuel_type", "<fuel type>"],
    ["registration_expiry", "<MM/DD/YYYY>"],
    ["insurance_provider", "<provider>"],
    ["insurance_policy_number", "<policy number>"],
    ["insurance_expiry", "<MM/DD/YYYY>"],
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
| `vin` | No | Vehicle Identification Number (cars/trucks) |
| `license_plate` | No | License plate number |
| `mileage` | No | Current mileage |
| `fuel_type` | No | Fuel type (gasoline, diesel, electric, etc.) |
| `registration_expiry` | No | Registration expiration date |
| `insurance_provider` | No | Insurance company name |
| `insurance_policy_number` | No | Insurance policy number |
| `insurance_expiry` | No | Insurance expiration date |
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

## Kind 37003: Contractor/Service Provider

An addressable event representing a contractor or service provider.

### Format

```json
{
  "kind": 37003,
  "content": "",
  "tags": [
    ["d", "<unique-identifier>"],
    ["alt", "Contractor: <name>"],
    ["name", "<business or contractor name>"],
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
| `d` | Yes | Unique identifier (UUID) for the contractor |
| `alt` | Yes | Human-readable description (NIP-31) |
| `name` | Yes | Business or contractor name |
| `service_type` | Yes | Type of service (see Service Types below) |
| `contact_name` | No | Primary contact person |
| `phone` | No | Phone number |
| `email` | No | Email address |
| `website` | No | Website URL |
| `address` | No | Street address |
| `city` | No | City |
| `state` | No | State |
| `zip_code` | No | Zip/postal code |
| `license_number` | No | Contractor license number |
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
    ["description", "<maintenance description>"],
    ["part_number", "<part number>"],
    ["frequency", "<number>"],
    ["frequency_unit", "days|weeks|months|years"],
    ["mileage_interval", "<miles>"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier (UUID) for the maintenance schedule |
| `alt` | Yes | Human-readable description (NIP-31) |
| `a` | Conditional | Reference to an appliance (kind 32627) OR vehicle (kind 32628) - at least one required |
| `description` | Yes | Description of the maintenance task |
| `part_number` | No | Part number for replacement parts |
| `frequency` | Yes | Numeric frequency value |
| `frequency_unit` | Yes | Unit of frequency: days, weeks, months, or years |
| `mileage_interval` | No | Mileage interval for vehicle maintenance (e.g., every 5000 miles) |

### Notes

- Each maintenance schedule references either an appliance OR a vehicle, not both
- Vehicle maintenance can optionally include a mileage interval in addition to time-based frequency
- The `a` tag marker indicates whether the reference is to an "appliance" or "vehicle"

### Due Date Calculation

The next maintenance due date is calculated by:
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
