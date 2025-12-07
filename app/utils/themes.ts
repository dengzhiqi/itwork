export interface Theme {
    name: string;
    displayName: string;
    colors: {
        bgApp: string;
        bgPanel: string;
        bgCard: string;
        textPrimary: string;
        textSecondary: string;
        textAccent: string;
        borderLight: string;
        primaryGradient: string;
        dangerColor: string;
        successColor: string;
        backgroundGradient1: string;
        backgroundGradient2: string;
    };
}

export const themes: Record<string, Theme> = {
    'ocean-blue': {
        name: 'ocean-blue',
        displayName: 'Ocean Blue',
        colors: {
            bgApp: '#0f172a',
            bgPanel: 'rgba(30, 41, 59, 0.7)',
            bgCard: 'rgba(51, 65, 85, 0.5)',
            textPrimary: '#f1f5f9',
            textSecondary: '#94a3b8',
            textAccent: '#38bdf8',
            borderLight: 'rgba(148, 163, 184, 0.1)',
            primaryGradient: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
            dangerColor: '#ef4444',
            successColor: '#22c55e',
            backgroundGradient1: 'rgba(56, 189, 248, 0.15)',
            backgroundGradient2: 'rgba(129, 140, 248, 0.15)',
        },
    },
    'warm-sunset': {
        name: 'warm-sunset',
        displayName: 'Warm Sunset',
        colors: {
            bgApp: '#faf8f3',
            bgPanel: 'rgba(250, 245, 235, 0.9)',
            bgCard: 'rgba(255, 250, 240, 0.8)',
            textPrimary: '#3e3832',
            textSecondary: '#8b7355',
            textAccent: '#d97706',
            borderLight: 'rgba(139, 115, 85, 0.15)',
            primaryGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            dangerColor: '#dc2626',
            successColor: '#16a34a',
            backgroundGradient1: 'rgba(251, 191, 36, 0.08)',
            backgroundGradient2: 'rgba(245, 158, 11, 0.08)',
        },
    },
    'forest-green': {
        name: 'forest-green',
        displayName: 'Forest Green',
        colors: {
            bgApp: '#0f172a',
            bgPanel: 'rgba(20, 40, 35, 0.7)',
            bgCard: 'rgba(30, 60, 50, 0.5)',
            textPrimary: '#f1f5f9',
            textSecondary: '#94a3b8',
            textAccent: '#10b981',
            borderLight: 'rgba(148, 163, 184, 0.1)',
            primaryGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            dangerColor: '#ef4444',
            successColor: '#22c55e',
            backgroundGradient1: 'rgba(16, 185, 129, 0.15)',
            backgroundGradient2: 'rgba(5, 150, 105, 0.15)',
        },
    },
    'purple-dream': {
        name: 'purple-dream',
        displayName: 'Purple Dream',
        colors: {
            bgApp: '#1e1b4b',
            bgPanel: 'rgba(49, 46, 129, 0.7)',
            bgCard: 'rgba(67, 56, 202, 0.5)',
            textPrimary: '#f5f3ff',
            textSecondary: '#c4b5fd',
            textAccent: '#a855f7',
            borderLight: 'rgba(196, 181, 253, 0.1)',
            primaryGradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
            dangerColor: '#ef4444',
            successColor: '#22c55e',
            backgroundGradient1: 'rgba(168, 85, 247, 0.15)',
            backgroundGradient2: 'rgba(147, 51, 234, 0.15)',
        },
    },
};

export const defaultTheme = 'ocean-blue';

export interface CustomThemeColors {
    primaryColor1: string;
    primaryColor2: string;
    headingColor: string;
    textColor: string;
}

export const defaultCustomColors: CustomThemeColors = {
    primaryColor1: '#38bdf8',
    primaryColor2: '#818cf8',
    headingColor: '#ffffff',
    textColor: '#f1f5f9',
};

export function loadCustomColors(): CustomThemeColors {
    if (typeof window === 'undefined') return defaultCustomColors;

    const saved = localStorage.getItem('customThemeColors');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return defaultCustomColors;
        }
    }
    return defaultCustomColors;
}

export function saveCustomColors(colors: CustomThemeColors) {
    if (typeof window !== 'undefined') {
        localStorage.setItem('customThemeColors', JSON.stringify(colors));
    }
}

export function generateCustomTheme(colors: CustomThemeColors): Theme {
    return {
        name: 'custom',
        displayName: '自定义主题',
        colors: {
            bgApp: '#0f172a',
            bgPanel: 'rgba(30, 41, 59, 0.7)',
            bgCard: 'rgba(51, 65, 85, 0.5)',
            textPrimary: colors.textColor,
            textSecondary: '#94a3b8',
            textAccent: colors.primaryColor1,
            borderLight: 'rgba(148, 163, 184, 0.1)',
            primaryGradient: `linear-gradient(135deg, ${colors.primaryColor1} 0%, ${colors.primaryColor2} 100%)`,
            dangerColor: '#ef4444',
            successColor: '#22c55e',
            backgroundGradient1: `${colors.primaryColor1}26`,
            backgroundGradient2: `${colors.primaryColor2}26`,
        },
    };
}

export function getTheme(themeName: string, customColors?: CustomThemeColors): Theme {
    if (themeName === 'custom') {
        const colors = customColors || loadCustomColors();
        return generateCustomTheme(colors);
    }
    return themes[themeName] || themes[defaultTheme];
}
