const en = {
  portal: {
    title: 'Watchmen Data Platform',
    subtitle: 'Unified data governance and management platform, empowering data teams with end-to-end collaboration from ingestion to development to analysis',
    availableModules: 'available modules',
    comingSoon: 'coming soon',
    copyright: 'Watchmen Data Platform v0.1.0',
    copyrightYear: '© {{year}} Watchmen Team',
  },
  module: {
    enter: 'Enter',
    available: 'Available',
    comingSoon: 'Coming Soon',
    stayTuned: 'Stay tuned',
    lastAccessed: 'Last accessed {{time}}',
    noModules: 'No modules available for your role',
    noModulesHint: 'Contact your administrator to request access',
  },
  health: {
    available: 'Available',
    degraded: 'Degraded',
    unavailable: 'Unavailable',
    checking: 'Checking...',
    unknown: 'Unknown',
  },
  login: {
    title: 'Sign in',
    dollHint: 'Sign in with your watchmen account',
    ssoHint: "Sign in with your organization's identity provider",
    username: 'Username',
    password: 'Password',
    submitting: 'Signing in…',
    submit: 'Sign in',
    continueWith: 'Continue with {{method}}',
    errorDefault: 'Incorrect username or password',
    signOut: 'Sign out',
  },
  common: {
    dataPlatform: 'Data Platform',
  },
} as const;

export default en;
export type TranslationKeys = typeof en;
