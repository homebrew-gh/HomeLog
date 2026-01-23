import { useAppliances } from './useAppliances';
import { useMaintenance } from './useMaintenance';
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

    // These tabs don't have data yet (coming soon)
    case 'vehicles':
      return {
        hasData: false,
        count: 0,
        itemName: 'vehicle',
        itemNamePlural: 'vehicles',
      };

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

    case 'contractors':
      return {
        hasData: false,
        count: 0,
        itemName: 'contractor',
        itemNamePlural: 'contractors',
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
