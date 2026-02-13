/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_ENABLE_DEVTOOLS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
