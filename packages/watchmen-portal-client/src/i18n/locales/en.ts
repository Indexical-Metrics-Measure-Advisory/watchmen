const en = {
	portal: {
		title: "Data Platform",
		subtitle:
			"Unified data governance and management platform, empowering data teams with end-to-end collaboration from ingestion to development to analysis",
		availableModules: "available modules",
		comingSoon: "coming soon",
		copyright: "Data Platform",
		copyrightYear: "",
	},
	module: {
		enter: "Enter",
		available: "Available",
		comingSoon: "Coming Soon",
		stayTuned: "Stay tuned",
		lastAccessed: "Last accessed {{time}}",
		noModules: "No modules available for your role",
		noModulesHint: "Contact your administrator to request access",
	},
	health: {
		available: "Available",
		degraded: "Degraded",
		unavailable: "Unavailable",
		checking: "Checking...",
		unknown: "Unknown",
	},
	login: {
		title: "Sign in",
		dollHint: "Sign in with your watchmen account",
		ssoHint: "Sign in with your organization's identity provider",
		username: "Username",
		password: "Password",
		submitting: "Signing in…",
		submit: "Sign in",
		continueWith: "Continue with {{method}}",
		errorDefault: "Incorrect username or password",
		signOut: "Sign out",
	},
	common: {
		dataPlatform: "Data Platform",
		selectLanguage: "Select language",
	},
	lastAccessed: {
		justNow: "just now",
		minutesAgo: "{{count}}m ago",
		hoursAgo: "{{count}}h ago",
		daysAgo: "{{count}}d ago",
	},
	modules: {
		admin: {
			title: "Data Development",
			subtitle: "Web Client",
			description: "For data developers - build and manage data pipelines, data models, and data assets",
		},
		ingest: {
			title: "Data Ingestion",
			subtitle: "Ingest Client",
			description: "Configure data sources, manage ingestion tasks and data access workflows",
		},
		analysis: {
			title: "Data Analysis",
			subtitle: "Analysis Client",
			description: "Explore data, build metric frameworks, and create visual analytics",
		},
		ops: {
			title: "Data Operations",
			subtitle: "Monitor Client",
			description: "Monitor platform health, manage alerts, and automate operations",
		},
	},
};

export default en;
export type TranslationKeys = typeof en;
