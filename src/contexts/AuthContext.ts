import React, { createContext } from 'react';

// Mock types since we uninstalled the cloud client
export type Session = { access_token: string, user: User };
export type User = { 
  id: string; 
  email: string; 
  role?: string;
  first_name?: string;
  last_name?: string;
  school_name?: string;
  school_id?: string;
  school_name_mr?: string;
  center_name_mr?: string;
  has_primary?: boolean;
  has_upper_primary?: boolean;
  is_onboarded?: boolean;
  onboarding_step?: number;
  saas_payment_status?: string;
  saas_plan_type?: string;
  saas_expiry_date?: string;
  saas_amount_paid?: number;
  mobile_number?: string;
};

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: string | null;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  role: null,
  refreshProfile: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
