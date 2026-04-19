// PM-POSHAN Tracker: Local API Client
// This replaces the Supabase client but keeps the syntax compatible
// to avoid breaking all your dashboard components.

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

type Unwrapped<T> = T extends Array<infer U> ? U : T;

class LocalQueryBuilder<T = any> {
  private table: string;
  private action: 'SELECT' | 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE' = 'SELECT';
  private payload: any = null;
  private filters: Record<string, any> = {};
  private range: { start?: string; end?: string; col?: string } = {};
  private isSingleResult = false;

  constructor(table: string, isSingle = false) {
    this.table = table;
    this.isSingleResult = isSingle;
  }

  single(): LocalQueryBuilder<Unwrapped<T>> {
    this.isSingleResult = true;
    return this as any;
  }

  maybeSingle(): LocalQueryBuilder<Unwrapped<T> | null> {
    this.isSingleResult = true;
    return this as any;
  }

  select<U = any>(_columns: string = '*'): LocalQueryBuilder<U[]> {
    this.action = 'SELECT';
    return this as any;
  }

  eq(column: string, value: any): LocalQueryBuilder<T> {
    this.filters[column] = value;
    return this;
  }

  gte(column: string, value: any): LocalQueryBuilder<T> {
    this.filters[`${column}__gte`] = value;
    // Keep range for backward compatibility with daily_logs specialized route if needed
    this.range.start = value;
    this.range.col = column;
    return this;
  }

  lte(column: string, value: any): LocalQueryBuilder<T> {
    this.filters[`${column}__lte`] = value;
    // Keep range for backward compatibility with daily_logs specialized route if needed
    this.range.end = value;
    this.range.col = column;
    return this;
  }

  insert(data: any): LocalQueryBuilder<T> {
      this.action = 'INSERT';
      this.payload = data;
      return this;
  }

  upsert(data: any): LocalQueryBuilder<T> {
      this.action = 'UPSERT';
      this.payload = data;
      return this;
  }

  update(data: any): LocalQueryBuilder<T> {
      this.action = 'UPDATE';
      this.payload = data;
      return this;
  }

  delete(): LocalQueryBuilder<T> {
      this.action = 'DELETE';
      return this;
  }

  private getBaseUrl(): string {
    // Specialized routes for specific tables
    if (this.table === 'inventory_stock') {
        // ONLY use /inventory for SELECT. INSERT/UPDATE/DELETE must use generic /data/ route.
        if (this.action === 'SELECT') return `${API_URL}/inventory`;
    }

    const isSpecializedAction = this.action === 'SELECT' || this.action === 'UPSERT' || this.action === 'INSERT';

    if (isSpecializedAction || (this.action === 'DELETE' && this.table === 'daily_logs')) {
        if (this.table === 'student_enrollment') return `${API_URL}/enrollment`;
        if (this.table === 'daily_logs') return `${API_URL}/daily-logs`;
    }
    
    return `${API_URL}/data/${this.table}`;
  }

  private orderBy: { column: string; ascending: boolean } | null = null;

  order(column: string, { ascending = true }: { ascending?: boolean } = {}): LocalQueryBuilder<T> {
      this.orderBy = { column, ascending };
      return this;
  }

  limit(_count: number): LocalQueryBuilder<T> {
      return this;
  }

  returns<U = any>(): LocalQueryBuilder<U> {
      this.orderBy = null; // Reset order when setting returns? No, keep it for execute.
      return this as any;
  }

  lt(column: string, value: any): LocalQueryBuilder<T> {
      this.filters[`${column}__lt`] = value;
      return this;
  }

  gt(column: string, value: any): LocalQueryBuilder<T> {
      this.filters[`${column}__gt`] = value;
      return this;
  }

  neq(column: string, value: any): LocalQueryBuilder<T> {
      this.filters[`${column}__ne`] = value;
      return this;
  }

  in(column: string, values: any[]): LocalQueryBuilder<T> {
      this.filters[`${column}__in`] = values.join(',');
      return this;
  }

  or(filters: string): LocalQueryBuilder<T> {
      this.filters['or'] = filters;
      return this;
  }

  not(_col: string, _op: string, _val: any): LocalQueryBuilder<T> {
      return this;
  }

  csv(): LocalQueryBuilder<T> {
      return this;
  }

  abortSignal(_sig: AbortSignal): LocalQueryBuilder<T> {
      return this;
  }

  async then(onfulfilled?: (value: { data: T | null; error: any }) => any) {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result as any) : result as any;
  }

  private async execute(): Promise<{ data: T | null; error: any }> {
    let url = this.getBaseUrl();
    let method = 'GET';
    
    if (this.action === 'INSERT' || this.action === 'UPSERT') {
        method = 'POST';
    } else if (this.action === 'UPDATE') {
        method = 'PATCH';
        const id = this.filters['id'];
        if (id) url += `?id=${id}`;
    } else if (this.action === 'DELETE') {
        method = 'DELETE';
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(this.filters)) {
            params.append(key, value);
        }
        if (params.toString()) url += `?${params.toString()}`;
    } else if (this.action === 'SELECT') {
        const params = new URLSearchParams();
        
        // Handle specialized Daily Logs route params
        if (this.table === 'daily_logs') {
            // Map filters to start_date/end_date if they exist
            const start = this.range.start || this.filters['log_date__gte'] || this.filters['log_date__gt'] || '2000-01-01';
            const end = this.range.end || this.filters['log_date__lte'] || this.filters['log_date__lt'] || '2100-01-01';
            params.append('start_date', start);
            params.append('end_date', end);
            
            // Clean up those filters so they aren't appended twice
            delete this.filters['log_date__gte'];
            delete this.filters['log_date__gt'];
            delete this.filters['log_date__lte'];
            delete this.filters['log_date__lt'];
        }

        for (const [key, value] of Object.entries(this.filters)) {
            params.append(key, value);
        }

        if (this.orderBy) {
            params.append('order_by', this.orderBy.column);
            params.append('order_dir', this.orderBy.ascending ? 'asc' : 'desc');
        }

        const queryString = params.toString();
        if (queryString) {
            url += (url.includes('?') ? '&' : '?') + queryString;
        }
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: this.payload ? JSON.stringify(this.payload) : undefined,
        credentials: 'include'
      });

      if (!response.ok) return { data: null, error: { message: response.statusText } };

      const data = await response.json();
      
      if (this.isSingleResult) {
          return { data: Array.isArray(data) ? data[0] : data, error: null };
      }
      return { data: data as any, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }
}

export const api = {
  get: async (path: string) => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Request failed");
    return data;
  },
  post: async (path: string, payload: any) => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Request failed");
    return data;
  },
  patch: async (path: string, payload: any) => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Request failed");
    return data;
  },
  from: (table: string) => new LocalQueryBuilder(table),
  rpc: async <T = any>(name: string, params: any): Promise<{ data: T | null; error: any }> => {
      const url_map: Record<string, string> = {
          'process_daily_consumption': `${API_URL}/process-consumption`
      };
      
      const url = url_map[name];
      if (!url) return { data: null, error: { message: `RPC ${name} not implemented` } };

      const payload = { ...params };
      const mappedPayload: any = {};
      Object.entries(payload).forEach(([k, v]) => {
          mappedPayload[k.replace(/^p_/, '')] = v;
      });

      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(mappedPayload),
          credentials: 'include'
      });
      
      const data = await response.json();
      return { data, error: !response.ok ? { message: data.detail || "RPC failed" } : null };
  },
  auth: {
    signUp: async (credentials: any) => {
        try {
          // Point to real backend registration
          const data = await api.post('/register', credentials);
          return { data: { user: { id: data.user_id, email: credentials.email } }, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
    },
    signOut: async () => {
        window.location.href = '/login';
    }
  },
  functions: {
    invoke: async (_name: string, _options: any) => {
      return { data: { success: true }, error: null };
    }
  }
};

console.log("🚀 Local API active (Supabase fully decommissioned)");
