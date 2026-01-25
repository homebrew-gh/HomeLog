import { useAppliances } from './useAppliances';
import { useMaintenance } from './useMaintenance';
import { useVehicles } from './useVehicles';
import { useCompanies } from './useCompanies';
import type { TabId } from '@/contexts/TabPreferencesContext';

export interface TabDataInfo {
  hasData: boolean;
  count: number;
  itemName: string; // singular
  itemNamePlural: string; // plural
}

/**
 * Hook to check if a tab has data that would prevent deletion
 */
export function useTabData(tabId: TabId): TabDataInfo {
  const { data: appliances = [] } = useAppliances();
  const { data: maintenance = [] } = useMaintenance();
  const { data: vehicles = [] } = useVehicles();
  const { data: companies = [] } = useCompanies();

  switch (tabId) {
    case 'appliances':
      return {
        hasData: appliances.length > 0,
        count: appliances.length,
        itemName: 'appliance',
        itemNamePlural: 'appliances',
      };

    case 'maintenance':
      return {
        hasData: maintenance.length > 0,
        count: maintenance.length,
        itemName: 'maintenance schedule',
        itemNamePlural: 'maintenance schedules',
      };

    case 'vehicles':
      return {
        hasData: vehicles.length > 0,
        count: vehicles.length,
        itemName: 'vehicle',
        itemNamePlural: 'vehicles',
      };

    case 'companies':
      return {
        hasData: companies.length > 0,
        count: companies.length,
        itemName: 'company',
        itemNamePlural: 'companies',
      };

    // These tabs don't have data yet (coming soon)
    case 'subscriptions':
      return {
        hasData: false,
        count: 0,
        itemName: 'subscription',
        itemNamePlural: 'subscriptions',
      };

    case 'warranties':
      return {
        hasData: false,
        count: 0,
        itemName: 'warranty',
        itemNamePlural: 'warranties',
      };

    case 'projects':
      return {
        hasData: false,
        count: 0,
        itemName: 'project',
        itemNamePlural: 'projects',
      };

    default:
      return {
        hasData: false,
        count: 0,
        itemName: 'item',
        itemNamePlural: 'items',
      };
  }
}

/**
 * Hook to get data info for all active tabs
 */
export function useAllTabsData(tabIds: TabId[]): Record<TabId, TabDataInfo> {
  const { data: appliances = [] } = useAppliances();
  const { data: maintenance = [] } = useMaintenance();
  const { data: vehicles = [] } = useVehicles();
  const { data: companies = [] } = useCompanies();

  const result: Record<string, TabDataInfo> = {};

  for (const tabId of tabIds) {
    switch (tabId) {
      case 'appliances':
        result[tabId] = {
          hasData: appliances.length > 0,
          count: appliances.length,
          itemName: 'appliance',
          itemNamePlural: 'appliances',
        };
        break;

      case 'maintenance':
        result[tabId] = {
          hasData: maintenance.length > 0,
          count: maintenance.length,
          itemName: 'maintenance schedule',
          itemNamePlural: 'maintenance schedules',
        };
        break;

      case 'vehicles':
        result[tabId] = {
          hasData: vehicles.length > 0,
          count: vehicles.length,
          itemName: 'vehicle',
          itemNamePlural: 'vehicles',
        };
        break;

      case 'companies':
        result[tabId] = {
          hasData: companies.length > 0,
          count: companies.length,
          itemName: 'company',
          itemNamePlural: 'companies',
        };
        break;

      default:
        result[tabId] = {
          hasData: false,
          count: 0,
          itemName: 'item',
          itemNamePlural: 'items',
        };
    }
  }

  return result as Record<TabId, TabDataInfo>;
}
