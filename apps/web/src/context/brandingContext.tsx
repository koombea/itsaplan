'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { BrandingSettings } from '@/lib/api/endpoints/settings';
import { DEFAULT_BRANDING } from '@/utils/branding';

const BrandingCtx = createContext<BrandingSettings>(DEFAULT_BRANDING);

// The root layout reads the branding on the server and hands it down through here.
// Fetching it from the client instead would render the built-in name first and swap
// it after hydration, which is the one thing a rebranded instance must not do.
export function BrandingProvider({
  branding,
  children,
}: {
  branding: BrandingSettings;
  children: ReactNode;
}) {
  return <BrandingCtx.Provider value={branding}>{children}</BrandingCtx.Provider>;
}

export function useBranding(): BrandingSettings {
  return useContext(BrandingCtx);
}
