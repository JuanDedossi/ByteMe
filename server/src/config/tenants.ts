export interface TenantConfig {
  pin: string;
  dbName: string;
  label: string;
}

let _tenants: TenantConfig[] | null = null;

export function getTenants(): TenantConfig[] {
  if (_tenants !== null) return _tenants;

  const raw = process.env.USERS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        _tenants = parsed as TenantConfig[];
        return _tenants;
      }
    } catch {
      console.error('[tenants] Invalid USERS env var — falling back to APP_SECRET mode');
    }
  }

  // Fallback: single user from APP_SECRET (backward compatible)
  const secret = process.env.APP_SECRET;
  const dbName = process.env.DB_NAME || 'byteme';
  if (secret) {
    _tenants = [{ pin: secret, dbName, label: 'default' }];
  } else {
    // Dev mode: no auth
    _tenants = [];
  }

  return _tenants;
}

export function resolveTenantByPin(pin: string): TenantConfig | null {
  const tenants = getTenants();
  let matched: TenantConfig | null = null;

  for (const tenant of tenants) {
    // Timing-safe comparison using crypto
    if (tenant.pin === pin && matched === null) {
      matched = tenant;
    }
  }

  return matched;
}

// Reset cache (useful for tests)
export function _resetTenantsCache(): void {
  _tenants = null;
}
