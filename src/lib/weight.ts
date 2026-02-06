/**
 * Weight unit conversion and formatting (kg / lb).
 * Used with user preferences for entry and display units.
 */

export type WeightUnit = 'kg' | 'lb';

export const KG_TO_LB = 2.2046226218;

/** Parse a weight string (e.g. "45 lbs", "20 kg", "12.5") into value and unit */
export function parseWeight(str: string): { value: number; unit: WeightUnit } | null {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  // Match number (with optional decimal) and optional unit (kg, lb, lbs)
  const match = trimmed.match(/^([\d.,]+)\s*(kg|lbs?|lb)?$/i);
  if (!match) return null;
  const numStr = match[1].replace(',', '.');
  const value = parseFloat(numStr);
  if (Number.isNaN(value) || value < 0) return null;
  const unitPart = (match[2] || '').toLowerCase();
  const unit: WeightUnit = unitPart.startsWith('k') ? 'kg' : 'lb';
  return { value, unit };
}

/** Convert a weight value from one unit to another */
export function convertWeight(value: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'kg' && toUnit === 'lb') return value * KG_TO_LB;
  return value / KG_TO_LB;
}

/** Format a weight value with unit label (e.g. "45 lb", "20.4 kg") */
export function formatWeight(value: number, unit: WeightUnit, decimals = 1): string {
  const rounded = value % 1 === 0 ? Math.round(value) : Number(value.toFixed(decimals));
  return unit === 'kg' ? `${rounded} kg` : `${rounded} lb`;
}

/** Get display label for unit */
export function getWeightUnitLabel(unit: WeightUnit): string {
  return unit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)';
}
