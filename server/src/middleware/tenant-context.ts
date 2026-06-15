import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  dbName: string;
  label: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(tenant: TenantContext, fn: () => T): T {
  return storage.run(tenant, fn);
}

export function getTenantDb(): string {
  const ctx = storage.getStore();
  if (!ctx) {
    // Dev mode (no auth configured) or missing context: use default DB
    return process.env.DB_NAME || 'byteme';
  }
  return ctx.dbName;
}

export function getTenantLabel(): string | undefined {
  return storage.getStore()?.label;
}
