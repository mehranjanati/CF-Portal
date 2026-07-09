export const featureTags: Record<string, string[]> = {
    'projects-page': ['core', 'dashboard', 'v1'],
    'new-project-button': ['core', 'crud', 'v1'],
    'integrations-github': ['integrations', 'external-service', 'beta'],
    'builder-page': ['new-feature', 'experimental'],
    'marketplace-page': ['new-feature', 'experimental'],
    'agent-foundry-page': ['new-feature', 'experimental'],
    'billing-page': ['core', 'finance'],
    'streams-page': ['new-feature', 'data'],
    'deployments-page': ['core', 'cicd'],
    'workflows-page': ['new-feature', 'automation'],
    'logs-page': ['core', 'observability'],
    'handoff-page': ['new-feature', 'communication'],
    'settings-page': ['core', 'configuration'],
    // Add more features and their tags here as needed
};

export function getFeatureTags(featureKey: string): string[] {
    return featureTags[featureKey] || [];
}
