declare module '@supabase/supabase-js' {
  export interface SupabaseClientOptions {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
    };
    global?: {
      headers?: Record<string, string>;
      fetch?: typeof fetch;
    };
  }

  export interface User {
    id: string;
    email?: string;
  }

  export interface Session {
    user: User;
    access_token: string;
    refresh_token: string;
  }

  export interface SupabaseAuthClient {
    signUp(credentials: { email: string; password: string }): Promise<{
      user: User | null;
      session: Session | null;
      error: Error | null;
    }>;
    signIn(credentials: { email: string; password: string }): Promise<{
      user: User | null;
      session: Session | null;
      error: Error | null;
    }>;
    signOut(): Promise<{ error: Error | null }>;
    session(): Session | null;
  }

  export interface PostgrestFilterBuilder<T> {
    eq(column: string, value: any): PostgrestFilterBuilder<T>;
    neq(column: string, value: any): PostgrestFilterBuilder<T>;
    gt(column: string, value: any): PostgrestFilterBuilder<T>;
    gte(column: string, value: any): PostgrestFilterBuilder<T>;
    lt(column: string, value: any): PostgrestFilterBuilder<T>;
    lte(column: string, value: any): PostgrestFilterBuilder<T>;
    like(column: string, pattern: string): PostgrestFilterBuilder<T>;
    ilike(column: string, pattern: string): PostgrestFilterBuilder<T>;
    is(column: string, value: any): PostgrestFilterBuilder<T>;
    in(column: string, values: any[]): PostgrestFilterBuilder<T>;
    contains(column: string, value: any): PostgrestFilterBuilder<T>;
    containedBy(column: string, value: any): PostgrestFilterBuilder<T>;
    filter(column: string, operator: string, value: any): PostgrestFilterBuilder<T>;
    order(column: string, options?: { ascending?: boolean }): PostgrestFilterBuilder<T>;
    limit(count: number): PostgrestFilterBuilder<T>;
    select(columns?: string): PostgrestFilterBuilder<T>;
    single(): Promise<{ data: T | null; error: Error | null }>;
    then<TResult>(
      onfulfilled?: (value: { data: T[] | null; error: Error | null }) => TResult | PromiseLike<TResult>, 
      onrejected?: (reason: any) => TResult | PromiseLike<TResult>
    ): Promise<TResult>;
  }

  export interface PostgrestQueryBuilder<T> {
    select(columns?: string): PostgrestFilterBuilder<T>;
    insert(values: Partial<T> | Partial<T>[], options?: { returning?: string }): PostgrestFilterBuilder<T>;
    update(values: Partial<T>, options?: { returning?: string }): PostgrestFilterBuilder<T>;
    delete(options?: { returning?: string }): PostgrestFilterBuilder<T>;
  }

  export interface SupabaseClient {
    from<T>(table: string): PostgrestQueryBuilder<T>;
    auth: SupabaseAuthClient;
  }

  export function createClient(supabaseUrl: string, supabaseKey: string, options?: SupabaseClientOptions): SupabaseClient;
} 