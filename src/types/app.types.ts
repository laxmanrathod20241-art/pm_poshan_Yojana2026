import type { Database } from './database.types';

export type StandardGroup = 'primary' | 'upper_primary';

export interface InventoryItem extends Omit<Database['public']['Tables']['inventory_stock']['Row'], 'standard_group'> {
  standard_group: StandardGroup;
}

export interface DailyLog extends Omit<Database['public']['Tables']['consumption_logs']['Row'], 'standard_group'> {
  standard_group: StandardGroup;
}

export interface Report extends Omit<Database['public']['Tables']['monthly_reports']['Row'], 'standard_group'> {
  standard_group: StandardGroup;
}
