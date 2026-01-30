#!/usr/bin/env node

/**
 * Cypher Log MCP Server
 * 
 * This server exposes Cypher Log functionality to AI assistants via the
 * Model Context Protocol (MCP). It allows agents to create, read, update,
 * and delete home management data stored on Nostr.
 * 
 * Usage:
 *   NOSTR_PRIVATE_KEY=nsec1... node index.js
 * 
 * Or configure in Claude Desktop's config file.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { NPool, NRelay1 } from '@nostrify/nostrify';
import { generateSecretKey, getPublicKey, finalizeEvent, nip19 } from 'nostr-tools';

// ============================================================================
// Configuration
// ============================================================================

const PRIVATE_KEY = process.env.NOSTR_PRIVATE_KEY;
const RELAYS = (process.env.NOSTR_RELAYS || 'wss://relay.damus.io,wss://relay.nostr.band').split(',');

// Cypher Log Event Kinds
const KINDS = {
  APPLIANCE: 32627,
  VEHICLE: 32628,
  COMPANY: 37003,
  MAINTENANCE: 30229,
  MAINTENANCE_COMPLETION: 9413,
  SUBSCRIPTION: 37004,
  WARRANTY: 35043,
  PET: 38033,
  PROJECT: 35389,
  PROJECT_ENTRY: 1661,
  PROJECT_TASK: 4209,
  PROJECT_MATERIAL: 8347,
  VET_VISIT: 7443,
  DELETION: 5,
};

// ============================================================================
// Nostr Client Setup
// ============================================================================

let secretKey;
let pubkey;

// Parse private key (supports nsec or hex)
function initializeKeys() {
  if (!PRIVATE_KEY) {
    throw new Error('NOSTR_PRIVATE_KEY environment variable is required');
  }

  try {
    if (PRIVATE_KEY.startsWith('nsec1')) {
      const decoded = nip19.decode(PRIVATE_KEY);
      if (decoded.type !== 'nsec') throw new Error('Invalid nsec');
      secretKey = decoded.data;
    } else {
      // Assume hex format
      secretKey = Uint8Array.from(Buffer.from(PRIVATE_KEY, 'hex'));
    }
    pubkey = getPublicKey(secretKey);
    console.error(`[MCP] Initialized with pubkey: ${pubkey.slice(0, 8)}...`);
  } catch (error) {
    throw new Error(`Failed to parse private key: ${error.message}`);
  }
}

// Create Nostr pool
const pool = new NPool({
  open(url) {
    return new NRelay1(url);
  },
  reqRouter(filters) {
    const routes = new Map();
    for (const url of RELAYS) {
      routes.set(url, filters);
    }
    return routes;
  },
  eventRouter(_event) {
    return RELAYS;
  },
});

// ============================================================================
// Nostr Helpers
// ============================================================================

async function signAndPublish(eventTemplate) {
  const event = finalizeEvent({
    ...eventTemplate,
    created_at: Math.floor(Date.now() / 1000),
  }, secretKey);

  await pool.event(event, { signal: AbortSignal.timeout(10000) });
  return event;
}

async function queryEvents(filters, timeout = 10000) {
  const events = await pool.query(filters, { signal: AbortSignal.timeout(timeout) });
  return events;
}

function getTagValue(event, tagName) {
  return event.tags.find(([name]) => name === tagName)?.[1];
}

function uuid() {
  return crypto.randomUUID();
}

// ============================================================================
// Data Parsers
// ============================================================================

function parseAppliance(event) {
  return {
    id: getTagValue(event, 'd'),
    model: getTagValue(event, 'model'),
    manufacturer: getTagValue(event, 'manufacturer'),
    purchaseDate: getTagValue(event, 'purchase_date'),
    price: getTagValue(event, 'price'),
    room: getTagValue(event, 'room'),
  };
}

function parseVehicle(event) {
  return {
    id: getTagValue(event, 'd'),
    name: getTagValue(event, 'name'),
    vehicleType: getTagValue(event, 'vehicle_type'),
    make: getTagValue(event, 'make'),
    model: getTagValue(event, 'model'),
    year: getTagValue(event, 'year'),
    mileage: getTagValue(event, 'mileage'),
  };
}

function parseMaintenance(event) {
  return {
    id: getTagValue(event, 'd'),
    description: getTagValue(event, 'description'),
    frequency: getTagValue(event, 'frequency'),
    frequencyUnit: getTagValue(event, 'frequency_unit'),
    applianceId: event.tags.find(t => t[0] === 'a' && t[1]?.includes(`:${KINDS.APPLIANCE}:`))?.[1]?.split(':')[2],
    vehicleId: event.tags.find(t => t[0] === 'a' && t[1]?.includes(`:${KINDS.VEHICLE}:`))?.[1]?.split(':')[2],
    homeFeature: getTagValue(event, 'home_feature'),
  };
}

function parsePet(event) {
  return {
    id: getTagValue(event, 'd'),
    name: getTagValue(event, 'name'),
    petType: getTagValue(event, 'pet_type'),
    species: getTagValue(event, 'species'),
    breed: getTagValue(event, 'breed'),
  };
}

function parseSubscription(event) {
  return {
    id: getTagValue(event, 'd'),
    name: getTagValue(event, 'name'),
    subscriptionType: getTagValue(event, 'subscription_type'),
    cost: getTagValue(event, 'cost'),
    billingFrequency: getTagValue(event, 'billing_frequency'),
  };
}

function parseWarranty(event) {
  return {
    id: getTagValue(event, 'd'),
    name: getTagValue(event, 'name'),
    warrantyType: getTagValue(event, 'warranty_type'),
    warrantyEndDate: getTagValue(event, 'warranty_end_date'),
  };
}

function parseProject(event) {
  return {
    id: getTagValue(event, 'd'),
    name: getTagValue(event, 'name'),
    status: getTagValue(event, 'status'),
    startDate: getTagValue(event, 'start_date'),
    budget: getTagValue(event, 'budget'),
  };
}

function parseCompany(event) {
  return {
    id: getTagValue(event, 'd'),
    name: getTagValue(event, 'name'),
    serviceType: getTagValue(event, 'service_type'),
    phone: getTagValue(event, 'phone'),
  };
}

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS = [
  // Appliances
  {
    name: 'list_appliances',
    description: 'List all appliances/stuff tracked in Cypher Log',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_appliance',
    description: 'Add a new appliance to track',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Model name (required)' },
        manufacturer: { type: 'string', description: 'Manufacturer name (required)' },
        purchaseDate: { type: 'string', description: 'Purchase date in MM/DD/YYYY format (required)' },
        room: { type: 'string', description: 'Room location (required)' },
        price: { type: 'string', description: 'Purchase price (optional)' },
      },
      required: ['model', 'manufacturer', 'purchaseDate', 'room'],
    },
  },

  // Vehicles
  {
    name: 'list_vehicles',
    description: 'List all vehicles tracked in Cypher Log',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_vehicle',
    description: 'Add a new vehicle to track',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Display name, e.g. "2020 Honda Accord" (required)' },
        vehicleType: { type: 'string', description: 'Type: Personal Vehicle, Recreational, Farm Machinery, Business Vehicle, Boat, Plane (required)' },
        make: { type: 'string', description: 'Manufacturer (optional)' },
        model: { type: 'string', description: 'Model name (optional)' },
        year: { type: 'string', description: 'Model year (optional)' },
        mileage: { type: 'string', description: 'Current mileage (optional)' },
      },
      required: ['name', 'vehicleType'],
    },
  },

  // Maintenance
  {
    name: 'list_maintenance',
    description: 'List all maintenance schedules',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_maintenance',
    description: 'Create a new maintenance schedule for an appliance, vehicle, or home feature',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Maintenance task description (required)' },
        applianceId: { type: 'string', description: 'ID of appliance this maintenance is for (optional)' },
        vehicleId: { type: 'string', description: 'ID of vehicle this maintenance is for (optional)' },
        homeFeature: { type: 'string', description: 'Home feature name like "Gutters", "HVAC" (optional)' },
        frequency: { type: 'number', description: 'Frequency number (required unless log-only)' },
        frequencyUnit: { type: 'string', enum: ['days', 'weeks', 'months', 'years'], description: 'Frequency unit (required unless log-only)' },
        mileageInterval: { type: 'number', description: 'Mileage interval for vehicles (optional)' },
        isLogOnly: { type: 'boolean', description: 'True if this is log-only without a schedule (optional)' },
        partName: { type: 'string', description: 'Name of part needed (optional)' },
        partNumber: { type: 'string', description: 'Part number (optional)' },
      },
      required: ['description'],
    },
  },
  {
    name: 'complete_maintenance',
    description: 'Log a maintenance task as completed',
    inputSchema: {
      type: 'object',
      properties: {
        maintenanceId: { type: 'string', description: 'ID of the maintenance schedule (required)' },
        completedDate: { type: 'string', description: 'Completion date in MM/DD/YYYY format (required)' },
        notes: { type: 'string', description: 'Notes about the completion (optional)' },
        mileage: { type: 'string', description: 'Mileage at completion for vehicles (optional)' },
      },
      required: ['maintenanceId', 'completedDate'],
    },
  },

  // Pets
  {
    name: 'list_pets',
    description: 'List all pets tracked in Cypher Log',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_pet',
    description: 'Add a new pet to track',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Pet name (required)' },
        petType: { type: 'string', description: 'Type: Dog, Cat, Bird, Fish, Reptile, Small Mammal, Horse, Livestock, Other (required)' },
        species: { type: 'string', description: 'Species or breed type (optional)' },
        breed: { type: 'string', description: 'Breed (optional)' },
        birthDate: { type: 'string', description: 'Birth date in MM/DD/YYYY format (optional)' },
        weight: { type: 'string', description: 'Weight, e.g. "45 lbs" (optional)' },
      },
      required: ['name', 'petType'],
    },
  },
  {
    name: 'log_vet_visit',
    description: 'Log a veterinary visit for a pet',
    inputSchema: {
      type: 'object',
      properties: {
        petId: { type: 'string', description: 'ID of the pet (required)' },
        visitDate: { type: 'string', description: 'Visit date in MM/DD/YYYY format (required)' },
        visitType: { type: 'string', enum: ['checkup', 'vaccination', 'illness', 'surgery', 'dental', 'grooming', 'emergency', 'follow_up', 'other'], description: 'Type of visit (required)' },
        reason: { type: 'string', description: 'Reason for visit (required)' },
        diagnosis: { type: 'string', description: 'Diagnosis (optional)' },
        treatment: { type: 'string', description: 'Treatment provided (optional)' },
        cost: { type: 'string', description: 'Visit cost (optional)' },
      },
      required: ['petId', 'visitDate', 'visitType', 'reason'],
    },
  },

  // Subscriptions
  {
    name: 'list_subscriptions',
    description: 'List all subscriptions',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_subscription',
    description: 'Add a new subscription to track',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Subscription name (required)' },
        subscriptionType: { type: 'string', description: 'Type: Streaming, Software, Health/Wellness, Shopping, Vehicle, Food, Gaming, News/Media, Music, Home, Finance, Pet Care (required)' },
        cost: { type: 'string', description: 'Cost amount, e.g. "15.99" (required)' },
        billingFrequency: { type: 'string', enum: ['weekly', 'monthly', 'quarterly', 'semi-annually', 'annually', 'one-time'], description: 'Billing frequency (required)' },
        companyName: { type: 'string', description: 'Company name (optional)' },
      },
      required: ['name', 'subscriptionType', 'cost', 'billingFrequency'],
    },
  },

  // Warranties
  {
    name: 'list_warranties',
    description: 'List all warranties',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_warranty',
    description: 'Add a new warranty to track',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Product name (required)' },
        warrantyType: { type: 'string', description: 'Type: Automotive, Appliance, Electronics, Tools, Furniture, Outdoor Gear, Home Features, Jewelry, Medical, Pet Products (required)' },
        purchaseDate: { type: 'string', description: 'Purchase date in MM/DD/YYYY format (optional)' },
        warrantyLengthValue: { type: 'number', description: 'Warranty length number (optional)' },
        warrantyLengthUnit: { type: 'string', enum: ['weeks', 'months', 'years'], description: 'Warranty length unit (optional)' },
        isLifetime: { type: 'boolean', description: 'True if lifetime warranty (optional)' },
      },
      required: ['name', 'warrantyType'],
    },
  },

  // Projects
  {
    name: 'list_projects',
    description: 'List all projects',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name (required)' },
        description: { type: 'string', description: 'Project description (optional)' },
        startDate: { type: 'string', description: 'Start date in MM/DD/YYYY format (required)' },
        targetCompletionDate: { type: 'string', description: 'Target completion date in MM/DD/YYYY format (optional)' },
        budget: { type: 'string', description: 'Budget amount (optional)' },
        status: { type: 'string', enum: ['planning', 'in_progress', 'on_hold', 'completed'], description: 'Project status (optional)' },
      },
      required: ['name', 'startDate'],
    },
  },

  // Companies
  {
    name: 'list_companies',
    description: 'List all companies/service providers',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_company',
    description: 'Add a new company/service provider',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Company name (required)' },
        serviceType: { type: 'string', description: 'Type: Plumber, Electrician, HVAC, Landscaping, Roofing, General Contractor, Pest Control, Cleaning Service, Pool/Spa Service, Appliance Repair, Handyman, Painting, Flooring, Tree Service, Septic/Sewer, Other (required)' },
        phone: { type: 'string', description: 'Phone number (optional)' },
        email: { type: 'string', description: 'Email address (optional)' },
        website: { type: 'string', description: 'Website URL (optional)' },
      },
      required: ['name', 'serviceType'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleTool(name, args) {
  switch (name) {
    // Appliances
    case 'list_appliances': {
      const events = await queryEvents([{ kinds: [KINDS.APPLIANCE], authors: [pubkey] }]);
      const appliances = events.map(parseAppliance).filter(a => a.id);
      return { content: [{ type: 'text', text: JSON.stringify(appliances, null, 2) }] };
    }

    case 'create_appliance': {
      const id = uuid();
      const tags = [
        ['d', id],
        ['alt', `Home appliance: ${args.model}`],
        ['model', args.model],
        ['manufacturer', args.manufacturer],
        ['purchase_date', args.purchaseDate],
        ['room', args.room],
      ];
      if (args.price) tags.push(['price', args.price]);

      await signAndPublish({ kind: KINDS.APPLIANCE, content: '', tags });
      return { content: [{ type: 'text', text: `Created appliance "${args.model}" with ID: ${id}` }] };
    }

    // Vehicles
    case 'list_vehicles': {
      const events = await queryEvents([{ kinds: [KINDS.VEHICLE], authors: [pubkey] }]);
      const vehicles = events.map(parseVehicle).filter(v => v.id);
      return { content: [{ type: 'text', text: JSON.stringify(vehicles, null, 2) }] };
    }

    case 'create_vehicle': {
      const id = uuid();
      const tags = [
        ['d', id],
        ['alt', `Vehicle: ${args.name}`],
        ['name', args.name],
        ['vehicle_type', args.vehicleType],
      ];
      if (args.make) tags.push(['make', args.make]);
      if (args.model) tags.push(['model', args.model]);
      if (args.year) tags.push(['year', args.year]);
      if (args.mileage) tags.push(['mileage', args.mileage]);

      await signAndPublish({ kind: KINDS.VEHICLE, content: '', tags });
      return { content: [{ type: 'text', text: `Created vehicle "${args.name}" with ID: ${id}` }] };
    }

    // Maintenance
    case 'list_maintenance': {
      const events = await queryEvents([{ kinds: [KINDS.MAINTENANCE], authors: [pubkey] }]);
      const maintenance = events.map(parseMaintenance).filter(m => m.id);
      return { content: [{ type: 'text', text: JSON.stringify(maintenance, null, 2) }] };
    }

    case 'create_maintenance': {
      if (!args.applianceId && !args.vehicleId && !args.homeFeature) {
        return { content: [{ type: 'text', text: 'Error: Must specify applianceId, vehicleId, or homeFeature' }], isError: true };
      }
      if (!args.isLogOnly && (!args.frequency || !args.frequencyUnit)) {
        return { content: [{ type: 'text', text: 'Error: frequency and frequencyUnit required unless isLogOnly is true' }], isError: true };
      }

      const id = uuid();
      const tags = [
        ['d', id],
        ['alt', `Maintenance schedule: ${args.description}`],
        ['description', args.description],
      ];

      if (args.applianceId) {
        tags.push(['a', `${KINDS.APPLIANCE}:${pubkey}:${args.applianceId}`, '', 'appliance']);
      }
      if (args.vehicleId) {
        tags.push(['a', `${KINDS.VEHICLE}:${pubkey}:${args.vehicleId}`, '', 'vehicle']);
      }
      if (args.homeFeature) {
        tags.push(['home_feature', args.homeFeature]);
      }
      if (!args.isLogOnly) {
        tags.push(['frequency', String(args.frequency)]);
        tags.push(['frequency_unit', args.frequencyUnit]);
      }
      if (args.isLogOnly) {
        tags.push(['is_log_only', 'true']);
      }
      if (args.mileageInterval) {
        tags.push(['mileage_interval', String(args.mileageInterval)]);
      }
      if (args.partName) {
        const partTag = ['part', args.partName];
        if (args.partNumber) partTag.push(args.partNumber);
        tags.push(partTag);
      }

      await signAndPublish({ kind: KINDS.MAINTENANCE, content: '', tags });
      return { content: [{ type: 'text', text: `Created maintenance "${args.description}" with ID: ${id}` }] };
    }

    case 'complete_maintenance': {
      const tags = [
        ['a', `${KINDS.MAINTENANCE}:${pubkey}:${args.maintenanceId}`, '', 'maintenance'],
        ['alt', `Maintenance completed on ${args.completedDate}`],
        ['completed_date', args.completedDate],
      ];
      if (args.notes) tags.push(['notes', args.notes]);
      if (args.mileage) tags.push(['mileage_at_completion', args.mileage]);

      const event = await signAndPublish({ kind: KINDS.MAINTENANCE_COMPLETION, content: '', tags });
      return { content: [{ type: 'text', text: `Logged maintenance completion with ID: ${event.id}` }] };
    }

    // Pets
    case 'list_pets': {
      const events = await queryEvents([{ kinds: [KINDS.PET], authors: [pubkey] }]);
      const pets = events.map(parsePet).filter(p => p.id);
      return { content: [{ type: 'text', text: JSON.stringify(pets, null, 2) }] };
    }

    case 'create_pet': {
      const id = uuid();
      const tags = [
        ['d', id],
        ['alt', `Pet: ${args.name}`],
        ['name', args.name],
        ['pet_type', args.petType],
      ];
      if (args.species) tags.push(['species', args.species]);
      if (args.breed) tags.push(['breed', args.breed]);
      if (args.birthDate) tags.push(['birth_date', args.birthDate]);
      if (args.weight) tags.push(['weight', args.weight]);

      await signAndPublish({ kind: KINDS.PET, content: '', tags });
      return { content: [{ type: 'text', text: `Created pet "${args.name}" with ID: ${id}` }] };
    }

    case 'log_vet_visit': {
      const tags = [
        ['a', `${KINDS.PET}:${pubkey}:${args.petId}`, '', 'pet'],
        ['alt', `Vet visit on ${args.visitDate}`],
        ['visit_date', args.visitDate],
        ['visit_type', args.visitType],
        ['reason', args.reason],
      ];
      if (args.diagnosis) tags.push(['diagnosis', args.diagnosis]);
      if (args.treatment) tags.push(['treatment', args.treatment]);
      if (args.cost) tags.push(['cost', args.cost]);

      const event = await signAndPublish({ kind: KINDS.VET_VISIT, content: '', tags });
      return { content: [{ type: 'text', text: `Logged vet visit with ID: ${event.id}` }] };
    }

    // Subscriptions
    case 'list_subscriptions': {
      const events = await queryEvents([{ kinds: [KINDS.SUBSCRIPTION], authors: [pubkey] }]);
      const subscriptions = events.map(parseSubscription).filter(s => s.id);
      return { content: [{ type: 'text', text: JSON.stringify(subscriptions, null, 2) }] };
    }

    case 'create_subscription': {
      const id = uuid();
      const tags = [
        ['d', id],
        ['alt', `Subscription: ${args.name}`],
        ['name', args.name],
        ['subscription_type', args.subscriptionType],
        ['cost', args.cost],
        ['billing_frequency', args.billingFrequency],
      ];
      if (args.companyName) tags.push(['company_name', args.companyName]);

      await signAndPublish({ kind: KINDS.SUBSCRIPTION, content: '', tags });
      return { content: [{ type: 'text', text: `Created subscription "${args.name}" with ID: ${id}` }] };
    }

    // Warranties
    case 'list_warranties': {
      const events = await queryEvents([{ kinds: [KINDS.WARRANTY], authors: [pubkey] }]);
      const warranties = events.map(parseWarranty).filter(w => w.id);
      return { content: [{ type: 'text', text: JSON.stringify(warranties, null, 2) }] };
    }

    case 'create_warranty': {
      const id = uuid();
      const tags = [
        ['d', id],
        ['alt', `Warranty: ${args.name}`],
        ['name', args.name],
        ['warranty_type', args.warrantyType],
      ];
      if (args.purchaseDate) tags.push(['purchase_date', args.purchaseDate]);
      if (args.warrantyLengthValue) tags.push(['warranty_length_value', String(args.warrantyLengthValue)]);
      if (args.warrantyLengthUnit) tags.push(['warranty_length_unit', args.warrantyLengthUnit]);
      if (args.isLifetime) tags.push(['is_lifetime', 'true']);

      await signAndPublish({ kind: KINDS.WARRANTY, content: '', tags });
      return { content: [{ type: 'text', text: `Created warranty for "${args.name}" with ID: ${id}` }] };
    }

    // Projects
    case 'list_projects': {
      const events = await queryEvents([{ kinds: [KINDS.PROJECT], authors: [pubkey] }]);
      const projects = events.map(parseProject).filter(p => p.id);
      return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] };
    }

    case 'create_project': {
      const id = uuid();
      const tags = [
        ['d', id],
        ['alt', `Project: ${args.name}`],
        ['name', args.name],
        ['start_date', args.startDate],
      ];
      if (args.description) tags.push(['description', args.description]);
      if (args.targetCompletionDate) tags.push(['target_completion_date', args.targetCompletionDate]);
      if (args.budget) tags.push(['budget', args.budget]);
      if (args.status) tags.push(['status', args.status]);

      await signAndPublish({ kind: KINDS.PROJECT, content: '', tags });
      return { content: [{ type: 'text', text: `Created project "${args.name}" with ID: ${id}` }] };
    }

    // Companies
    case 'list_companies': {
      const events = await queryEvents([{ kinds: [KINDS.COMPANY], authors: [pubkey] }]);
      const companies = events.map(parseCompany).filter(c => c.id);
      return { content: [{ type: 'text', text: JSON.stringify(companies, null, 2) }] };
    }

    case 'create_company': {
      const id = uuid();
      const tags = [
        ['d', id],
        ['alt', `Company: ${args.name}`],
        ['name', args.name],
        ['service_type', args.serviceType],
      ];
      if (args.phone) tags.push(['phone', args.phone]);
      if (args.email) tags.push(['email', args.email]);
      if (args.website) tags.push(['website', args.website]);

      await signAndPublish({ kind: KINDS.COMPANY, content: '', tags });
      return { content: [{ type: 'text', text: `Created company "${args.name}" with ID: ${id}` }] };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: 'cypherlog',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`[MCP] Tool called: ${name}`);
  
  try {
    return await handleTool(name, args || {});
  } catch (error) {
    console.error(`[MCP] Error in ${name}:`, error);
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  try {
    initializeKeys();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('[MCP] Cypher Log MCP server started');
  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    process.exit(1);
  }
}

main();
