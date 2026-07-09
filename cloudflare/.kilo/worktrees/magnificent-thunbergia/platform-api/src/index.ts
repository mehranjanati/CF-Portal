import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { OpenFeature } from '@openfeature/server-sdk';
import { FlagshipServerProvider } from '@cloudflare/flagship/server';

import artifactRoutes from './modules/artifacts/routes';
import appRoutes from './modules/apps/routes';
import builderRoutes from './modules/builder/routes';
import deploymentRoutes from './modules/deployments/routes';
import healthRoutes from './modules/health/routes';
import cloudflareIntegrationRoutes from './modules/integrations/cloudflare';
import githubIntegrationRoutes from './modules/integrations/github';
import portalRoutes from './modules/portal/routes';
import tenantRoutes from './modules/tenants/routes';
import workflowRunRoutes from './modules/workflow-runs/routes';
import { failure } from './lib/json';
import type { AppBindings } from './types/env'; // Corrected import

const app = new Hono<{ Bindings: AppBindings }>();

const corsOptions = {
  origin: (origin: string) => origin, // Allow any origin
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Type'],
  maxAge: 86400,
  credentials: true,
};

// 1. CORS Middleware (Must be first)
app.use('*', cors(corsOptions));

// 2. Request logging middleware
app.use('*', async (c, next) => {
  console.log(`[Worker] Incoming Request: ${c.req.method} ${c.req.url}`);
  await next();
  console.log(`[Worker] Response: ${c.res.status}`);
});

let openFeatureInitialized = false;
let openFeatureInitialization: Promise<void> | null = null;

async function ensureOpenFeatureProvider(c: Context<{ Bindings: AppBindings }>) {
  if (openFeatureInitialized || openFeatureInitialization) {
    if (openFeatureInitialization) await openFeatureInitialization;
    return;
  }

  if (!c.env.FLAGS) {
    console.warn('Flagship binding (FLAGS) is missing. Skipping OpenFeature initialization.');
    return;
  }

  try {
    const provider = new FlagshipServerProvider({ binding: c.env.FLAGS });
    openFeatureInitialization = OpenFeature
      .setProviderAndWait(provider)
      .then(() => {
        openFeatureInitialized = true;
      })
      .catch((error) => {
        // Feature flags should not take down the operational API.
        console.error('Failed to initialize Flagship provider:', error);
      });

    await openFeatureInitialization;
  } catch (error) {
    console.error('Synchronous error during Flagship provider creation:', error);
  }
}

app.use(
  '/*',
  async (c, next) => {
    if (c.req.method !== 'OPTIONS') {
      await ensureOpenFeatureProvider(c);
    }

    await next();
  },
);

app.route('/', healthRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/tenants', tenantRoutes);
app.route('/api/apps', appRoutes);
app.route('/api/deployments', deploymentRoutes);
app.route('/api/workflow-runs', workflowRunRoutes);
app.route('/api/integrations/github', githubIntegrationRoutes);
app.route('/api/integrations/cloudflare', cloudflareIntegrationRoutes);
app.route('/api/builder', builderRoutes);
app.route('/api/artifacts', artifactRoutes);
app.route('/api/portal', portalRoutes);

// Example endpoint to check a feature flag
app.get('/api/feature-check', async (c) => {
  const client = OpenFeature.getClient();
  const newBackendFeatureEnabled = await client.getBooleanValue('new-backend-feature', false, {
    targetingKey: 'some-user-id', // Replace with actual user ID or context
  });

  return c.json({ newBackendFeatureEnabled });
});

app.notFound((c) => {
  return failure(c, 404, 'Route not found.', {
    path: c.req.path,
  });
});

export default app;
