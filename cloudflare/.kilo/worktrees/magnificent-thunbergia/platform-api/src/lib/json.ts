import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { AppBindings } from '../types/env';

export function ok<T>(
  c: Context<{ Bindings: AppBindings }>,
  data: T,
  meta?: Record<string, unknown>,
) {
  return c.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    200,
  );
}

export function accepted<T>(
  c: Context<{ Bindings: AppBindings }>,
  data: T,
  meta?: Record<string, unknown>,
) {
  return c.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    202,
  );
}

export function failure(
  c: Context<{ Bindings: AppBindings }>,
  status: ContentfulStatusCode,
  error: string,
  details?: unknown,
) {
  return c.json(
    {
      success: false,
      error,
      ...(details === undefined ? {} : { details }),
    },
    status,
  );
}

export function notImplemented(
  c: Context<{ Bindings: AppBindings }>,
  feature: string,
  details?: unknown,
) {
  return failure(c, 501, `${feature} is not implemented yet.`, details);
}
