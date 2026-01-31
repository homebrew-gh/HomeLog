import { useMemo } from 'react';
import { useAppliances } from './useAppliances';
import { useVehicles } from './useVehicles';
import { useCompanies } from './useCompanies';
import { useSubscriptions } from './useSubscriptions';
import { useWarranties } from './useWarranties';
import { useMaintenance } from './useMaintenance';
import { usePets } from './usePets';
import { useProjects } from './useProjects';
import type { 
  Appliance, 
  Vehicle, 
  Company, 
  Subscription, 
  Warranty, 
  MaintenanceSchedule,
  Pet,
  Project,
} from '@/lib/types';

// Search result types - extensible for future data types
export type SearchResultType = 
  | 'appliance' 
  | 'vehicle' 
  | 'company' 
  | 'subscription' 
  | 'warranty' 
  | 'maintenance'
  | 'pet'
  | 'project';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  item: Appliance | Vehicle | Company | Subscription | Warranty | MaintenanceSchedule | Pet | Project;
}

export interface GroupedSearchResults {
  appliances: SearchResult[];
  vehicles: SearchResult[];
  companies: SearchResult[];
  subscriptions: SearchResult[];
  warranties: SearchResult[];
  maintenance: SearchResult[];
  pets: SearchResult[];
  projects: SearchResult[];
}

// Search helper - checks if any field contains the query
function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const q = query.toLowerCase();
  return fields.some(field => field?.toLowerCase().includes(q));
}

// Individual search functions - easy to extend or modify

function searchAppliances(appliances: Appliance[], query: string): SearchResult[] {
  return appliances
    .filter(a => !a.isArchived && matchesQuery(
      query,
      a.model,
      a.manufacturer,
      a.room,
      a.purchaseDate,
      a.price
    ))
    .map(a => ({
      type: 'appliance' as const,
      id: a.id,
      title: a.model,
      subtitle: a.manufacturer,
      meta: a.room,
      item: a,
    }));
}

function searchVehicles(vehicles: Vehicle[], query: string): SearchResult[] {
  return vehicles
    .filter(v => !v.isArchived && matchesQuery(
      query,
      v.name,
      v.make,
      v.model,
      v.year,
      v.licensePlate,
      v.vehicleType,
      v.notes,
      v.purchaseDate,
      v.purchasePrice,
      v.purchaseLocation,
      v.mileage,
      v.fuelType,
      v.registrationExpiry,
      v.hullId,
      v.registrationNumber,
      v.engineHours,
      v.tailNumber,
      v.hobbsTime,
      v.serialNumber,
      v.warrantyExpiry
    ))
    .map(v => ({
      type: 'vehicle' as const,
      id: v.id,
      title: v.name,
      subtitle: [v.make, v.model, v.year].filter(Boolean).join(' '),
      meta: v.vehicleType,
      item: v,
    }));
}

function searchCompanies(companies: Company[], query: string): SearchResult[] {
  return companies
    .filter(c => matchesQuery(
      query,
      c.name,
      c.contactName,
      c.serviceType,
      c.phone,
      c.email,
      c.notes,
      c.address,
      c.city,
      c.state,
      c.zipCode,
      c.website,
      c.licenseNumber,
      c.insuranceInfo
    ))
    .map(c => ({
      type: 'company' as const,
      id: c.id,
      title: c.name,
      subtitle: c.serviceType,
      meta: c.contactName,
      item: c,
    }));
}

function searchSubscriptions(subscriptions: Subscription[], query: string): SearchResult[] {
  return subscriptions
    .filter(s => !s.isArchived && matchesQuery(
      query,
      s.name,
      s.subscriptionType,
      s.companyName,
      s.notes,
      s.linkedAssetName,
      s.cost,
      s.currency,
      s.billingFrequency
    ))
    .map(s => ({
      type: 'subscription' as const,
      id: s.id,
      title: s.name,
      subtitle: s.subscriptionType,
      meta: s.cost,
      item: s,
    }));
}

function searchWarranties(warranties: Warranty[], query: string): SearchResult[] {
  return warranties
    .filter(w => !w.isArchived && matchesQuery(
      query,
      w.name,
      w.warrantyType,
      w.description,
      w.companyName,
      w.linkedItemName,
      w.notes,
      w.purchaseDate,
      w.purchasePrice,
      w.registrationNumber,
      w.registrationNotes,
      w.extendedWarrantyProvider,
      w.extendedWarrantyNotes
    ))
    .map(w => ({
      type: 'warranty' as const,
      id: w.id,
      title: w.name,
      subtitle: w.warrantyType,
      meta: w.warrantyEndDate ? `Expires: ${w.warrantyEndDate}` : undefined,
      item: w,
    }));
}

// Flatten maintenance parts into searchable strings
function getMaintenanceSearchStrings(m: MaintenanceSchedule): (string | undefined)[] {
  const partStrings = m.parts?.flatMap(p => [p.name, p.partNumber, p.cost].filter(Boolean)) ?? [];
  const frequencyStr = m.frequency != null && m.frequencyUnit
    ? `${m.frequency} ${m.frequencyUnit}`
    : undefined;
  return [m.description, m.partNumber, m.homeFeature, frequencyStr, ...partStrings];
}

function searchMaintenance(maintenance: MaintenanceSchedule[], query: string): SearchResult[] {
  return maintenance
    .filter(m => !m.isArchived && matchesQuery(query, ...getMaintenanceSearchStrings(m)))
    .map(m => ({
      type: 'maintenance' as const,
      id: m.id,
      title: m.description,
      subtitle: m.homeFeature || (m.partNumber ? `Part: ${m.partNumber}` : undefined),
      meta: `Every ${m.frequency} ${m.frequencyUnit}`,
      item: m,
    }));
}

function searchPets(pets: Pet[], query: string): SearchResult[] {
  return pets
    .filter(p => !p.isArchived && matchesQuery(
      query,
      p.name,
      p.petType,
      p.species,
      p.breed,
      p.birthDate,
      p.adoptionDate,
      p.weight,
      p.color,
      p.microchipId,
      p.licenseNumber,
      p.vetClinic,
      p.vetPhone,
      p.allergies,
      p.medications,
      p.medicalConditions,
      p.lastVetVisit,
      p.notes
    ))
    .map(p => ({
      type: 'pet' as const,
      id: p.id,
      title: p.name,
      subtitle: [p.species, p.breed].filter(Boolean).join(' • '),
      meta: p.petType,
      item: p,
    }));
}

function searchProjects(projects: Project[], query: string): SearchResult[] {
  return projects
    .filter(p => !p.isArchived && matchesQuery(
      query,
      p.name,
      p.description,
      p.startDate,
      p.status,
      p.budget,
      p.completionDate,
      p.targetCompletionDate,
      p.notes
    ))
    .map(p => ({
      type: 'project' as const,
      id: p.id,
      title: p.name,
      subtitle: p.description,
      meta: p.status,
      item: p,
    }));
}

/**
 * Global search hook that searches across all data types.
 * 
 * Easy to extend - just add new hooks and search functions for new data types.
 * 
 * @param query - Search query string
 * @returns Grouped search results by type
 */
export function useGlobalSearch(query: string): {
  results: GroupedSearchResults;
  totalCount: number;
  isLoading: boolean;
  hasQuery: boolean;
} {
  // Pull data from all existing hooks
  const { data: appliances = [], isLoading: appliancesLoading } = useAppliances();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useSubscriptions();
  const { data: warranties = [], isLoading: warrantiesLoading } = useWarranties();
  const { data: maintenance = [], isLoading: maintenanceLoading } = useMaintenance();
  const { data: pets = [], isLoading: petsLoading } = usePets();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  const isLoading = appliancesLoading || vehiclesLoading || companiesLoading || 
                    subscriptionsLoading || warrantiesLoading || maintenanceLoading ||
                    petsLoading || projectsLoading;

  const hasQuery = query.trim().length > 0;

  const results = useMemo<GroupedSearchResults>(() => {
    if (!hasQuery) {
      return {
        appliances: [],
        vehicles: [],
        companies: [],
        subscriptions: [],
        warranties: [],
        maintenance: [],
        pets: [],
        projects: [],
      };
    }

    const q = query.trim();

    return {
      appliances: searchAppliances(appliances, q),
      vehicles: searchVehicles(vehicles, q),
      companies: searchCompanies(companies, q),
      subscriptions: searchSubscriptions(subscriptions, q),
      warranties: searchWarranties(warranties, q),
      maintenance: searchMaintenance(maintenance, q),
      pets: searchPets(pets, q),
      projects: searchProjects(projects, q),
    };
  }, [query, hasQuery, appliances, vehicles, companies, subscriptions, warranties, maintenance, pets, projects]);

  const totalCount = useMemo(() => {
    return (
      results.appliances.length +
      results.vehicles.length +
      results.companies.length +
      results.subscriptions.length +
      results.warranties.length +
      results.maintenance.length +
      results.pets.length +
      results.projects.length
    );
  }, [results]);

  return {
    results,
    totalCount,
    isLoading,
    hasQuery,
  };
}

/**
 * Get a flat list of all search results (useful for simple list rendering)
 */
export function useFlatSearchResults(query: string): {
  results: SearchResult[];
  isLoading: boolean;
  hasQuery: boolean;
} {
  const { results, isLoading, hasQuery } = useGlobalSearch(query);

  const flatResults = useMemo(() => {
    return [
      ...results.appliances,
      ...results.vehicles,
      ...results.companies,
      ...results.subscriptions,
      ...results.warranties,
      ...results.maintenance,
      ...results.pets,
      ...results.projects,
    ];
  }, [results]);

  return {
    results: flatResults,
    isLoading,
    hasQuery,
  };
}
