/**
 * Toggleable module registry — SSOT for per-tenant module configuration.
 *
 * Different customers need different modules: a vintage shop hides the
 * refurb-specific pipeline (intake, repairs), while an IT refurbisher keeps
 * everything. Which modules a company has enabled lives in
 * `companies.settings.enabledModules` (JSONB) — see CompanySettings in
 * packages/database/src/schema.ts.
 *
 * Backward compatibility invariant: `enabledModules === undefined` means
 * ALL modules are enabled (the historical behaviour). Existing companies that
 * have never touched this setting are therefore unaffected.
 *
 * Client-safe: pure module, zero DB/server dependencies. Import the specific
 * path (`@kivvi/core/src/config/modules`) — never the `@kivvi/core` barrel —
 * from client components.
 *
 * Imported by:
 * - apps/web/components/sidebar/nav-link.tsx (NavItem.moduleKey + filter)
 * - apps/web/lib/config/navigation.ts (tags toggleable nav items)
 * - apps/web/app/actions/settings.ts (validation of persisted keys)
 */

export interface ToggleableModule {
  /** Stable identifier stored in companies.settings.enabledModules */
  key: string;
  /** i18n key (nav namespace) for the human label */
  labelKey: string;
  /** Whether the module is on for companies that have never configured it */
  default: boolean;
}

/**
 * The optional modules a company can enable/disable. Each maps to an optional
 * sidebar item. Core modules (home, sales, people, catalog, money, reports,
 * settings, help) are NOT listed here — they can never be disabled.
 */
export const TOGGLEABLE_MODULES = [
  { key: "intake", labelKey: "intake", default: true },
  { key: "repairs", labelKey: "repairs", default: true },
  { key: "pos", labelKey: "pos", default: true },
  { key: "purchasing", labelKey: "purchasing", default: true },
  { key: "projects", labelKey: "projects", default: true },
] as const satisfies readonly ToggleableModule[];

export type ModuleKey = (typeof TOGGLEABLE_MODULES)[number]["key"];

/** All toggleable module keys, in registry order. */
export const TOGGLEABLE_MODULE_KEYS = TOGGLEABLE_MODULES.map((m) => m.key) as ModuleKey[];

/** Type guard: is `key` a module that can actually be toggled off? */
export function isToggleableModule(key: string): key is ModuleKey {
  return (TOGGLEABLE_MODULE_KEYS as string[]).includes(key);
}

/**
 * Pure predicate: is `key` enabled for a company?
 *
 * Rules:
 * - Non-toggleable key (core module) → always `true` (can't be disabled).
 * - `enabledModules === undefined` → `true` (all modules on — legacy default).
 * - Otherwise → `true` iff `key` is present in `enabledModules`.
 */
export function isModuleEnabled(
  enabledModules: readonly string[] | undefined,
  key: string,
): boolean {
  if (!isToggleableModule(key)) return true;
  if (enabledModules === undefined) return true;
  return enabledModules.includes(key);
}

/** The subset of toggleable modules currently enabled for a company. */
export function getEnabledToggleableModules(
  enabledModules: readonly string[] | undefined,
): ModuleKey[] {
  return TOGGLEABLE_MODULE_KEYS.filter((key) => isModuleEnabled(enabledModules, key));
}

/**
 * SSOT map of each toggleable module → the dashboard route prefixes it owns.
 * Used to gate direct-URL access to a disabled module's pages (middleware),
 * so disabling a module both hides its sidebar item AND blocks its routes.
 * Keep in sync with the `moduleKey` tags in apps/web/lib/config/navigation.ts.
 */
export const MODULE_ROUTE_PREFIXES: Record<ModuleKey, readonly string[]> = {
  intake: ["/intake"],
  repairs: ["/repairs"],
  pos: ["/pos"],
  purchasing: ["/purchasing"],
  projects: ["/projects"],
};

/**
 * Which toggleable module (if any) a dashboard pathname belongs to. A path
 * matches a module when it equals a prefix or is nested under it (`/intake`,
 * `/intake/new`). Returns `null` for core/unowned paths. Pure — edge-safe.
 */
export function moduleForPath(pathname: string): ModuleKey | null {
  for (const key of TOGGLEABLE_MODULE_KEYS) {
    for (const prefix of MODULE_ROUTE_PREFIXES[key]) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        return key;
      }
    }
  }
  return null;
}
