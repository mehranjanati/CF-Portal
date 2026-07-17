export class Optimizer {
	static getQueryCacheKey(tenantId: string, query: string, params: unknown[]): string {
		return `${tenantId}:${query}:${JSON.stringify(params)}`;
	}

	static calculateTTL(priority: 'high' | 'normal' | 'low'): number {
		switch (priority) {
			case 'high':
				return 60;
			case 'normal':
				return 300;
			case 'low':
				return 900;
		}
	}
}