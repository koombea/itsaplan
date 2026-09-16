'use client';

import { useTranslations } from 'next-intl';
import AppLogo from '@/components/brand/AppLogo';
import { useBranding } from '@/context/brandingContext';

// Branded panel shown beside the form on wide screens, in place of an external
// image — self-contained, no asset. Shared by the auth screens and the invite
// accept screen; the subtitle differs per context.
export default function BrandPanel({ subtitle }: { subtitle?: string }) {
  const t = useTranslations('common');
  const { appName, loginTagline } = useBranding();
  return (
    <div className="relative hidden flex-col items-center justify-center gap-3 bg-primary text-primary-foreground md:flex">
      <AppLogo className="size-12" />
      <span className="text-lg font-semibold">{appName}</span>
      <p className="max-w-[16rem] text-center text-sm text-primary-foreground/70">
        {subtitle ?? (loginTagline || t('brandSubtitle'))}
      </p>
    </div>
  );
}
