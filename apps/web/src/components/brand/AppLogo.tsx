'use client';

import { useBranding } from '@/context/brandingContext';
import { cn } from '@/lib/utils';
import { safeHttpsUrl } from '@/utils/branding';

// The product mark: two shapes in tandem — a filled circle (the human/team) and an
// outlined square (the agent), joined by a short link. Roles read from the shapes
// themselves, so the mark works in a single color via currentColor and stays legible
// at small sizes. Decorative — the caller sets size and color via className.
//
// An instance that set a logo gets it in a plain <img>. Never inlined: an SVG from a
// host the operator names runs the <script> inside it when it is part of the
// document, while the same file behind an <img> cannot. Never next/image either:
// images.remotePatterns is frozen into the standalone build, so a host listed there
// would only hold for the instance that built the image.
export default function AppLogo({ className }: { className?: string }) {
  const src = safeHttpsUrl(useBranding().logoUrl);

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- the host is per instance, and remotePatterns is frozen into the build.
    return <img src={src} alt="" className={cn('object-contain', className)} />;
  }

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="13" y="14.3" width="6" height="3.4" rx="1.7" fill="currentColor" opacity="0.4" />
      <circle cx="9.5" cy="16" r="6" fill="currentColor" />
      <rect
        x="17"
        y="10.5"
        width="11"
        height="11"
        rx="3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}
