declare module 'lodash';

interface ApiConfig {
  id: string;
  url?: string;
  method?: string;
  headers?: string | Record<string, string>;
  body?: string | Record<string, any>;
} 