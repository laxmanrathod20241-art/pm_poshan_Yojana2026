import { supabase } from '../lib/supabaseClient';
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
 * Reconstructs the opening balance for a set of items as of a specific date.
 * Logic: SUM(Receipts before date) - SUM(Consumption before date)
 */
export const reconstructOpeningBalances = async (
  teacherId: string,
  cutoffDate: string,
  items: MenuItemSnippet[],
  standardGroup?: 'primary' | 'upper_primary'
): Promise<Record<string, number>> => {
  const balances: Record<string, number> = {};

  try {
    const [receiptsRes, consumptionRes] = await Promise.all([
      supabase
        .from('stock_receipts')
        .select('item_name, quantity_kg')
        .eq('teacher_id', teacherId)
        .lt('receipt_date', cutoffDate),
      supabase
        .from('consumption_logs')
        .select('meals_served_primary, meals_served_upper_primary, main_foods_all, ingredients_used, standard_group')
        .eq('teacher_id', teacherId)
        .lt('log_date', cutoffDate)
        .or(standardGroup ? `standard_group.eq.${standardGroup},standard_group.is.null` : 'standard_group.is.null,standard_group.neq.null')
    ]);

    // 1. Initial Sum of Receipts
    (receiptsRes.data as StockReceipt[] || []).forEach(r => {
      balances[r.item_name] = (balances[r.item_name] || 0) + Number(r.quantity_kg);
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
          balances[itemName] = (balances[itemName] || 0) - kg;
        }
      });
    });
  } catch (error) {
    console.error('Error during historical reconstruction:', error);
  }

  return balances;
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
