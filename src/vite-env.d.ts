/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_FF_WEATHER?: string
  readonly VITE_FF_SENSORS?: string
  readonly VITE_FF_OFFLINE?: string
  readonly VITE_FF_PUSH?: string
  readonly VITE_FF_FARMER?: string
  readonly VITE_FF_PREMIUM?: string
  readonly VITE_FF_KYRGYZ?: string
  readonly VITE_FF_WATER_VOLUME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}