const PLACEHOLDER_API_HOST = 'platform-api.your-subdomain.workers.dev';

function normalizeApiBaseUrl(rawValue: string | undefined): string | null {
    if (!rawValue) {
        return null;
    }

    const sanitizedValue = rawValue
        .trim()
        .replace(/^[`'"\s]+|[`'"\s]+$/g, '')
        .replace(/\/+$/, '');

    if (!sanitizedValue || sanitizedValue.includes(PLACEHOLDER_API_HOST)) {
        return null;
    }

    try {
        return new URL(sanitizedValue).toString().replace(/\/+$/, '');
    } catch {
        return null;
    }
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL) || 'http://127.0.0.1:8787';

console.log('[API] Initialized with BASE_URL:', API_BASE_URL);

function getConfiguredApiBaseUrl(): string {
    if (!API_BASE_URL) {
        throw new Error(
            'Platform API URL is not configured. Set VITE_API_BASE_URL to your deployed Worker URL before using the portal.',
        );
    }

    return API_BASE_URL;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const baseUrl = getConfiguredApiBaseUrl();
    const url = `${baseUrl}${path}`;
    
    console.log(`[API Request] ${options?.method || 'GET'} ${url}`, options?.body ? JSON.parse(options.body as string) : '');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // increased timeout for AI generation

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        clearTimeout(timeoutId);

        const result = await response.json();
        console.log(`[API Response] ${response.status} ${url}`, result);

        if (!response.ok) {
            throw new Error(result.error || `API request failed with status ${response.status}`);
        }

        return result.data !== undefined ? result.data : result;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error(`[API Timeout] ${url}`);
            throw new Error(`API request timed out (${url}). Please ensure the backend is running and reachable at ${baseUrl}.`);
        }
        console.error(`[API Error] ${url}`, error);
        throw error;
    }
}

export const integrations = {
    listGitHub: (tenantId?: string) => 
        apiFetch<any[]>(`/api/integrations/github${tenantId ? `?tenantId=${tenantId}` : ''}`),
    
    createGitHub: (payload: any) => 
        apiFetch<any>('/api/integrations/github', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    deleteGitHub: (id: string) => 
        apiFetch<any>(`/api/integrations/github/${id}`, {
            method: 'DELETE',
        }),

    listCloudflare: (tenantId?: string) => 
        apiFetch<any[]>(`/api/integrations/cloudflare${tenantId ? `?tenantId=${tenantId}` : ''}`),

    createCloudflare: (payload: any) => 
        apiFetch<any>('/api/integrations/cloudflare', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    deleteCloudflare: (id: string) => 
        apiFetch<any>(`/api/integrations/cloudflare/${id}`, {
            method: 'DELETE',
        }),
};

export const tenants = {
    list: () => apiFetch<any[]>('/api/tenants'),
    create: (payload: any) => apiFetch<any>('/api/tenants', {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
};

export const apps = {
    list: (tenantId?: string) => 
        apiFetch<any[]>(`/api/apps${tenantId ? `?tenantId=${tenantId}` : ''}`),
    create: (payload: any) => apiFetch<any>('/api/apps', {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
};

export const deployments = {
    list: (filters?: { tenantId?: string; appId?: string }) => {
        const params = new URLSearchParams();
        if (filters?.tenantId) params.append('tenantId', filters.tenantId);
        if (filters?.appId) params.append('appId', filters.appId);
        return apiFetch<any[]>(`/api/deployments?${params.toString()}`);
    },
    create: (payload: any) => apiFetch<any>('/api/deployments', {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
};

export const portal = {
    bootstrap: (tenantId: string) => 
        apiFetch<any>(`/api/portal/workspace/${tenantId}/bootstrap`),
};

export const builder = {
    createSession: (payload: any) => 
        apiFetch<any>('/api/builder/sessions', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    loadSession: (sessionId: string) => 
        apiFetch<any>(`/api/builder/sessions/${sessionId}`),
    getSession: (sessionId: string) => 
        apiFetch<any>(`/api/builder/sessions/${sessionId}`),
    generate: (sessionId: string, prompt: string) => 
        apiFetch<any>(`/api/builder/sessions/${sessionId}/generate`, {
            method: 'POST',
            body: JSON.stringify({ prompt }),
        }),
    listHistory: (appId: string) => 
        apiFetch<any>(`/api/builder/apps/${appId}/history`),
    apply: (sessionId: string) => 
        apiFetch<any>(`/api/builder/sessions/${sessionId}/apply`, {
            method: 'POST',
        }),
    publish: (appId: string) => 
        apiFetch<any>(`/api/builder/apps/${appId}/publish`, {
            method: 'POST',
        }),
};
