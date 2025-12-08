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
        displayName: 'Amber Night',
        colors: {
            bgApp: '#1a1512',
            bgPanel: 'rgba(42, 36, 30, 0.85)',
            bgCard: 'rgba(58, 48, 38, 0.6)',
            textPrimary: '#f5ebe0',
            textSecondary: '#b8a898',
            textAccent: '#f0a050',
            borderLight: 'rgba(180, 160, 140, 0.12)',
            primaryGradient: 'linear-gradient(135deg, #f0a050 0%, #e07830 100%)',
            dangerColor: '#ef5350',
            successColor: '#66bb6a',
            backgroundGradient1: 'rgba(240, 160, 80, 0.12)',
            backgroundGradient2: 'rgba(224, 120, 48, 0.12)',
        },
    },
    'forest-green': {
        name: 'forest-green',
        displayName: 'Emerald Forest',
        colors: {
            bgApp: '#0d1a14',
            bgPanel: 'rgba(20, 45, 35, 0.85)',
            bgCard: 'rgba(30, 60, 45, 0.6)',
            textPrimary: '#e0f0e8',
            textSecondary: '#88b0a0',
            textAccent: '#4ecca3',
            borderLight: 'rgba(100, 160, 140, 0.12)',
            primaryGradient: 'linear-gradient(135deg, #4ecca3 0%, #38b588 100%)',
            dangerColor: '#ef5350',
            successColor: '#66bb6a',
            backgroundGradient1: 'rgba(78, 204, 163, 0.12)',
            backgroundGradient2: 'rgba(56, 181, 136, 0.12)',
        },
    },
    'purple-dream': {
        name: 'purple-dream',
        displayName: 'Velvet Night',
        colors: {
            bgApp: '#12101a',
            bgPanel: 'rgba(30, 25, 45, 0.85)',
            bgCard: 'rgba(45, 38, 65, 0.6)',
            textPrimary: '#e8e0f0',
            textSecondary: '#a090b8',
            textAccent: '#a78bfa',
            borderLight: 'rgba(140, 120, 180, 0.12)',
            primaryGradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
            dangerColor: '#ef5350',
            successColor: '#66bb6a',
            backgroundGradient1: 'rgba(167, 139, 250, 0.12)',
            backgroundGradient2: 'rgba(139, 92, 246, 0.12)',
        },
    },
};

export const defaultTheme = 'ocean-blue';

export interface CustomThemeColors {
    primaryColor1: string;
    primaryColor2: string;
    headingColor: string;
    textColor: string;
    backgroundColor: string;
}

export const defaultCustomColors: CustomThemeColors = {
    primaryColor1: '#38bdf8',
    primaryColor2: '#818cf8',
    headingColor: '#ffffff',
    textColor: '#f1f5f9',
    backgroundColor: '#0f172a',
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
            bgApp: colors.backgroundColor,
            bgPanel: `${colors.backgroundColor}b3`,
            bgCard: `${colors.backgroundColor}80`,
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
