/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENWEATHER_API_KEY?: string;
  readonly VITE_API_key?: string;
  readonly VITE_WEATHER_PROVIDER?: string;
  readonly VITE_IMD_API_ENABLED?: string;
  readonly VITE_IMD_API_KEY?: string;
  readonly VITE_DEFAULT_CITY?: string;
  readonly VITE_DEFAULT_COUNTRY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
