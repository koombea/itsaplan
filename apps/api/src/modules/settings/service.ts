import {
  getSetting,
  setSetting,
  STORAGE_SETTING_KEY,
  getStorageSettings,
  type StorageSettings,
} from '@repo/db';
import type { Locale } from '#modules/user-preferences/locale';

// Instance-wide upload limits (app_setting key 'storage'). getStorageSettings/
// mimeAllowed/MB/StorageSettings live in @repo/db (packages/db/src/domains/storage.ts) —
// the worker checks an imported Plane attachment against the same limits. This module
// keeps only the write side: the limits are set in the database and edited in god mode,
// there is no env var for them.
export async function setStorageSettings(
  patch: Partial<StorageSettings>,
): Promise<StorageSettings> {
  const next = { ...(await getStorageSettings()), ...patch };
  // Types are matched case-insensitively; store them normalized so the settings UI
  // shows what is actually applied.
  next.attachmentMimeTypes = [
    ...new Set(next.attachmentMimeTypes.map((m) => m.trim().toLowerCase()).filter(Boolean)),
  ];
  await setSetting(STORAGE_SETTING_KEY, next);
  return next;
}

// Instance-wide project defaults (app_setting key 'projects'): what a newly
// created project starts with. Only the defaults live here — every one of them
// stays editable per project afterwards, so this decides the starting value and
// nothing else.

const PROJECT_DEFAULTS_SETTING_KEY = 'projects';

export interface ProjectDefaults {
  // Whether a new project starts reachable over MCP. On: an instance driven
  // through MCP does not have to remember the per-project toggle. This is a
  // visibility default, not an access grant — a project still only appears to a
  // member holding a key, exactly as it does today.
  mcpEnabled: boolean;
}

function defaultProjectDefaults(): ProjectDefaults {
  return { mcpEnabled: true };
}

export async function getProjectDefaults(): Promise<ProjectDefaults> {
  const stored = await getSetting<Partial<ProjectDefaults>>(PROJECT_DEFAULTS_SETTING_KEY);
  // Merge over the default so a value written before a field was added stays valid.
  return { ...defaultProjectDefaults(), ...(stored ?? {}) };
}

export async function setProjectDefaults(
  patch: Partial<ProjectDefaults>,
): Promise<ProjectDefaults> {
  const next = { ...(await getProjectDefaults()), ...patch };
  await setSetting(PROJECT_DEFAULTS_SETTING_KEY, next);
  return next;
}

// The instance branding (app_setting key 'branding'): the product identity this
// instance presents instead of the built-in one. Every field defaults to what the
// web app ships with, so an instance that never opens the screen keeps today's
// appearance and no row is written.

export const BRANDING_SETTING_KEY = 'branding';

export interface BrandingSettings {
  appName: string;
  siteUrl: string;
  // Absolute https URL of the mark, pasted rather than uploaded. Empty falls back
  // to the built-in SVG.
  logoUrl: string;
  // A strict CSS color literal that replaces --primary. Empty keeps the achromatic
  // one from the stylesheet.
  accentColor: string;
  // The line under the product name on the sign-in panel. Empty falls back to the
  // translated one.
  loginTagline: string;
  // The language a visitor gets when neither their cookie nor their browser names
  // one the instance ships.
  defaultLocale: Locale;
  // Absolute https URL of the browser tab icon. Empty falls back to app/icon.svg.
  faviconUrl: string;
  // Whether the sidebar footer opens the release history. Off leaves the footer
  // showing the mark, the name and the running version, without the click.
  releaseHistoryEnabled: boolean;
}

function defaultBranding(): BrandingSettings {
  return {
    appName: "It's a Plan",
    siteUrl: 'https://itsaplan.dev/',
    logoUrl: '',
    accentColor: '',
    loginTagline: '',
    defaultLocale: 'en',
    faviconUrl: '',
    releaseHistoryEnabled: true,
  };
}

export async function getBranding(): Promise<BrandingSettings> {
  const stored = await getSetting<Partial<BrandingSettings>>(BRANDING_SETTING_KEY);
  // Merge over the default so a value written before a field was added stays valid.
  return { ...defaultBranding(), ...(stored ?? {}) };
}

export async function setBranding(patch: Partial<BrandingSettings>): Promise<BrandingSettings> {
  const next = { ...(await getBranding()), ...patch };
  await setSetting(BRANDING_SETTING_KEY, next);
  return next;
}

// The instance keyboard shortcuts (app_setting key 'hotkeys'): the combination
// each command is bound to for everyone on this instance. Only the bindings
// changed in god mode are stored; the web app fills the rest from its built-in
// defaults, then applies the user's own overrides on top (user_preference.hotkeys).

const HOTKEYS_SETTING_KEY = 'hotkeys';

export type HotkeyCombos = Record<string, string>;

export async function getHotkeySettings(): Promise<HotkeyCombos> {
  return (await getSetting<HotkeyCombos>(HOTKEYS_SETTING_KEY)) ?? {};
}

// Replaces the stored map. The god screen sends the full set of overrides, so an
// unbound command is one left out rather than one written as empty.
export async function setHotkeySettings(combos: HotkeyCombos): Promise<HotkeyCombos> {
  await setSetting(HOTKEYS_SETTING_KEY, combos);
  return combos;
}
