import { useMemo } from 'react';
import { useVehicles } from './useVehicles';
import { useWarranties } from './useWarranties';
import { useAppliances } from './useAppliances';
import { usePets } from './usePets';
import { useCompanies } from './useCompanies';
import { useVetVisits } from './useVetVisits';
import { useCompanyWorkLogs } from './useCompanyWorkLogs';
import { useAllProjectEntries } from './useProjectEntries';
import { useAllProjectResearch } from './useProjectResearch';
import { collectBlossomUrlsFromData } from '@/lib/blossomSync';

/**
 * Collects all Blossom-style file URLs referenced in the app's data
 * (vehicles, warranties, appliances, pets, companies, vet visits, work logs, project entries/research).
 * Returns deduplicated list by content hash so sync only uploads each unique file once.
 */
export function useAllBlossomUrls(): string[] {
  const { data: vehicles = [] } = useVehicles();
  const { data: warranties = [] } = useWarranties();
  const { data: appliances = [] } = useAppliances();
  const { data: pets = [] } = usePets();
  const { data: companies = [] } = useCompanies();
  const { data: vetVisits = [] } = useVetVisits();
  const { data: companyWorkLogs = [] } = useCompanyWorkLogs();
  const { data: projectEntries = [] } = useAllProjectEntries();
  const { data: projectResearchNotes = [] } = useAllProjectResearch();

  return useMemo(
    () =>
      collectBlossomUrlsFromData({
        vehicles,
        warranties,
        appliances,
        pets,
        companies,
        vetVisits,
        companyWorkLogs,
        projectEntries,
        projectResearchNotes,
      }),
    [
      vehicles,
      warranties,
      appliances,
      pets,
      companies,
      vetVisits,
      companyWorkLogs,
      projectEntries,
      projectResearchNotes,
    ]
  );
}
