import { t } from 'elysia';
import { LOCALES } from '#modules/user-preferences/locale';

export const StorageSettingsSchema = t.Object({
  maxAttachmentMb: t.Number(),
  maxAvatarMb: t.Number(),
  attachmentMimeTypes: t.Array(t.String()),
  projectQuotaMb: t.Number(),
});

export const ProjectDefaultsSchema = t.Object({
  mcpEnabled: t.Boolean(),
});

// The instance branding. The two URL fields and the accent color are pasted by the
// operator and end up in an `src` attribute and in a CSS declaration, so the shape
// is pinned here rather than trusted: https only, and a color literal that cannot
// close the declaration it is written into. The web app checks the same shapes
// again before it interpolates them, because a value can also arrive from a row
// written by hand.
const HTTPS_URL_PATTERN = '^$|^https://[^\\s"\'<>]+$';

// The name and the site have no "unset" state: every screen prints the name, and the
// public share header links the site from a page with no session behind it. An empty
// one is not a fall back to the built-in, it is a blank identity and a dead link, so
// this schema refuses it rather than letting a god-mode client store it.
const REQUIRED_HTTPS_URL_PATTERN = '^https://[^\\s"\'<>]+$';

// `#rrggbb`, or an oklch() of plain numbers. No alpha: the accent replaces --primary
// and the web app picks the text that sits on it from the lightness alone, which only
// holds while the color is opaque. A translucent accent shows the page through it,
// so the same lightness can end up carrying white text on a white background.
const COLOR_LITERAL_PATTERN = '^$|^#[0-9a-fA-F]{6}$|^oklch\\( *[0-9.]+%? +[0-9.]+%? +[0-9.]+ *\\)$';

export const BrandingSettingsSchema = t.Object({
  appName: t.String({ minLength: 1, maxLength: 60 }),
  siteUrl: t.String({ pattern: REQUIRED_HTTPS_URL_PATTERN, maxLength: 2048 }),
  logoUrl: t.String({ pattern: HTTPS_URL_PATTERN, maxLength: 2048 }),
  accentColor: t.String({ pattern: COLOR_LITERAL_PATTERN, maxLength: 64 }),
  loginTagline: t.String({ maxLength: 200 }),
  defaultLocale: t.UnionEnum([...LOCALES]),
  faviconUrl: t.String({ pattern: HTTPS_URL_PATTERN, maxLength: 2048 }),
  releaseHistoryEnabled: t.Boolean(),
});

export const BrandingSettingsBody = t.Partial(BrandingSettingsSchema);

// A command id bound to a combination written as modifier tokens plus a key
// ('mod+k', 'n'). The set of commands lives in the web app (its lib/hotkeys), so
// the API checks the shape and stores the map as given.
export const HotkeyCombosSchema = t.Record(
  t.String({ pattern: '^[a-z][a-z0-9.-]{0,63}$' }),
  t.String({ pattern: '^(mod\\+|shift\\+|alt\\+)*[a-z0-9]{1,10}$' }),
);

const ReleaseSchema = t.Object({
  tag: t.String(),
  version: t.String(),
  publishedAt: t.String(),
  url: t.Nullable(t.String()),
  notes: t.String(),
  notesFormat: t.UnionEnum(['html', 'markdown']),
});

export const UpdateStatusSchema = t.Object({
  currentVersion: t.String(),
  latestVersion: t.Nullable(t.String()),
  updateAvailable: t.Boolean(),
  checkedAt: t.Nullable(t.String()),
  releases: t.Array(ReleaseSchema),
});

export const VersionResponse = t.Object({ version: t.String() });

const RenameSchema = t.Object({ from: t.String(), to: t.String() });

// What migration 0115 did to this instance's data, as the migration recorded it.
const TeamsMigrationSchema = t.Object({
  version: t.Number(),
  teams: t.Array(
    t.Object({
      name: t.String(),
      projects: t.Array(t.Object({ key: t.String(), name: t.String() })),
    }),
  ),
  renamed: t.Record(t.String(), t.Array(RenameSchema)),
  merged: t.Object({ roles: t.Number(), agentTools: t.Number() }),
  movedInvites: t.Number(),
  droppedNotificationSettings: t.Array(t.String()),
});

const BackupSchema = t.Object({
  path: t.String(),
  sizeBytes: t.Number(),
  createdAt: t.String(),
  expiresAt: t.String(),
  migrations: t.Array(t.String()),
});

export const WhatsNewSchema = t.Object({
  version: t.String(),
  pending: t.Boolean(),
  releases: t.Array(ReleaseSchema),
  backup: t.Nullable(BackupSchema),
  migration: t.Nullable(TeamsMigrationSchema),
});
