/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_DEMO_FIXTURES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
