import type { FlagshipBinding } from '@cloudflare/flagship/server';

export type AppBindings = {
  DB: D1Database;
  FLAGS: FlagshipBinding;
};
