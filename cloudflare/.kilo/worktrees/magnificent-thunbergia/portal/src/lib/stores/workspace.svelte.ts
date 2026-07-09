import { browser } from '$app/environment';

export interface WorkspaceState {
    activeTenantId: string | null;
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

class WorkspaceStore {
    state = $state<WorkspaceState>({
        activeTenantId: browser ? localStorage.getItem(STORAGE_KEY) : null,
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
        this.state.initialized = false;
    }
}

export const workspace = new WorkspaceStore();
