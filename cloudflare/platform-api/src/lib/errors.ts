import type { Context } from 'hono';

import { failure } from './json';
import type { AppBindings } from '../types/env';

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unexpected platform-api error';
}

export function handleRouteError(
  c: Context<{ Bindings: AppBindings }>,
  error: unknown,
) {
  console.error('Route Error:', error);
  return failure(c, 500, toErrorMessage(error));
}
