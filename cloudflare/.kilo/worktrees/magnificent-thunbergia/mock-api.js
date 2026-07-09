const http = require('http');

const PORT = 8787;

let tenants = [];
let apps = [];

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`[Mock API] ${req.method} ${req.url}`);

  if (req.url === '/api/tenants' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: tenants }));
    return;
  }

  if (req.url === '/api/tenants' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const newTenant = {
          id: payload.id || `tenant_${Math.random().toString(36).substr(2, 9)}`,
          name: payload.name,
          slug: payload.slug,
          created_at: new Date().toISOString()
        };
        tenants.push(newTenant);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: newTenant, created: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Bootstrap endpoint
  const bootstrapMatch = req.url.match(/\/api\/portal\/workspace\/(tenant_[^\/]+)\/bootstrap/);
  if (bootstrapMatch && req.method === 'GET') {
    const tenantId = bootstrapMatch[1];
    const tenant = tenants.find(t => t.id === tenantId) || { id: tenantId, name: 'Mock Workspace', slug: 'mock-ws' };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: {
        tenant: tenant,
        apps: [],
        deployments: [],
        integrations: {
          github: [],
          cloudflare: []
        }
      }
    }));
    return;
  }

  // Add more routes as needed for /api/apps, etc.
  if (req.url === '/api/apps' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const newApp = {
          id: payload.id || `app_${Math.random().toString(36).substr(2, 9)}`,
          name: payload.name,
          description: payload.description,
          tenantId: payload.tenantId,
          status: 'active',
          created_at: new Date().toISOString()
        };
        apps.push(newApp);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: newApp, created: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (req.url.startsWith('/api/apps') && req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const tenantId = url.searchParams.get('tenantId');
    const filteredApps = tenantId ? apps.filter(a => a.tenantId === tenantId) : apps;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: filteredApps }));
    return;
  }

  if (req.url.startsWith('/api/deployments') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [] }));
    return;
  }

  if (req.url.startsWith('/api/integrations') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [] }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Mock API] Running at http://127.0.0.1:${PORT}`);
});
