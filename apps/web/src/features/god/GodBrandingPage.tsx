'use client';

import GodSettingsGate from './components/GodSettingsGate';
import GodBrandingForm from './components/branding/GodBrandingForm';
import { useInstanceBrandingSettingsQuery } from './services/god.service';

export default function GodBrandingPage() {
  const query = useInstanceBrandingSettingsQuery();

  return (
    <GodSettingsGate slug="branding" data={query.data}>
      {(settings) => <GodBrandingForm settings={settings} />}
    </GodSettingsGate>
  );
}
