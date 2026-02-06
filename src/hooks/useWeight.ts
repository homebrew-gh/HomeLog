import { useCallback } from 'react';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import {
  parseWeight,
  convertWeight,
  formatWeight,
  getWeightUnitLabel,
} from '@/lib/weight';

/**
 * Hook for weight display and entry preferences.
 * - entryWeightUnit: default unit for form inputs
 * - displayWeightUnit: unit for displaying weights (converted when different from stored)
 * - formatForDisplay: parse stored weight string, convert to display unit, format
 * - entryPlaceholder: placeholder hint for weight inputs (e.g. "e.g. 22 lb")
 */
export function useWeight() {
  const { preferences, setEntryWeightUnit, setDisplayWeightUnit } = useUserPreferences();

  const entryWeightUnit = preferences.entryWeightUnit;
  const displayWeightUnit = preferences.displayWeightUnit;

  /**
   * Format a stored weight string for display using the user's display unit.
   * Parses the string (e.g. "45 lbs", "20 kg"), converts to display unit if needed, and formats.
   * Returns the original string if it cannot be parsed.
   */
  const formatForDisplay = useCallback(
    (value: string | undefined): string => {
      if (value === undefined || value === null || value === '') return '';
      const parsed = parseWeight(value);
      if (!parsed) return value;
      const converted = convertWeight(parsed.value, parsed.unit, displayWeightUnit);
      return formatWeight(converted, displayWeightUnit);
    },
    [displayWeightUnit]
  );

  /** Placeholder text for weight input fields (e.g. "e.g. 22 lb" or "e.g. 10 kg") */
  const entryPlaceholder = entryWeightUnit === 'kg' ? 'e.g. 10 kg' : 'e.g. 22 lb';

  return {
    entryWeightUnit,
    displayWeightUnit,
    setEntryWeightUnit,
    setDisplayWeightUnit,
    formatForDisplay,
    entryPlaceholder,
    getWeightUnitLabel,
  };
}
