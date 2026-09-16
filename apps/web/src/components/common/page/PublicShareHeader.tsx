'use client';

import AppLogo from '@/components/brand/AppLogo';
import { useBranding } from '@/context/brandingContext';
import { APP_SITE_URL } from '@/utils/app';
import { safeHttpsUrl } from '@/utils/branding';

// The header over a public shared page (a board or an issue). It shows the project
// name, the ticker, and an optional trailing label. On a board that label is the
// shared view's name. The product mark links to the product site. The header shows
// identity only, with no app navigation and no session.
export default function PublicShareHeader({
  name,
  ticker,
  trailing,
}: {
  name: string;
  ticker: string;
  trailing?: string;
}) {
  const { appName, siteUrl } = useBranding();
  // This page carries no session, so the value reaches a visitor with no account
  // behind them. The api refuses anything but an https URL, and an app_setting row
  // written by hand never passed it.
  const href = safeHttpsUrl(siteUrl) ?? APP_SITE_URL;

  return (
    <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-base font-semibold">{name}</span>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
          {ticker}
        </span>
        {trailing && (
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            <span className="pe-2">/</span>
            {trailing}
          </span>
        )}
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="ms-auto flex shrink-0 items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <AppLogo className="size-5" />
        <span className="text-sm font-semibold">{appName}</span>
      </a>
    </header>
  );
}
