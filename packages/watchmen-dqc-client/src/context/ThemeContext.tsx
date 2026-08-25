import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'watchmen_dqc_client_theme';

interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
	if (typeof window === 'undefined') return 'dark';
	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	if (stored === 'light' || stored === 'dark') return stored;
	// respect OS preference on first visit
	if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
	return 'dark';
}

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	if (theme === 'dark') {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [theme, setThemeState] = useState<Theme>(getInitialTheme);

	useEffect(() => {
		applyTheme(theme);
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	}, [theme]);

	const setTheme = (next: Theme) => setThemeState(next);
	const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

	return (
		<ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
	return ctx;
}
