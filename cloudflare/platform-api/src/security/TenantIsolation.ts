export interface TenantContext {
	tenantId: string;
}

export class TenantIsolation {
	static assertTenantAccess(tenantId: string, context: TenantContext): void {
		if (tenantId !== context.tenantId) {
			throw new Error(
				JSON.stringify({
					code: 'TENANT_ERROR',
					message: 'Access to tenant resource denied.',
					statusCode: 403
				})
			);
		}
	}
}