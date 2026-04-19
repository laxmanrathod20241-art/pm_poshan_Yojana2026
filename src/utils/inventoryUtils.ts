import { api } from '../lib/apiClient';
import type { Database } from '../types/database.types';

type StockReceipt = Database['public']['Tables']['stock_receipts']['Row'];
type ConsumptionLog = Database['public']['Tables']['consumption_logs']['Row'];

interface MenuItemSnippet {
  item_name: string;
  item_code: string;
  grams_primary: number;
  grams_upper_primary: number | null;
}

/**
 * Calculates the consumed weight in KG for a given item and population.
 */
export const calculateConsumedKg = (
  primaryCount: number,
  upperCount: number,
  gramsPrimary: number,
  gramsUpper: number,
  scope?: 'primary' | 'upper_primary'
): number => {
  if (scope === 'primary') return (primaryCount * gramsPrimary) / 1000;
  if (scope === 'upper_primary') return (upperCount * (gramsUpper || 0)) / 1000;
  const totalGrams = (primaryCount * gramsPrimary) + (upperCount * (gramsUpper || 0));
  return totalGrams / 1000;
};

/**
 * Returns the start of the financial year (April 1st) for a given date.
 */
export const getFinancialYearStart = (dateStr: string): string => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed, 3 = April
  
  if (month >= 3) { // April or later
    return `${year}-04-01`;
  } else { // Jan, Feb, March
    return `${year - 1}-04-01`;
  }
};

/**
 * Reconstructs the opening balance for a set of items as of a specific date.
 * Logic: SUM(Receipts before date) - SUM(Consumption before date)
 * Constraints: Only considers data within the same financial year (April - March).
 */
export const reconstructOpeningBalances = async (
  teacherId: string,
  cutoffDate: string,
  items: MenuItemSnippet[],
  standardGroup?: 'primary' | 'upper_primary'
): Promise<Record<string, number>> => {
  const codeToBalance: Record<string, number> = {};
  const nameToCode: Record<string, string> = {};
  items.forEach(item => {
    nameToCode[item.item_name] = item.item_code;
  });

  const fyStart = getFinancialYearStart(cutoffDate);

  try {
    const [receiptsRes, consumptionRes] = await Promise.all([
      api
        .from('stock_receipts')
        .select('item_name, item_code, quantity_kg')
        .eq('teacher_id', teacherId)
        .gte('receipt_date', fyStart)
        .lt('receipt_date', cutoffDate),
      api
        .from('consumption_logs')
        .select('meals_served_primary, meals_served_upper_primary, main_foods_all, ingredients_used, standard_group')
        .eq('teacher_id', teacherId)
        .gte('log_date', fyStart)
        .lt('log_date', cutoffDate)
        .or(standardGroup ? `standard_group.eq.${standardGroup},standard_group.is.null` : 'standard_group.is.null,standard_group.neq.null')
    ]);

    // 1. Initial Sum of Receipts (Prefer Code)
    (receiptsRes.data as StockReceipt[] || []).forEach(r => {
      const code = r.item_code || nameToCode[r.item_name] || r.item_name;
      codeToBalance[code] = (codeToBalance[code] || 0) + Number(r.quantity_kg);
    });

    // 2. Subtract Historically Calculated Consumption
    (consumptionRes.data as ConsumptionLog[] || []).forEach(log => {
      const pAtt = Number(log.meals_served_primary) || 0;
      const uAtt = Number(log.meals_served_upper_primary) || 0;
      const usedItems = Array.from(new Set([
        ...(log.main_foods_all || []),
        ...(log.ingredients_used || [])
      ])).filter(Boolean);

      usedItems.forEach((itemName: string) => {
        const itemMaster = items.find(m => m.item_name === itemName || m.item_code === itemName);
        if (itemMaster) {
          const kg = calculateConsumedKg(
            pAtt,
            uAtt,
            itemMaster.grams_primary || 0,
            itemMaster.grams_upper_primary || 0,
            standardGroup || (log as any).standard_group
          );
          const code = itemMaster.item_code;
          codeToBalance[code] = (codeToBalance[code] || 0) - kg;
        }
      });
    });
  } catch (error) {
    console.error('Error during historical reconstruction:', error);
  }

  // Convert back to Name-based for the consumer (which expects item names as keys)
  const nameBalances: Record<string, number> = {};
  items.forEach(item => {
    nameBalances[item.item_name] = codeToBalance[item.item_code] || 0;
  });

  return nameBalances;
};

/**
 * Returns formatted date string in YYYY-MM-DD
 */
export const formatDateSafely = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Universal quantity formatter for PM-POSHAN reporting.
 * - Standard items: 3 decimal places (e.g. 5.250 KG)
 * - Micro-quantities (spices): up to 5 decimal places (e.g. 0.00024 KG)
 * - Zero values: Display as dash or 0.000 based on context
 */
export const formatQuantity = (val: number | string | null | undefined, zeroAsDash = false): string => {
  const num = Number(val || 0);
  if (num === 0) return zeroAsDash ? '-' : '0.000';
  
  if (num > 0 && num < 0.001) {
    return num.toFixed(5);
  }
  return num.toFixed(3);
};

/**
 * Converts KG values to descriptive Marathi words for Grams.
 * Used for making MDM quantities instantly readable for teachers.
 */
export const getMarathiQuantityWord = (kgValue: number | string | undefined | null): string => {
  if (kgValue === undefined || kgValue === null) return "";
  const num = Number(kgValue);
  if (num === 0) return "";

  // Standard MDM Mappings (Normalized to Grams for comparison)
  // We use round to handle floating point precision issues
  const grams = Math.round(num * 10000) / 10; 
  const gramsStr = grams.toString();

  const exactMap: Record<string, string> = {
    "100": "शंभर ग्रॅम",
    "50": "पन्नास ग्रॅम",
    "20": "वीस ग्रॅम",
    "10": "दहा ग्रॅम",
    "5": "पाच ग्रॅम",
    "1": "एक ग्रॅम",
    "4.2": "चार दशांश दोन ग्रॅम",
    "1.3": "एक दशांश तीन ग्रॅम",
    "0.2": "शून्य दशांश दोन ग्रॅम",
  };

  if (exactMap[gramsStr]) return exactMap[gramsStr];

  // Fallback: Use Devanagari Numerals
  const digitsMap: Record<string, string> = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९', '.': '.'
  };
  
  // Format to max 2 decimal places, remove trailing .00
  const devanagariValue = grams.toFixed(2).replace(/\.00$/, '').split('').map(c => digitsMap[c] || c).join('');
  return `${devanagariValue} ग्रॅम`;
};

/**
 * Fetches the current live stock balance for all items, respecting financial year boundaries.
 */
export const getCurrentStock = async (
  teacherId: string,
  items: MenuItemSnippet[],
  standardGroup?: 'primary' | 'upper_primary'
): Promise<Record<string, number>> => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const cutoff = tomorrow.toISOString().split('T')[0];
  return reconstructOpeningBalances(teacherId, cutoff, items, standardGroup);
};
