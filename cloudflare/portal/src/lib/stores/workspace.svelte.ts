import { browser } from '$app/environment';

export interface WorkspaceState {
    activeTenantId: string | null;
    activeAppId: string | null;
    tenant: any | null;
    apps: any[];
    deployments: any[];
    integrations: {
        github: any[];
        cloudflare: any[];
    };
    loading: boolean;
    initialized: boolean;
}

const STORAGE_KEY = 'nexus_active_tenant_id';
const APP_STORAGE_KEY = 'nexus_active_app_id';

class WorkspaceStore {
    state = $state<WorkspaceState>({
        activeTenantId: browser ? localStorage.getItem(STORAGE_KEY) : null,
        activeAppId: browser ? localStorage.getItem(APP_STORAGE_KEY) : null,
        tenant: null,
        apps: [],
        deployments: [],
        integrations: {
            github: [],
            cloudflare: [],
        },
        loading: false,
        initialized: false,
    });

    setTenantId(id: string | null) {
        this.state.activeTenantId = id;
        if (browser) {
            if (id) {
                localStorage.setItem(STORAGE_KEY, id);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }

    setAppId(id: string | null) {
        this.state.activeAppId = id;
        if (browser) {
            if (id) {
                localStorage.setItem(APP_STORAGE_KEY, id);
            } else {
                localStorage.removeItem(APP_STORAGE_KEY);
            }
        }
    }

    setBootstrapData(data: any) {
        this.state.tenant = data.tenant;
        this.state.apps = data.apps;
        this.state.deployments = data.deployments;
        this.state.integrations = data.integrations;
        this.state.initialized = true;
    }

    setLoading(loading: boolean) {
        this.state.loading = loading;
    }

    reset() {
        this.state.tenant = null;
        this.state.apps = [];
        this.state.deployments = [];
        this.state.integrations = { github: [], cloudflare: [] };
        this.state.activeAppId = null;
        this.state.initialized = false;
    }
}

export const workspace = new WorkspaceStore();
