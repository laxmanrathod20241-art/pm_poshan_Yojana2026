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
          created_at?: string | null
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
