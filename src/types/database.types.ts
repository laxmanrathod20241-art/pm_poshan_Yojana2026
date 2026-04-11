export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      daily_logs: {
        Row: {
          id: string
          teacher_id: string
          log_date: string
          meals_served_primary: number
          meals_served_upper_primary: number
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          log_date?: string
          meals_served_primary: number
          meals_served_upper_primary: number
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          log_date?: string
          meals_served_primary?: number
          meals_served_upper_primary?: number
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          role: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          email: string
          role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: string | null
          first_name?: string | null
          last_name?: string | null
          school_name?: string | null
          school_id?: string | null
          school_name_mr?: string | null
          center_name_mr?: string | null
          created_at?: string | null
        }
      }
      menu_master: {
        Row: {
          id: string
          teacher_id: string
          item_name: string
          item_code: string
          grams_primary: number
          grams_upper_primary: number | null
          item_category: string | null
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          item_name: string
          item_code: string
          grams_primary: number
          grams_upper_primary?: number | null
          item_category?: string | null
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          item_name?: string
          item_code?: string
          grams_primary?: number
          grams_upper_primary?: number | null
          item_category?: string | null
          source?: string | null
          created_at?: string
        }
      }
      stock_receipts: {
        Row: {
          id: string
          teacher_id: string
          item_name: string
          quantity_kg: number
          receipt_date: string
          bill_no: string | null
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          item_name: string
          quantity_kg: number
          receipt_date: string
          bill_no?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          item_name?: string
          quantity_kg?: number
          receipt_date?: string
          bill_no?: string | null
          created_at?: string
        }
      }
      inventory_stock: {
        Row: {
          id: string
          teacher_id: string
          item_name: string
          item_code: string | null
          current_balance: number
          created_at: string | null
        }
        Insert: {
          id?: string
          teacher_id: string
          item_name: string
          item_code?: string | null
          current_balance: number
          created_at?: string | null
        }
        Update: {
          id?: string
          teacher_id?: string
          item_name?: string
          item_code?: string | null
          current_balance?: number
          created_at?: string | null
        }
      }
      consumption_logs: {
        Row: {
          id: string
          teacher_id: string
          log_date: string
          meals_served_primary: number
          meals_served_upper_primary: number
          main_food: string | null
          main_foods_all: string[] | null
          ingredients_used: string[] | null
          is_overridden: boolean | null
          original_template: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          log_date: string
          meals_served_primary: number
          meals_served_upper_primary: number
          main_food?: string | null
          main_foods_all?: string[] | null
          ingredients_used?: string[] | null
          is_overridden?: boolean | null
          original_template?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          log_date?: string
          meals_served_primary?: number
          meals_served_upper_primary?: number
          main_food?: string | null
          main_foods_all?: string[] | null
          ingredients_used?: string[] | null
          is_overridden?: boolean | null
          original_template?: Json | null
          created_at?: string
        }
      }
      monthly_reports: {
        Row: {
          id: string
          teacher_id: string
          report_month: number
          report_year: number
          report_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          report_month: number
          report_year: number
          report_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          report_month?: number
          report_year?: number
          report_data?: Json | null
          created_at?: string
        }
      }
      global_food_master: {
        Row: {
          code: string
          name: string
          name_en: string | null
          item_category: string | null
          created_at: string | null
        }
        Insert: {
          code: string
          name: string
          name_en?: string | null
          item_category?: string | null
          created_at?: string | null
        }
        Update: {
          code?: string
          name?: string
          name_en?: string | null
          item_category?: string | null
          created_at?: string | null
        }
      }
      local_food_master: {
        Row: {
          id: string
          teacher_id: string
          local_code: string
          name: string
          name_en: string | null
          item_category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          local_code: string
          name: string
          name_en?: string | null
          item_category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          local_code?: string
          name?: string
          name_en?: string | null
          item_category?: string | null
          created_at?: string
        }
      }
      cooking_staff: {
        Row: {
          id: string
          teacher_id: string
          staff_name: string
          post_name: string
          monthly_cost: number
          record_month: number
          record_year: number
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          staff_name: string
          post_name: string
          monthly_cost: number
          record_month: number
          record_year: number
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          staff_name?: string
          post_name?: string
          monthly_cost?: number
          record_month?: number
          record_year?: number
          created_at?: string
        }
      }
      fuel_tracking: {
        Row: {
          id: string
          teacher_id: string
          fuel_type: string
          monthly_cost: number
          record_month: number
          record_year: number
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          fuel_type: string
          monthly_cost: number
          record_month: number
          record_year: number
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          fuel_type?: string
          monthly_cost?: number
          record_month?: number
          record_year?: number
          created_at?: string
        }
      }
      menu_weekly_schedule: {
        Row: {
          id: string
          teacher_id: string
          day_name: string
          week_pattern: string
          main_food_codes: string[] | null
          menu_items: string[] | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          day_name: string
          week_pattern: string
          main_food_codes?: string[] | null
          menu_items?: string[] | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          day_name?: string
          week_pattern?: string
          main_food_codes?: string[] | null
          menu_items?: string[] | null
          is_active?: boolean
          created_at?: string
        }
      }
      student_enrollment: {
        Row: {
          id: string
          teacher_id: string
          std_1: number | null
          std_2: number | null
          std_3: number | null
          std_4: number | null
          std_5: number | null
          std_6: number | null
          std_7: number | null
          std_8: number | null
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          std_1?: number | null
          std_2?: number | null
          std_3?: number | null
          std_4?: number | null
          std_5?: number | null
          std_6?: number | null
          std_7?: number | null
          std_8?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          std_1?: number | null
          std_2?: number | null
          std_3?: number | null
          std_4?: number | null
          std_5?: number | null
          std_6?: number | null
          std_7?: number | null
          std_8?: number | null
          created_at?: string
        }
      }
      system_modules: {
        Row: {
          id: string
          module_name: string
          route_path: string
          icon_name: string
          is_active_for_teachers: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          module_name: string
          route_path: string
          icon_name: string
          is_active_for_teachers?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          module_name?: string
          route_path?: string
          icon_name?: string
          is_active_for_teachers?: boolean | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
