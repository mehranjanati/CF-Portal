import type { FlagshipBinding } from '@cloudflare/flagship/server';

export type AppEnv = {
  Bindings: AppBindings;
};

export type AppBindings = {
  DB: D1Database;
  FLAGS: FlagshipBinding;
  AI: any;
  STREAMER: DurableObjectNamespace;
};
