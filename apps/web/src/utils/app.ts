import { runtimeEnv } from './runtimeEnv';

// The built-in product identity. An instance overrides both in god mode, so a
// screen reads what it shows from useBranding() (context/brandingContext) and these
// are only what DEFAULT_BRANDING falls back to. Keep them equal to defaultBranding()
// in the api, which is what an instance with no stored row answers with.
export const APP_NAME = "It's a Plan";

export const APP_SITE_URL = 'https://itsaplan.dev/';

// The legal document URLs, linked from the logged-out screens: Google requires the
// privacy policy and terms registered for the OAuth client to be reachable before
// consent is given. Each instance points these at its own documents through its
// environment (see runtimeEnv); when unset, the legal notice is hidden.
export const PRIVACY_POLICY_URL = runtimeEnv().privacyUrl;
export const TERMS_URL = runtimeEnv().termsUrl;
