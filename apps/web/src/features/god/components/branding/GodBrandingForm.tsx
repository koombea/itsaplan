'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { BrandingSettings } from '@/lib/api/endpoints/settings';
import SettingsCard from '@/components/common/page/SettingsCard';
import SettingsSection from '@/components/common/page/SettingsSection';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/locales';
import { safeAccentColor, safeHttpsUrl } from '@/utils/branding';
import GodSectionPage from '../GodSectionPage';
import { useUpdateInstanceBrandingSettings } from '../../services/god.service';
import GodBrandingField from './GodBrandingField';

// The instance branding editor. Every field is optional except the name and the
// site: an empty one is stored as empty and falls back to what the app ships with,
// which is why there is no "reset" action.
export default function GodBrandingForm({ settings }: { settings: BrandingSettings }) {
  const t = useTranslations('god.branding');
  const tCommon = useTranslations('common');
  const update = useUpdateInstanceBrandingSettings();
  const router = useRouter();
  const [form, setForm] = useState<BrandingSettings>(settings);

  const set = (patch: Partial<BrandingSettings>) => setForm((f) => ({ ...f, ...patch }));
  const dirty = (Object.keys(form) as (keyof BrandingSettings)[]).some(
    (k) => form[k] !== settings[k],
  );

  // The same shapes the api validates the body against, so a value it would refuse
  // is named under its own field instead of coming back as a 400.
  const errors: Partial<Record<keyof BrandingSettings, string>> = {
    appName: form.appName.trim() ? undefined : t('appNameRequired'),
    siteUrl: safeHttpsUrl(form.siteUrl) ? undefined : t('urlInvalid'),
    logoUrl: !form.logoUrl || safeHttpsUrl(form.logoUrl) ? undefined : t('urlInvalid'),
    faviconUrl: !form.faviconUrl || safeHttpsUrl(form.faviconUrl) ? undefined : t('urlInvalid'),
    accentColor:
      !form.accentColor || safeAccentColor(form.accentColor) ? undefined : t('accentInvalid'),
  };
  const valid = Object.values(errors).every((e) => e === undefined);

  async function save() {
    try {
      await update.mutateAsync({ ...form, appName: form.appName.trim() });
      // The name, the accent and the tab icon are server-rendered from the root
      // layout, so without this the operator only sees the old ones until a reload.
      router.refresh();
      toast.success(t('saved'));
    } catch {
      // The failure already surfaced through the global mutation error toast.
    }
  }

  return (
    <GodSectionPage
      slug="branding"
      actions={
        <Button
          size="sm"
          onClick={() => void save()}
          disabled={!dirty || !valid || update.isPending}
        >
          {update.isPending ? tCommon('saving') : tCommon('save')}
        </Button>
      }
    >
      <div className="space-y-8">
        <SettingsSection title={t('identity')} description={t('identityHint')}>
          <SettingsCard className="grid gap-6 p-4 sm:grid-cols-2">
            <GodBrandingField
              id="branding-app-name"
              label={t('appName')}
              hint={t('appNameHint')}
              error={errors.appName}
              value={form.appName}
              onChange={(appName) => set({ appName })}
            />
            <GodBrandingField
              id="branding-site-url"
              label={t('siteUrl')}
              hint={t('siteUrlHint')}
              error={errors.siteUrl}
              placeholder="https://itsaplan.dev/"
              value={form.siteUrl}
              onChange={(siteUrl) => set({ siteUrl })}
            />
            <div className="sm:col-span-2">
              <GodBrandingField
                id="branding-login-tagline"
                label={t('loginTagline')}
                hint={t('loginTaglineHint')}
                value={form.loginTagline}
                onChange={(loginTagline) => set({ loginTagline })}
              />
            </div>
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={t('appearance')} description={t('appearanceHint')}>
          <SettingsCard className="grid gap-6 p-4 sm:grid-cols-2">
            <GodBrandingField
              id="branding-logo-url"
              label={t('logoUrl')}
              hint={t('logoUrlHint')}
              error={errors.logoUrl}
              placeholder="https://example.com/logo.svg"
              value={form.logoUrl}
              onChange={(logoUrl) => set({ logoUrl })}
            />
            <GodBrandingField
              id="branding-favicon-url"
              label={t('faviconUrl')}
              hint={t('faviconUrlHint')}
              error={errors.faviconUrl}
              placeholder="https://example.com/icon.png"
              value={form.faviconUrl}
              onChange={(faviconUrl) => set({ faviconUrl })}
            />
            <div className="sm:col-span-2">
              <GodBrandingField
                id="branding-accent-color"
                label={t('accentColor')}
                hint={t('accentColorHint')}
                error={errors.accentColor}
                placeholder="#1d4ed8"
                value={form.accentColor}
                onChange={(accentColor) => set({ accentColor })}
              />
            </div>
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title={t('language')} description={t('languageHint')}>
          <SettingsCard className="space-y-2 p-4">
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="branding-default-locale">{t('defaultLocale')}</Label>
              <Select
                value={form.defaultLocale}
                onValueChange={(defaultLocale) => set({ defaultLocale: defaultLocale as Locale })}
              >
                <SelectTrigger id="branding-default-locale" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Each language is named in itself, so the list is not translated. */}
                  {LOCALES.map((locale) => (
                    <SelectItem key={locale} value={locale}>
                      {LOCALE_LABELS[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{t('defaultLocaleNote')}</p>
          </SettingsCard>
        </SettingsSection>
      </div>
    </GodSectionPage>
  );
}
