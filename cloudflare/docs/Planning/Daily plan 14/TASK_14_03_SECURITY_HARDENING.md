# TASK 14-03: Security Hardening

## Objective
Ensure the platform is secure for multi-tenant production use with proper authentication, authorization, input validation, and secrets management.

## Prerequisites
- TASK 14-02 completed (error handling framework)
- Platform API has authentication middleware

## Implementation

### Step 1: Enhanced Auth Middleware

Modify `platform-api/src/middleware/auth.ts`:
```typescript
import { verifyJWT, extractTokenFromHeader } from '../lib/auth';
import { AuthError } from '../lib/errors';
import { env } from 'cloudflare:test';

export async function requireAuth(request: Request): Promise<{
  tenantId: number;
  userId: number;
}> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing authorization token');
  }

  const token = extractTokenFromHeader(authHeader);
  
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    
    // Verify token not expired
    if (payload.exp * 1000 < Date.now()) {
      throw new AuthError('Token expired');
    }

    return {
      tenantId: payload.tenantId,
      userId: payload.userId
    };
  } catch (error) {
    throw new AuthError('Invalid or expired token');
  }
}
```

### Step 2: Input Validation Schemas

Create `platform-api/src/lib/validation.ts`:
```typescript
import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email().max(255);
const passwordSchema = z.string().min(8).max(72);
const tenantNameSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9-_]+$/);

// Builder input schemas
export const CreateSessionSchema = z.object({
  appId: z.number().int().positive(),
  project: z.object({
    name: tenantNameSchema,
    framework: z.enum(['sveltekit', 'nextjs', 'astro']).default('sveltekit')
  })
});

export const GenerateCodeSchema = z.object({
  prompt: z.string().min(1).max(5000),
  context: z.object({
    filePath: z.string().optional(),
    cursorPosition: z.object({
      line: z.number().int().nonnegative(),
      column: z.number().int().nonnegative()
    }).optional()
  }).optional()
});

// Validation helper
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid input', {
        fields: error.flatten().fieldErrors
      });
    }
    throw error;
  }
}
```

### Step 3: SQL Injection Prevention

Verify D1 queries use parameterized statements:

```typescript
// GOOD - Parameterized query
const tenant = await env.DB.prepare(
  'SELECT * FROM tenants WHERE id = ? AND user_id = ?'
).bind(tenantId, userId).first();

// BAD - String concatenation (NEVER DO THIS)
// const tenant = await env.DB.prepare(`SELECT * FROM tenants WHERE id = ${tenantId}`);

// Enable query logging for security audit
export async function getTenantApps(tenantId: number) {
  const query = `
    SELECT id, name, framework, created_at 
    FROM apps 
    WHERE tenant_id = ?
    ORDER BY created_at DESC
  `;
  
  const apps = await env.DB.prepare(query).bind(tenantId).all();
  return apps.results;
}
```

### Step 4: XSS Prevention for AI-Generated HTML

Create `platform-api/src/lib/sanitize.ts`:
```typescript
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(html: string): string {
  // Remove script tags, event handlers, javascript: URLs
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'button', 'input', 'form'],
    ALLOWED_ATTR: ['class', 'id', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover']
  });
}

export function sanitizeFilename(filename: string): string {
  // Remove path traversal and special characters
  return filename
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9_\-./]/g, '_')
    .slice(0, 255);
}
```

### Step 5: CSRF Protection

Create `platform-api/src/middleware/csrf.ts`:
```typescript
import { cookies } from 'next/headers';

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf_token';

export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

export async function validateCSRF(request: Request): Promise<void> {
  const cookieToken = request.headers.get('cookie')?.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`))?.[1];
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ValidationError('CSRF token validation failed');
  }
}

// Usage in state-changing routes
export function withCSRF(handler: Function) {
  return async (request: Request) => {
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await validateCSRF(request);
    }
    return handler(request);
  };
}
```

### Step 6: Rate Limiting Middleware

Create `platform-api/src/middleware/rate-limit.ts`:
```typescript
import { RateLimitError } from '../lib/errors';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (request: Request) => string;
}

export function createRateLimiter(config: RateLimitConfig) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return async (request: Request): Promise<void> => {
    const key = config.keyGenerator(request);
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now > record.resetAt) {
      hits.set(key, { count: 1, resetAt: now + config.windowMs });
      return;
    }

    if (record.count >= config.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      throw new RateLimitError(retryAfter);
    }

    record.count++;
  };
}

// Usage: Per-tenant rate limiting
export const tenantRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: (request) => {
    const tenantId = request.headers.get('x-tenant-id');
    return `tenant:${tenantId}`;
  }
});
```

### Step 7: Security Headers

Add to `platform-api/wrangler.toml`:
```toml
[site]
  # Enable security headers via Workers Route

[headers]
  "*" = [
    { "Strict-Transport-Security" = "max-age=31536000; includeSubDomains" },
    { "X-Content-Type-Options" = "nosniff" },
    { "X-Frame-Options" = "DENY" },
    { "X-XSS-Protection" = "1; mode=block" },
    { "Referrer-Policy" = "strict-origin-when-cross-origin" },
    { "Permissions-Policy" = "geolocation=(), microphone=(), camera=()" }
  ]
```

### Step 8: Tenant Data Isolation

Create `platform-api/src/middleware/tenant-context.ts`:
```typescript
export async function enforceTenantIsolation(
  request: Request,
  resourceTenantId: number
): Promise<void> {
  const auth = await requireAuth(request);
  
  if (auth.tenantId !== resourceTenantId) {
    throw new AuthError('Access denied: tenant mismatch');
  }
}

// Usage in database queries
export async function getAppsForTenant(tenantId: number, requestingTenantId: number) {
  await enforceTenantIsolation(
    new Request('http://internal'), // mock for type safety
    tenantId
  );
  
  return await env.DB.prepare(
    'SELECT * FROM apps WHERE tenant_id = ?'
  ).bind(requestingTenantId).all();
}
```

## Deliverables
- [ ] Authentication middleware with JWT expiry check
- [ ] Zod schemas for all input validation
- [ ] SQL injection prevention verified
- [ ] XSS sanitization for AI output
- [ ] CSRF tokens implemented
- [ ] Rate limiting per tenant
- [ ] Security headers configured

## Acceptance Criteria
- [ ] All API routes require authentication (except `/health`)
- [ ] Invalid input returns 400 with field-level errors
- [ ] SQL injection tests fail (queries are safe)
- [ ] AI-generated HTML is sanitized before rendering
- [ ] CSRF tokens validated on state-changing operations
- [ ] Rate limiting triggers at 101 requests/minute per tenant