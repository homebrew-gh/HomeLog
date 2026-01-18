# Home Log - Custom Nostr Event Kinds

This document describes the custom Nostr event kinds used by the Home Log application for managing home appliances and maintenance schedules.

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

## Kind 30229: Maintenance Schedule

An addressable event representing a maintenance schedule for an appliance.

### Format

```json
{
  "kind": 30229,
  "content": "",
  "tags": [
    ["d", "<unique-identifier>"],
    ["alt", "Maintenance schedule: <description>"],
    ["a", "32627:<pubkey>:<appliance-d-tag>", "", "appliance"],
    ["description", "<maintenance description>"],
    ["part_number", "<part number>"],
    ["frequency", "<number>"],
    ["frequency_unit", "days|weeks|months|years"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier (UUID) for the maintenance schedule |
| `alt` | Yes | Human-readable description (NIP-31) |
| `a` | Yes | Reference to the appliance (kind 32627) this maintenance is for |
| `description` | Yes | Description of the maintenance task |
| `part_number` | No | Part number for replacement parts |
| `frequency` | Yes | Numeric frequency value |
| `frequency_unit` | Yes | Unit of frequency: days, weeks, months, or years |

### Due Date Calculation

The next maintenance due date is calculated by:
1. Taking the appliance's `purchase_date` from the referenced kind 32627 event
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

### Notes

- Multiple completion events can exist for a single maintenance schedule, creating a history of when maintenance was performed
- Completion events are regular events (not replaceable) so the full history is preserved
- Completions are displayed chronologically under each maintenance item
