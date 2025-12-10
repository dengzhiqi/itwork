import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getTheme, defaultTheme, type Theme, type CustomThemeColors } from '../utils/themes';

interface ThemeContextType {
    currentTheme: string;
    theme: Theme;
    setTheme: (themeName: string) => void;
    updateCustomColors: (colors: CustomThemeColors) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [currentTheme, setCurrentTheme] = useState<string>(defaultTheme);
    const [theme, setThemeData] = useState<Theme>(getTheme(defaultTheme));

    // Load theme from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                setCurrentTheme(savedTheme);
                setThemeData(getTheme(savedTheme));
            }
        }
    }, []);

    // Apply theme to document
    useEffect(() => {
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            const colors = theme.colors;

            root.style.setProperty('--bg-app', colors.bgApp);
            root.style.setProperty('--bg-panel', colors.bgPanel);
            root.style.setProperty('--bg-card', colors.bgCard);
            root.style.setProperty('--bg-input', colors.bgInput);
            root.style.setProperty('--bg-secondary', colors.bgSecondary);
            root.style.setProperty('--text-primary', colors.textPrimary);
            root.style.setProperty('--text-secondary', colors.textSecondary);
            root.style.setProperty('--text-input', colors.textInput);
            root.style.setProperty('--text-accent', colors.textAccent);
            root.style.setProperty('--border-light', colors.borderLight);
            root.style.setProperty('--primary-gradient', colors.primaryGradient);
            root.style.setProperty('--danger-color', colors.dangerColor);
            root.style.setProperty('--success-color', colors.successColor);
            root.style.setProperty('--bg-gradient-1', colors.backgroundGradient1);
            root.style.setProperty('--bg-gradient-2', colors.backgroundGradient2);
        }
    }, [theme]);

    const setTheme = (themeName: string) => {
        setCurrentTheme(themeName);
        setThemeData(getTheme(themeName));
        if (typeof window !== 'undefined') {
            localStorage.setItem('theme', themeName);
        }
    };

    const updateCustomColors = (_colors: CustomThemeColors) => {
        // No-op for compatibility
    };

    return (
        <ThemeContext.Provider value={{ currentTheme, theme, setTheme, updateCustomColors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

